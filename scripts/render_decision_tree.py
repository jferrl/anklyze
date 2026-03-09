#!/usr/bin/env python3
"""Render the drawio classification decision tree as a compact, readable text tree.

Outputs a context-efficient format designed for Claude and human review.
Two output modes:
  1. TREE mode (default): indented decision tree showing all paths
  2. TABLE mode (--table): flat table of all 153+ terminal paths with expected results

Usage:
    python3 scripts/render_decision_tree.py [--table] [--drawio PATH] [-o OUTPUT]

Defaults:
    drawio: docs/Danis-Weber AO_OTA Flow-2026-02-28-ES.drawio
    output: stdout (or docs/decision_tree.txt / docs/decision_table.txt)
"""

import xml.etree.ElementTree as ET
import html
import re
import sys
import argparse


def parse_drawio(path):
    """Parse drawio XML and return cells dict, edges list, and root_id."""
    tree = ET.parse(path)
    root = tree.getroot()

    cells = {}
    edges = []

    for diagram in root.iter('diagram'):
        for model in diagram.iter('mxGraphModel'):
            for mxroot in model.iter('root'):
                for cell in mxroot.iter('mxCell'):
                    cid = cell.get('id')
                    style = cell.get('style', '')
                    value = cell.get('value', '')
                    source = cell.get('source')
                    target = cell.get('target')
                    edge = cell.get('edge')

                    if edge == '1' and source and target:
                        edges.append((source, target, value))
                    elif cid and cid not in ('0', '1'):
                        clean = html.unescape(value).strip()
                        text = re.sub(r'<[^>]+>', '\n', clean).strip()
                        # Collapse multiple newlines
                        text = re.sub(r'\n+', ' | ', text)

                        ntype = 'unknown'
                        if 'fillColor=#fff2cc' in style:
                            ntype = 'decision'
                        elif 'fillColor=#d5e8d4' in style:
                            ntype = 'option'
                        elif 'fillColor=#f8cecc' in style:
                            ntype = 'terminal'
                        elif 'fillColor=#dae8fc' in style:
                            ntype = 'label'

                        if ntype == 'option' and '?' in text:
                            ntype = 'decision'

                        cells[cid] = {'id': cid, 'type': ntype, 'text': text}

    # Build adjacency
    children = {}
    parents = {}
    for s, t, v in edges:
        children.setdefault(s, []).append(t)
        parents.setdefault(t, []).append(s)

    # Find root decision node
    root_id = None
    for cid, c in cells.items():
        if c['type'] == 'decision' and 'maleolos' in c['text'].lower():
            pts = [cells.get(p, {}).get('type') for p in parents.get(cid, [])]
            if all(t in ('label', 'unknown', None) for t in pts):
                root_id = cid
                break

    return cells, children, parents, root_id


def parse_terminal_codes(text):
    """Extract classification codes from terminal node text."""
    result = {'fracture_type': '', 'ao': '', 'lh': '', 'weber': '', 'bartonicek': ''}

    lines = [l.strip() for l in text.replace(' | ', '\n').split('\n') if l.strip()]
    if lines:
        result['fracture_type'] = lines[0]

    full = '\n'.join(lines)

    # AO
    ao_sub = re.search(r'AO\s+tipo\s+\d+\s+[A-C]\d\s+subtipo\s+(?:\d+\s+)?([A-C]\d\.\d)', full, re.I)
    if ao_sub:
        result['ao'] = f"44-{ao_sub.group(1)}"
    else:
        ao_noc = re.search(r'AO\s+tipo\s+\d+\s+([A-C]\d)\s+subtipo\s+no\s+clasificable', full, re.I)
        if ao_noc:
            result['ao'] = f"44-{ao_noc.group(1)}"
        else:
            ao_tipo = re.search(r'AO\s+tipo\s+\d+\s+([A-C]\d)\b', full, re.I)
            if ao_tipo:
                result['ao'] = f"44-{ao_tipo.group(1)}"
            else:
                ao_43 = re.search(r'AO\s+(43\s+[A-C]\d)', full, re.I)
                if ao_43:
                    result['ao'] = ao_43.group(1).replace(' ', '-')
                elif re.search(r'AO\s+no\s+clasificable', full, re.I):
                    result['ao'] = 'N/C'

    # Lauge-Hansen
    lh = re.search(r'Lauge[- ]Hansen\s+(SA|SER|PA|PER)\b', full, re.I)
    if lh:
        result['lh'] = lh.group(1).upper()
    elif re.search(r'Lauge[- ]Hansen\s+no\s+clasificable', full, re.I):
        result['lh'] = 'N/C'

    # Weber
    w = re.search(r'Weber\s+([ABC])\b', full, re.I)
    if w:
        result['weber'] = w.group(1).upper()

    # Bartonicek
    b = re.search(r'Barton[ií]cek\s+(\d)', full, re.I)
    if b:
        result['bartonicek'] = b.group(1)

    return result


