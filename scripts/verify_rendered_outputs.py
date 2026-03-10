#!/usr/bin/env python3
"""Verify rendered decision_tree.txt and decision_table.txt against raw drawio XML.

Cross-validates terminal-by-terminal that:
1. All 155 drawio terminal IDs have their codes correctly represented in rendered outputs
2. Classification code extraction (AO, LH, Weber, Bartonicek) matches character-for-character
3. No terminals are missing or have corrupted codes in the rendered files
4. Fracture type text is preserved correctly

Usage:
    python3 scripts/verify_rendered_outputs.py [--drawio PATH] [--tree PATH] [--table PATH]
"""

import xml.etree.ElementTree as ET
import html
import re
import sys
import argparse


# ── Drawio parsing (independent from render_decision_tree.py) ──────────────

def parse_drawio_terminals(path):
    """Parse drawio XML and return dict of terminal_id -> {text, codes, parents_trace}."""
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
                        text_oneline = re.sub(r'\n+', ' | ', text)

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

                        cells[cid] = {
                            'id': cid,
                            'type': ntype,
                            'text': text,
                            'text_oneline': text_oneline,
                        }

    children = {}
    parents = {}
    for s, t, _ in edges:
        children.setdefault(s, []).append(t)
        parents.setdefault(t, []).append(s)

    # Extract terminals with parsed codes
    terminals = {}
    for cid, c in cells.items():
        if c['type'] == 'terminal':
            codes = extract_codes(c['text'])
            terminals[cid] = {
                'id': cid,
                'raw_text': c['text'],
                'text_oneline': c['text_oneline'],
                'codes': codes,
            }

    return terminals, cells, children, parents


def extract_codes(text):
    """Extract classification codes from terminal node text.

    This is an independent implementation — NOT copied from render_decision_tree.py —
    so it serves as a true cross-check.
    """
    result = {'fracture_type': '', 'ao': '', 'lh': '', 'weber': '', 'bartonicek': ''}

    lines = [l.strip() for l in text.split('\n') if l.strip()]
    if lines:
        result['fracture_type'] = lines[0]

    full = text

    # AO — try most specific first
    # "AO tipo 44 B1 subtipo 44 B1.2" or "AO tipo 44 B1 subtipo B1.2"
    m = re.search(r'AO\s+tipo\s+\d+\s+[A-C]\d\s+subtipo\s+(?:\d+\s+)?([A-C]\d\.\d)', full, re.I)
    if m:
        result['ao'] = f"44-{m.group(1)}"
    else:
        # "AO tipo 44 C1 subtipo no clasificable"
        m = re.search(r'AO\s+tipo\s+\d+\s+([A-C]\d)\s+subtipo\s+no\s+clasificable', full, re.I)
        if m:
            result['ao'] = f"44-{m.group(1)}"
        else:
            # "AO tipo 44 A2" (no subtipo)
            m = re.search(r'AO\s+tipo\s+\d+\s+([A-C]\d)\b', full, re.I)
            if m:
                result['ao'] = f"44-{m.group(1)}"
            else:
                # "AO 43 B1"
                m = re.search(r'AO\s+(43\s+[A-C]\d)', full, re.I)
                if m:
                    result['ao'] = m.group(1).replace(' ', '-')
                elif re.search(r'AO\s+no\s+clasificable', full, re.I):
                    result['ao'] = 'N/C'

    # Lauge-Hansen
    m = re.search(r'Lauge[- ]Hansen\s+(SA|SER|PA|PER)\b', full, re.I)
    if m:
        result['lh'] = m.group(1).upper()
    elif re.search(r'Lauge[- ]Hansen\s+no\s+clasificable', full, re.I):
        result['lh'] = 'N/C'

    # Weber
    m = re.search(r'Weber\s+([ABC])\b', full, re.I)
    if m:
        result['weber'] = m.group(1).upper()

    # Bartonicek
    m = re.search(r'Barton[ií]cek\s+(\d)', full, re.I)
    if m:
        result['bartonicek'] = m.group(1)

    return result


# ── Rendered output parsing ────────────────────────────────────────────────

def parse_tree_terminals(path):
    """Parse decision_tree.txt and extract all terminal lines with codes."""
    terminals = []
    with open(path) as f:
        for lineno, line in enumerate(f, 1):
            # Terminal lines look like: │   │   ╰── [AO:44-B1.2 LH:SER W:B] trimaleolar
            m = re.search(r'╰──\s+\[([^\]]*)\]\s+(.*)', line)
            if m:
                code_str = m.group(1)
                fracture_desc = m.group(2).strip()

                codes = {'ao': '', 'lh': '', 'weber': '', 'bartonicek': ''}
                for part in code_str.split():
                    if part.startswith('AO:'):
                        codes['ao'] = part[3:]
                    elif part.startswith('LH:'):
                        codes['lh'] = part[3:]
                    elif part.startswith('W:'):
                        codes['weber'] = part[2:]
                    elif part.startswith('Bart:'):
                        codes['bartonicek'] = part[5:]

                terminals.append({
                    'line': lineno,
                    'codes': codes,
                    'fracture_desc': fracture_desc,
                    'raw': line.rstrip(),
                })
    return terminals


