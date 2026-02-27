#!/usr/bin/env python3
"""
Convert a Mermaid flowchart (.mmd) file to draw.io (.drawio) XML format.

Usage:
    python3 scripts/mmd_to_drawio.py input.mmd output.drawio
"""

import re
import sys
import html
from collections import defaultdict, deque
from xml.sax.saxutils import escape as xml_escape


# ---------------------------------------------------------------------------
# HTML / label helpers
# ---------------------------------------------------------------------------

def strip_html_keep_newlines(text: str) -> str:
    """Strip HTML tags but convert <br> variants to newlines."""
    # Normalise <br>, <br/>, <br />, <br style="..."> etc. to newline
    text = re.sub(r'<br\s*/?\s*>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<br\s+[^>]*/?>', '\n', text, flags=re.IGNORECASE)
    # Remove all remaining HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Collapse multiple consecutive newlines
    text = re.sub(r'\n{2,}', '\n', text)
    # Unescape HTML entities that may remain
    text = html.unescape(text)
    return text.strip()


def label_line_count(label: str) -> int:
    """Return the number of visual lines in a label."""
    return max(1, len(label.split('\n')))


# ---------------------------------------------------------------------------
# Mermaid parser
# ---------------------------------------------------------------------------

class MermaidParser:
    def __init__(self):
        # node_id -> label (plain text, newlines for line breaks)
        self.nodes: dict[str, str] = {}
        # node_id -> shape override: "diam", "rect", "cyl", "stadium"
        self.shapes: dict[str, str] = {}
        # list of (source_id, target_id)
        self.edges: list[tuple[str, str]] = []
        # Track inline shape hints from bracket syntax
        self.inline_shapes: dict[str, str] = {}

    # -- public API --

    def parse(self, text: str):
        """Parse an entire .mmd file."""
        # Strip YAML frontmatter
        text = re.sub(r'^---.*?---', '', text, count=1, flags=re.DOTALL)
        # Strip the flowchart directive line
        text = re.sub(r'^\s*flowchart\s+\w+\s*$', '', text, flags=re.MULTILINE)

        for raw_line in text.splitlines():
            line = raw_line.strip()
            if not line:
                continue

            # Shape-only overrides at the end of the file:
            #   n379@{ shape: diam}
            m = re.match(r'^(\w+)@\{\s*shape:\s*(\w+)\s*\}$', line)
            if m:
                self.shapes[m.group(1)] = m.group(2)
                continue

            # Otherwise it is an edge/node definition line – parse it
            self._parse_edge_line(line)

        # Reconcile inline shapes with explicit overrides (overrides win)
        for nid, sh in self.inline_shapes.items():
            if nid not in self.shapes:
                self.shapes[nid] = sh

    # -- internal helpers --

    def _register_node(self, node_id: str, label: str | None, shape_hint: str | None):
        """Register a node, only updating label/shape when new info arrives."""
        if label is not None and node_id not in self.nodes:
            self.nodes[node_id] = strip_html_keep_newlines(label)
        elif node_id not in self.nodes:
            self.nodes[node_id] = node_id  # fallback: use id as label
        if shape_hint and node_id not in self.inline_shapes:
            self.inline_shapes[node_id] = shape_hint

    _NODE_RE = re.compile(
        r'(\w+)'           # node id
        r'(?:'
        r'\(\["([^"]*?)"\]\)'   # (["label"]) -> stadium
        r'|\{"([^"]*?)"\}'      # {"label"}   -> diamond
        r'|\["([^"]*?)"\]'      # ["label"]   -> rectangle
        r'|@\{\s*label:\s*"((?:[^"\\]|\\.)*)"\s*\}'  # @{ label: "..." } -> from context
        r')?'
    )

    def _parse_node_token(self, token: str) -> tuple[str, str | None, str | None]:
        """
        Parse a single node token like:
            A(["Label"])  or  B{"Label"}  or  C["Label"]  or  n7@{ label: "..." }  or  just  n7
        Returns (node_id, label_or_None, shape_hint_or_None).
        """
        token = token.strip()
        if not token:
            return ('', None, None)

        # Pattern: id@{ label: "..." }
        m = re.match(r'^(\w+)@\{\s*label:\s*"((?:[^"\\]|\\.)*)"\s*\}$', token)
        if m:
            nid = m.group(1)
            raw_label = m.group(2).replace('\\"', '"')
            return (nid, raw_label, None)  # shape comes from overrides

        # Pattern: id(["label"])  (stadium)
        m = re.match(r'^(\w+)\(\["((?:[^"\\]|\\.)*)"\]\)$', token)
        if m:
            return (m.group(1), m.group(2).replace('\\"', '"'), 'stadium')

        # Pattern: id{"label"}  (diamond)
        m = re.match(r'^(\w+)\{"((?:[^"\\]|\\.)*)"\}$', token)
        if m:
            return (m.group(1), m.group(2).replace('\\"', '"'), 'diam')

        # Pattern: id["label"]  (rectangle)
        m = re.match(r'^(\w+)\["((?:[^"\\]|\\.)*)"\]$', token)
        if m:
            return (m.group(1), m.group(2).replace('\\"', '"'), 'rect')

        # Bare id
        m = re.match(r'^(\w+)$', token)
        if m:
            return (m.group(1), None, None)

        return ('', None, None)

    def _split_ampersand_tokens(self, text: str) -> list[str]:
        """
        Split a string on top-level '&' while respecting braces and brackets.
        E.g.  n7@{ label: "a & b" } & n8@{ label: "c" }
        should split into two tokens, not three.
        """
        tokens: list[str] = []
        depth = 0
        current: list[str] = []
        in_string = False
        escape_next = False

        for ch in text:
            if escape_next:
                current.append(ch)
                escape_next = False
                continue
            if ch == '\\':
                current.append(ch)
                escape_next = True
                continue
            if ch == '"':
                in_string = not in_string
                current.append(ch)
                continue
            if in_string:
                current.append(ch)
                continue

            if ch in ('{', '[', '('):
                depth += 1
                current.append(ch)
            elif ch in ('}', ']', ')'):
                depth -= 1
                current.append(ch)
            elif ch == '&' and depth == 0:
                tokens.append(''.join(current).strip())
                current = []
            else:
                current.append(ch)

        rest = ''.join(current).strip()
        if rest:
            tokens.append(rest)
        return tokens

    def _parse_edge_line(self, line: str):
        """Parse a line that may contain edges: A --> B & C & D."""
        # Split on ' --> '  but need to be careful with labels containing -->
        # Strategy: split on --> that is NOT inside quotes/braces
        parts = self._split_arrow(line)
        if len(parts) < 2:
            # No arrow – might be a standalone node definition (unlikely in this file)
            nid, label, shape = self._parse_node_token(line)
            if nid:
                self._register_node(nid, label, shape)
            return

        # Parse chain: parts[0] --> parts[1] --> parts[2] ...
        prev_ids: list[str] = []

        for i, part in enumerate(parts):
            # Each part may contain multiple targets joined by &
            tokens = self._split_ampersand_tokens(part)
            current_ids: list[str] = []

            for tok in tokens:
                nid, label, shape = self._parse_node_token(tok)
                if not nid:
                    continue
                self._register_node(nid, label, shape)
                current_ids.append(nid)

            # Create edges from prev to current
            if prev_ids and current_ids:
                for src in prev_ids:
                    for tgt in current_ids:
                        self.edges.append((src, tgt))

            prev_ids = current_ids

    def _split_arrow(self, line: str) -> list[str]:
        """Split a line on ' --> ' respecting quotes/braces."""
        parts: list[str] = []
        depth = 0
        in_string = False
        escape_next = False
        current: list[str] = []
        i = 0
        while i < len(line):
            ch = line[i]
            if escape_next:
                current.append(ch)
                escape_next = False
                i += 1
                continue
            if ch == '\\':
                current.append(ch)
                escape_next = True
                i += 1
                continue
            if ch == '"':
                in_string = not in_string
                current.append(ch)
                i += 1
                continue
            if in_string:
                current.append(ch)
                i += 1
                continue

            if ch in ('{', '[', '('):
                depth += 1
                current.append(ch)
                i += 1
            elif ch in ('}', ']', ')'):
                depth -= 1
                current.append(ch)
                i += 1
            elif depth == 0 and line[i:i+4] == ' -->':
                # Check for ' --> ' (with trailing space) or ' -->' at end
                parts.append(''.join(current).strip())
                current = []
                i += 4
                # Skip optional trailing space
                if i < len(line) and line[i] == ' ':
                    i += 1
            else:
                current.append(ch)
                i += 1

        rest = ''.join(current).strip()
        if rest:
            parts.append(rest)
        return parts

    # -- shape resolution --

    def get_shape(self, node_id: str) -> str:
        """Return the resolved shape for a node."""
        if node_id in self.shapes:
            return self.shapes[node_id]
        if node_id in self.inline_shapes:
            return self.inline_shapes[node_id]
        return 'rect'  # default