def render_tree(cells, children, root_id, out):
    """Render the decision tree in compact indented format.

    Terminal nodes are allowed to appear multiple times (shared terminals in drawio
    where different paths lead to the same classification result). Non-terminal nodes
    are still deduplicated to prevent infinite loops.
    """
    terminal_count = [0]

    def _render(node_id, indent, ancestors):
        node = cells.get(node_id)
        if not node:
            return

        # Only prevent cycles (same node appearing in current path from root),
        # NOT prevent visiting a node that was visited in a different branch.
        if node_id in ancestors:
            return

        prefix = '│   ' * indent
        t = node['type']
        text = node['text']

        if t == 'decision':
            out.write(f'{prefix}Q: {text}\n')
        elif t == 'option':
            out.write(f'{prefix}├── {text}\n')
        elif t == 'terminal':
            codes = parse_terminal_codes(text)
            parts = []
            if codes['ao']:
                parts.append(f"AO:{codes['ao']}")
            if codes['lh']:
                parts.append(f"LH:{codes['lh']}")
            if codes['weber']:
                parts.append(f"W:{codes['weber']}")
            if codes['bartonicek']:
                parts.append(f"Bart:{codes['bartonicek']}")
            code_str = ' '.join(parts) if parts else 'no codes'
            # Short fracture type
            ft = codes['fracture_type']
            ft_short = ft.replace('Fractura ', '').replace('maleolo ', '').replace('maleolos ', '')
            out.write(f'{prefix}╰── [{code_str}] {ft_short}\n')
            terminal_count[0] += 1
        else:
            pass  # skip labels and unknown

        next_ancestors = ancestors | {node_id}
        for child_id in children.get(node_id, []):
            _render(child_id, indent + (1 if t in ('option', 'decision') else 0), next_ancestors)

    out.write("# Ankle Fracture Classification Decision Tree\n")
    out.write(f"# Source: drawio diagram (source of truth)\n")
    out.write(f"# Legend: Q=Question, ├──=Answer option, ╰──=Terminal [AO LH Weber Bartonicek]\n")
    out.write(f"# N/C = no clasificable\n")
    out.write("#\n\n")

    _render(root_id, 0, set())

    out.write(f"\n# Total terminals: {terminal_count[0]}\n")