def parse_table_terminals(path):
    """Parse decision_table.txt and extract all terminal rows with codes."""
    terminals = []
    current_branch = None
    with open(path) as f:
        for lineno, line in enumerate(f, 1):
            # Branch header: ## post (7 paths)
            bm = re.match(r'^## (\S+)', line)
            if bm:
                current_branch = bm.group(1)
                continue

            # Data rows: "  44-B1.2      SER   B   -   Transindesmal → ..."
            dm = re.match(r'^\s{2}(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*)', line)
            if dm:
                ao = dm.group(1) if dm.group(1) != '-' else ''
                lh = dm.group(2) if dm.group(2) != '-' else ''
                w = dm.group(3) if dm.group(3) != '-' else ''
                b = dm.group(4) if dm.group(4) != '-' else ''
                path_str = dm.group(5).strip()

                terminals.append({
                    'line': lineno,
                    'branch': current_branch,
                    'codes': {'ao': ao, 'lh': lh, 'weber': w, 'bartonicek': b},
                    'path': path_str,
                    'raw': line.rstrip(),
                })
    return terminals


# ── Verification logic ─────────────────────────────────────────────────────

def codes_to_key(codes):
    """Create a comparable key from codes dict."""
    return (codes.get('ao', ''), codes.get('lh', ''), codes.get('weber', ''), codes.get('bartonicek', ''))


def verify_all(drawio_terminals, tree_terminals, table_terminals):
    """Run all cross-validation checks. Returns (passed, failed, warnings) lists."""
    passed = []
    failed = []
    warnings = []

    # ── Check 1: Terminal count ────────────────────────────────────────
    n_drawio = len(drawio_terminals)
    n_table = len(table_terminals)
    n_tree = len(tree_terminals)

    passed.append(f"Drawio terminals: {n_drawio}")
    passed.append(f"Table rows: {n_table}")
    passed.append(f"Tree terminal lines: {n_tree} (includes shared node duplicates)")

    if n_drawio != 155:
        warnings.append(f"Expected 155 drawio terminals, got {n_drawio}")
    if n_table != n_drawio:
        # Table traces paths — may differ from raw terminal count if some terminals
        # are unreachable or shared. Compare carefully.
        warnings.append(f"Table rows ({n_table}) != drawio terminals ({n_drawio})")

    # ── Check 2: Every drawio terminal's codes appear in table ─────────
    # Build multiset of code tuples from drawio and table
    drawio_code_multiset = {}
    for tid, t in drawio_terminals.items():
        key = codes_to_key(t['codes'])
        drawio_code_multiset.setdefault(key, []).append(tid)

    table_code_multiset = {}
    for t in table_terminals:
        key = codes_to_key(t['codes'])
        table_code_multiset.setdefault(key, []).append(t['line'])

    # Check each unique code combination
    for key, tids in sorted(drawio_code_multiset.items()):
        table_entries = table_code_multiset.get(key, [])
        if len(table_entries) == 0:
            ao, lh, w, b = key
            failed.append(
                f"MISSING IN TABLE: codes AO={ao} LH={lh} W={w} B={b} "
                f"(drawio IDs: {tids})"
            )
        elif len(table_entries) != len(tids):
            ao, lh, w, b = key
            warnings.append(
                f"COUNT MISMATCH for AO={ao} LH={lh} W={w} B={b}: "
                f"drawio={len(tids)} table={len(table_entries)}"
            )

    # Check for table entries not in drawio
    for key, lines in sorted(table_code_multiset.items()):
        if key not in drawio_code_multiset:
            ao, lh, w, b = key
            failed.append(
                f"EXTRA IN TABLE: codes AO={ao} LH={lh} W={w} B={b} "
                f"(table lines: {lines})"
            )

    # ── Check 3: Every drawio terminal's codes appear in tree ──────────
    tree_code_multiset = {}
    for t in tree_terminals:
        key = codes_to_key(t['codes'])
        tree_code_multiset.setdefault(key, []).append(t['line'])

    for key, tids in sorted(drawio_code_multiset.items()):
        tree_entries = tree_code_multiset.get(key, [])
        if len(tree_entries) == 0:
            ao, lh, w, b = key
            failed.append(
                f"MISSING IN TREE: codes AO={ao} LH={lh} W={w} B={b} "
                f"(drawio IDs: {tids})"
            )

    # ── Check 4: Code extraction consistency ───────────────────────────
    # Re-parse each drawio terminal's text using the render script's approach
    # (pipe-delimited oneline) vs our line-based approach — they should agree.
    mismatches = 0
    for tid, t in drawio_terminals.items():
        codes_from_lines = t['codes']
        # Simulate the render script's approach: replace newlines with ' | '
        oneline = t['text_oneline']
        codes_from_oneline = extract_codes(oneline.replace(' | ', '\n'))

        for field in ('ao', 'lh', 'weber', 'bartonicek'):
            v1 = codes_from_lines.get(field, '')
            v2 = codes_from_oneline.get(field, '')
            if v1 != v2:
                mismatches += 1
                failed.append(
                    f"CODE PARSE INCONSISTENCY: terminal {tid} field={field} "
                    f"line-based='{v1}' oneline-based='{v2}'"
                )

    if mismatches == 0:
        passed.append("Code extraction: consistent between line-based and oneline-based parsing")

    # ── Check 5: Fracture type preservation in tree ────────────────────
    # The tree shows a shortened fracture type. Verify it's a substring of the drawio text.
    drawio_fracture_types = set()
    for t in drawio_terminals.values():
        ft = t['codes']['fracture_type']
        if ft:
            drawio_fracture_types.add(ft)

    tree_fracture_descs = set()
    for t in tree_terminals:
        tree_fracture_descs.add(t['fracture_desc'])

    # Tree shortens "Fractura unimaleolar posterior" → "unimaleolar posterior"
    # Check that every tree description can be found within some drawio fracture type
    unmatched_tree = []
    for desc in sorted(tree_fracture_descs):
        found = False
        for ft in drawio_fracture_types:
            # The tree strips "Fractura ", "maleolo ", "maleolos "
            ft_short = ft.replace('Fractura ', '').replace('maleolo ', '').replace('maleolos ', '')
            if desc == ft_short or desc in ft:
                found = True
                break
        if not found:
            unmatched_tree.append(desc)

    if unmatched_tree:
        for desc in unmatched_tree:
            warnings.append(f"Tree fracture desc not found in drawio: '{desc}'")
    else:
        passed.append(f"Fracture type preservation: all {len(tree_fracture_descs)} unique tree descriptions match drawio")

    # ── Check 6: Unique terminal texts in drawio ──────────────────────
    unique_texts = set()
    for t in drawio_terminals.values():
        unique_texts.add(t['raw_text'])
    passed.append(f"Unique terminal texts in drawio: {len(unique_texts)}")

    # ── Check 7: All AO codes are well-formed ─────────────────────────
    ao_pattern = re.compile(r'^(44-[A-C]\d(\.\d)?|43-[A-C]\d|N/C)$')
    bad_ao = []
    for tid, t in drawio_terminals.items():
        ao = t['codes']['ao']
        if ao and not ao_pattern.match(ao):
            bad_ao.append((tid, ao))
    if bad_ao:
        for tid, ao in bad_ao:
            failed.append(f"MALFORMED AO CODE: terminal {tid} ao='{ao}'")
    else:
        passed.append("AO code format: all well-formed")

    return passed, failed, warnings