# ---------------------------------------------------------------------------
# Layout engine – Tree-based hierarchical (children grouped under parents)
# ---------------------------------------------------------------------------

def _node_dimensions(parser: MermaidParser, nid: str) -> tuple[float, float]:
    """Compute (width, height) for a single node based on label + shape."""
    NODE_WIDTH = 220
    BASE_HEIGHT = 60
    LINE_HEIGHT = 20

    label = parser.nodes.get(nid, nid)
    lines = label_line_count(label)
    h = BASE_HEIGHT + max(0, lines - 1) * LINE_HEIGHT
    shape = parser.get_shape(nid)
    if shape == 'diam':
        h = max(h, 80)

    w = NODE_WIDTH
    max_line_len = max((len(l) for l in label.split('\n')), default=0)
    if max_line_len > 28:
        w = max(w, min(max_line_len * 8, 400))
    if shape == 'diam':
        w = max(w, 240)

    return (w, h)


def compute_layout(parser: MermaidParser):
    """
    Assign (x, y) positions using a recursive subtree-width algorithm.
    Children are centred under their parent. DAG edges (multiple parents)
    are resolved by assigning each node to its first-discovered parent.
    Returns dict[node_id] -> (x, y, width, height).
    """
    H_GAP = 40       # horizontal gap between sibling subtrees
    V_SPACING = 100   # vertical gap between levels

    # Build adjacency from edges
    adj_children: dict[str, list[str]] = defaultdict(list)
    adj_parents: dict[str, list[str]] = defaultdict(list)
    for src, tgt in parser.edges:
        adj_children[src].append(tgt)
        adj_parents[tgt].append(src)

    # --- Turn the DAG into a spanning tree (BFS, first parent wins) ---
    all_ids = set(parser.nodes.keys())
    roots = [nid for nid in all_ids if not adj_parents.get(nid)]
    if not roots:
        roots = [next(iter(parser.nodes))]

    tree_children: dict[str, list[str]] = defaultdict(list)
    visited: set[str] = set()
    queue: deque[str] = deque()

    for r in roots:
        if r not in visited:
            visited.add(r)
            queue.append(r)

    while queue:
        nid = queue.popleft()
        for child in adj_children.get(nid, []):
            if child not in visited:
                visited.add(child)
                tree_children[nid].append(child)
                queue.append(child)

    # Any orphan nodes not reached
    for nid in all_ids:
        if nid not in visited:
            roots.append(nid)
            visited.add(nid)

    # --- Pre-compute dimensions for every node ---
    dims: dict[str, tuple[float, float]] = {}
    for nid in all_ids:
        dims[nid] = _node_dimensions(parser, nid)

    # --- Compute subtree widths bottom-up ---
    subtree_w: dict[str, float] = {}

    def calc_subtree_width(nid: str) -> float:
        if nid in subtree_w:
            return subtree_w[nid]
        kids = tree_children.get(nid, [])
        if not kids:
            subtree_w[nid] = dims[nid][0]
            return subtree_w[nid]
        total = sum(calc_subtree_width(c) for c in kids) + H_GAP * (len(kids) - 1)
        subtree_w[nid] = max(total, dims[nid][0])
        return subtree_w[nid]

    for r in roots:
        calc_subtree_width(r)
    for nid in all_ids:
        if nid not in subtree_w:
            subtree_w[nid] = dims[nid][0]

    # --- Assign levels (BFS for correct depth) ---
    level_of: dict[str, int] = {}
    queue2: deque[str] = deque()
    for r in roots:
        if r not in level_of:
            level_of[r] = 0
            queue2.append(r)
    while queue2:
        nid = queue2.popleft()
        for child in tree_children.get(nid, []):
            if child not in level_of:
                level_of[child] = level_of[nid] + 1
                queue2.append(child)
    for nid in all_ids:
        if nid not in level_of:
            level_of[nid] = 0

    # --- Compute max height per level (for uniform row height) ---
    max_level = max(level_of.values()) if level_of else 0
    row_height: dict[int, float] = defaultdict(lambda: 60.0)
    for nid, lv in level_of.items():
        row_height[lv] = max(row_height[lv], dims[nid][1])

    # Cumulative y offsets per level
    y_offset: dict[int, float] = {}
    cum_y = 50.0
    for lv in range(max_level + 1):
        y_offset[lv] = cum_y
        cum_y += row_height[lv] + V_SPACING

    # --- Recursive placement: centre parent over its children ---
    positions: dict[str, tuple[float, float, float, float]] = {}

    def place_subtree(nid: str, left_x: float):
        """Place nid's subtree starting at left_x. Returns the right edge."""
        w, h = dims[nid]
        kids = tree_children.get(nid, [])
        lv = level_of[nid]
        y = y_offset[lv]

        if not kids:
            # Leaf – place at left_x, centred within its subtree width
            sw = subtree_w[nid]
            cx = left_x + sw / 2 - w / 2
            positions[nid] = (cx, y, w, h)
            return left_x + sw

        # Place children left-to-right
        cursor = left_x
        for child in kids:
            cursor = place_subtree(child, cursor) + H_GAP
        cursor -= H_GAP  # remove trailing gap

        # Centre this node over its children span
        first_child = kids[0]
        last_child = kids[-1]
        fc_x, _, fc_w, _ = positions[first_child]
        lc_x, _, lc_w, _ = positions[last_child]
        children_center = (fc_x + fc_w / 2 + lc_x + lc_w / 2) / 2
        cx = children_center - w / 2
        positions[nid] = (cx, y, w, h)

        return cursor

    # Place each root subtree side by side
    global_cursor = 50.0
    for r in roots:
        global_cursor = place_subtree(r, global_cursor) + H_GAP * 3

    return positions