def render_table(cells, children, parents, root_id, out):
    """Render all paths as a flat table."""

    # Trace all terminal paths
    terminals = [c for c in cells.values() if c['type'] == 'terminal']
    paths = []

    def trace_to_root(tid):
        path = []
        visited = set()
        current = tid
        while current and current != root_id:
            if current in visited:
                break
            visited.add(current)
            pids = parents.get(current, [])
            if not pids:
                break
            pid = pids[0]
            pnode = cells.get(pid)
            if not pnode:
                break
            if pnode['type'] == 'option':
                gpids = parents.get(pid, [])
                for gp in gpids:
                    gn = cells.get(gp)
                    if gn and gn['type'] == 'decision':
                        path.append((gn['text'], pnode['text']))
                        current = gp
                        break
                else:
                    current = pid
            elif pnode['type'] == 'decision':
                cn = cells.get(current)
                if cn and cn['type'] == 'option':
                    path.append((pnode['text'], cn['text']))
                current = pid
            else:
                current = pid
        path.reverse()
        return path

    for term in terminals:
        p = trace_to_root(term['id'])
        codes = parse_terminal_codes(term['text'])
        # Determine branch from first answer
        if p:
            first = p[0][1].lower()
            if 'lateral' in first and 'medial' in first and 'posterior' in first:
                branch = 'trimaleolar'
            elif 'lateral' in first and 'posterior' in first:
                branch = 'lat+post'
            elif 'lateral' in first and 'medial' in first:
                branch = 'lat+med'
            elif 'medial' in first and 'posterior' in first:
                branch = 'med+post'
            elif 'posterior' in first:
                branch = 'post'
            elif 'medial' in first:
                branch = 'medial'
            elif 'lateral' in first:
                branch = 'lateral'
            else:
                branch = '?'
        else:
            branch = '?'

        answers = [a for _, a in p]
        paths.append({
            'branch': branch,
            'answers': answers,
            'codes': codes,
            'tid': term['id'],
        })

    # Sort by branch then path
    branch_order = ['post', 'medial', 'lateral', 'med+post', 'lat+post', 'lat+med', 'trimaleolar']
    paths.sort(key=lambda x: (
        branch_order.index(x['branch']) if x['branch'] in branch_order else 99,
        x['answers']
    ))

    out.write("# Ankle Fracture Classification — All Terminal Paths\n")
    out.write(f"# Total: {len(paths)} paths across {len(set(p['branch'] for p in paths))} branches\n")
    out.write(f"# Source: drawio diagram (source of truth)\n")
    out.write("#\n")
    out.write(f"# {'Branch':<12} {'AO':<12} {'LH':<5} {'W':<3} {'B':<3} Path (answers in order)\n")
    out.write(f"# {'-'*12} {'-'*12} {'-'*5} {'-'*3} {'-'*3} {'-'*50}\n")

    current_branch = None
    for p in paths:
        if p['branch'] != current_branch:
            current_branch = p['branch']
            out.write(f"\n## {current_branch} ({sum(1 for x in paths if x['branch'] == current_branch)} paths)\n")

        c = p['codes']
        ao = c['ao'] or '-'
        lh = c['lh'] or '-'
        w = c['weber'] or '-'
        b = c['bartonicek'] or '-'
        # Skip first answer (malleoli selection — redundant with branch)
        answer_path = ' → '.join(p['answers'][1:]) if len(p['answers']) > 1 else '(direct)'
        out.write(f"  {ao:<12} {lh:<5} {w:<3} {b:<3} {answer_path}\n")


def main():
    parser = argparse.ArgumentParser(description='Render drawio decision tree')
    parser.add_argument('--table', action='store_true', help='Output flat path table instead of tree')
    parser.add_argument('--drawio', default='docs/Danis-Weber AO_OTA Flow-2026-02-28-ES.drawio')
    parser.add_argument('-o', '--output', default=None, help='Output file (default: stdout)')
    parser.add_argument('--both', action='store_true', help='Output both tree and table to docs/')
    args = parser.parse_args()

    cells, children, parents, root_id = parse_drawio(args.drawio)

    term_count = sum(1 for c in cells.values() if c['type'] == 'terminal')
    dec_count = sum(1 for c in cells.values() if c['type'] == 'decision')
    print(f"Parsed: {len(cells)} nodes ({dec_count} decisions, {term_count} terminals)", file=sys.stderr)

    if args.both:
        with open('docs/decision_tree.txt', 'w') as f:
            render_tree(cells, children, root_id, f)
        print("Wrote docs/decision_tree.txt", file=sys.stderr)

        with open('docs/decision_table.txt', 'w') as f:
            render_table(cells, children, parents, root_id, f)
        print("Wrote docs/decision_table.txt", file=sys.stderr)
        return

    out = open(args.output, 'w') if args.output else sys.stdout
    try:
        if args.table:
            render_table(cells, children, parents, root_id, out)
        else:
            render_tree(cells, children, root_id, out)
    finally:
        if args.output:
            out.close()


if __name__ == '__main__':
    main()