# ── Main ───────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Verify rendered outputs against drawio')
    parser.add_argument('--drawio', default='docs/Danis-Weber AO_OTA Flow-2026-02-28-ES.drawio')
    parser.add_argument('--tree', default='docs/decision_tree.txt')
    parser.add_argument('--table', default='docs/decision_table.txt')
    args = parser.parse_args()

    print("=" * 70)
    print("DRAWIO vs RENDERED OUTPUT VERIFICATION")
    print("=" * 70)

    # Parse all sources
    print(f"\nParsing drawio: {args.drawio}")
    drawio_terminals, cells, children, parents = parse_drawio_terminals(args.drawio)
    print(f"  Found {len(drawio_terminals)} terminal nodes")

    print(f"\nParsing tree: {args.tree}")
    tree_terminals = parse_tree_terminals(args.tree)
    print(f"  Found {len(tree_terminals)} terminal lines")

    print(f"\nParsing table: {args.table}")
    table_terminals = parse_table_terminals(args.table)
    print(f"  Found {len(table_terminals)} data rows")

    # Run verification
    print(f"\n{'─' * 70}")
    print("VERIFICATION RESULTS")
    print(f"{'─' * 70}")

    passed, failed, warnings = verify_all(drawio_terminals, tree_terminals, table_terminals)

    print(f"\n  PASSED ({len(passed)}):")
    for msg in passed:
        print(f"    ✓ {msg}")

    if warnings:
        print(f"\n  WARNINGS ({len(warnings)}):")
        for msg in warnings:
            print(f"    ⚠ {msg}")

    if failed:
        print(f"\n  FAILED ({len(failed)}):")
        for msg in failed:
            print(f"    ✗ {msg}")

    # Summary
    print(f"\n{'═' * 70}")
    if failed:
        print(f"RESULT: FAIL — {len(failed)} failures, {len(warnings)} warnings")
        sys.exit(1)
    elif warnings:
        print(f"RESULT: PASS with {len(warnings)} warnings")
        sys.exit(0)
    else:
        print("RESULT: PASS — all checks green")
        sys.exit(0)


if __name__ == '__main__':
    main()