# ---------------------------------------------------------------------------
# Draw.io XML generation
# ---------------------------------------------------------------------------

STYLE_MAP = {
    'stadium': 'rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;',
    'diam':    'rhombus;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;',
    'rect':    'rounded=0;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;',
    'cyl':     'shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#f8cecc;strokeColor=#b85450;',
}


def generate_drawio(parser: MermaidParser, positions: dict) -> str:
    """Generate the full draw.io XML string."""
    lines: list[str] = []
    lines.append('<?xml version="1.0" encoding="UTF-8"?>')
    lines.append('<mxfile host="app.diagrams.net" modified="2026-02-27T00:00:00.000Z" agent="mmd_to_drawio.py" version="24.0.0">')
    lines.append('  <diagram name="Page-1" id="page1">')
    # Compute page size from actual node positions
    all_x = [pos[0] + pos[2] for pos in positions.values()]
    all_y = [pos[1] + pos[3] for pos in positions.values()]
    page_w = max(int(max(all_x) + 500) if all_x else 20000, 4000)
    page_h = max(int(max(all_y) + 500) if all_y else 20000, 4000)
    lines.append(f'    <mxGraphModel dx="1422" dy="762" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{page_w}" pageHeight="{page_h}" math="0" shadow="0">')
    lines.append('      <root>')
    lines.append('        <mxCell id="0" />')
    lines.append('        <mxCell id="1" parent="0" />')

    # Nodes
    for nid in parser.nodes:
        label = parser.nodes[nid]
        shape = parser.get_shape(nid)
        style = STYLE_MAP.get(shape, STYLE_MAP['rect'])
        x, y, w, h = positions.get(nid, (0, 0, 220, 60))

        # Escape the label for XML; convert newlines to <br> for draw.io html rendering
        escaped_label = xml_escape(label).replace('\n', '&lt;br&gt;')

        lines.append(
            f'        <mxCell id="{xml_escape(nid)}" '
            f'value="{escaped_label}" '
            f'style="{style}" '
            f'vertex="1" parent="1">'
        )
        lines.append(
            f'          <mxGeometry x="{x:.0f}" y="{y:.0f}" '
            f'width="{w:.0f}" height="{h:.0f}" as="geometry" />'
        )
        lines.append('        </mxCell>')

    # Edges
    for idx, (src, tgt) in enumerate(parser.edges):
        eid = f"e{idx}"
        lines.append(
            f'        <mxCell id="{eid}" value="" '
            f'style="rounded=1;orthogonalLoop=1;jettySize=auto;html=1;" '
            f'edge="1" source="{xml_escape(src)}" target="{xml_escape(tgt)}" parent="1">'
        )
        lines.append('          <mxGeometry relative="1" as="geometry" />')
        lines.append('        </mxCell>')

    lines.append('      </root>')
    lines.append('    </mxGraphModel>')
    lines.append('  </diagram>')
    lines.append('</mxfile>')
    return '\n'.join(lines)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <input.mmd> <output.drawio>", file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    with open(input_path, 'r', encoding='utf-8') as f:
        mmd_text = f.read()

    parser = MermaidParser()
    parser.parse(mmd_text)

    print(f"Parsed {len(parser.nodes)} nodes and {len(parser.edges)} edges.")

    positions = compute_layout(parser)
    xml = generate_drawio(parser, positions)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(xml)

    print(f"Written {output_path} ({len(xml)} bytes)")


if __name__ == '__main__':
    main()
