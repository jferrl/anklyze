#!/usr/bin/env python3
"""Parse drawio XML to extract the ankle fracture classification decision tree
and generate E2E test cases for all terminal classification paths.

Usage:
    python3 scripts/parse_drawio_test_cases.py [drawio_path] [output_path]

Defaults:
    drawio_path: docs/Danis-Weber AO_OTA Flow-2026-02-28-ES.drawio
    output_path: /tmp/classification_test_cases.json
"""

import xml.etree.ElementTree as ET
import json
import re
import html
import sys

DRAWIO_PATH = sys.argv[1] if len(sys.argv) > 1 else "docs/Danis-Weber AO_OTA Flow-2026-02-28-ES.drawio"
OUTPUT_PATH = sys.argv[2] if len(sys.argv) > 2 else "/tmp/classification_test_cases.json"

tree = ET.parse(DRAWIO_PATH)
root = tree.getroot()

# Extract all mxCell elements
cells = {}
edges = []

for diagram in root.iter('diagram'):
    for model in diagram.iter('mxGraphModel'):
        for mxroot in model.iter('root'):
            for cell in mxroot.iter('mxCell'):
                cell_id = cell.get('id')
                style = cell.get('style', '')
                value = cell.get('value', '')
                source = cell.get('source')
                target = cell.get('target')
                edge = cell.get('edge')

                if edge == '1' and source and target:
                    edges.append({'source': source, 'target': target, 'value': value})
                elif cell_id and cell_id not in ('0', '1'):
                    clean_value = html.unescape(value).strip()
                    text_value = re.sub(r'<[^>]+>', '\n', clean_value).strip()

                    node_type = 'unknown'
                    if 'fillColor=#fff2cc' in style:
                        node_type = 'decision'
                    elif 'fillColor=#d5e8d4' in style:
                        node_type = 'option'
                    elif 'fillColor=#f8cecc' in style:
                        node_type = 'terminal'
                    elif 'fillColor=#dae8fc' in style:
                        node_type = 'label'

                    # Heuristic: green (option) nodes containing '?' are actually decision nodes
                    if node_type == 'option' and '?' in text_value:
                        node_type = 'decision'

                    cells[cell_id] = {
                        'id': cell_id,
                        'type': node_type,
                        'value': clean_value,
                        'text': text_value,
                        'style': style
                    }

# Build adjacency lists
children = {}
parents = {}

for edge in edges:
    src, tgt = edge['source'], edge['target']
    children.setdefault(src, []).append(tgt)
    parents.setdefault(tgt, []).append(src)

# Find root decision node (first question about malleoli)
root_decision = None
for cell_id, cell in cells.items():
    if cell['type'] == 'decision' and 'maleolos' in cell['text'].lower():
        parent_types = [cells.get(p, {}).get('type') for p in parents.get(cell_id, [])]
        if all(t in ('label', 'unknown', None) for t in parent_types):
            root_decision = cell_id
            break

# Stats
terminal_count = sum(1 for c in cells.values() if c['type'] == 'terminal')
decision_count = sum(1 for c in cells.values() if c['type'] == 'decision')
option_count = sum(1 for c in cells.values() if c['type'] == 'option')

print(f"Nodes: {len(cells)} (decisions={decision_count}, options={option_count}, terminals={terminal_count})")
print(f"Edges: {len(edges)}")
print(f"Root: {root_decision} = {cells.get(root_decision, {}).get('text', 'NOT FOUND')}")


def parse_terminal_value(text):
    """Parse terminal node text to extract classification codes.

    Handles formats like:
        AO tipo 44 B1 subtipo 44 B1.2
        AO tipo 44 C1 subtipo C1.3
        AO tipo 44 A2
        AO no clasificable
        AO 43 B1
        AO clasificable
        Lauge-Hansen SA / SER / PA / PER
        Lauge-Hansen no clasificable
        Weber A / B / C
        Bartonicek 1 / 2 / 3 / 4
    """
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    result = {
        'fracture_type': None,
        'ao': None,
        'lauge_hansen': None,
        'weber': None,
        'bartonicek': None
    }

    if not lines:
        return result

    result['fracture_type'] = lines[0]

    full_text = '\n'.join(lines)

    # AO/OTA - multiple formats
    # Format: "AO tipo 44 B1 subtipo 44 B1.2" or "AO tipo 44 B1 subtipo B1.2"
    ao_subtipo = re.search(r'AO\s+tipo\s+\d+\s+[A-C]\d\s+subtipo\s+(?:\d+\s+)?([A-C]\d\.\d)', full_text, re.IGNORECASE)
    if ao_subtipo:
        code = ao_subtipo.group(1)
        result['ao'] = f"44-{code}"
    else:
        # Format: "AO tipo 44 C1 subtipo no clasificable"
        ao_tipo_noclasif = re.search(r'AO\s+tipo\s+\d+\s+([A-C]\d)\s+subtipo\s+no\s+clasificable', full_text, re.IGNORECASE)
        if ao_tipo_noclasif:
            code = ao_tipo_noclasif.group(1)
            result['ao'] = f"44-{code}"
        else:
            # Format: "AO tipo 44 A2" (no subtipo)
            ao_tipo = re.search(r'AO\s+tipo\s+\d+\s+([A-C]\d)\b', full_text, re.IGNORECASE)
            if ao_tipo:
                result['ao'] = f"44-{ao_tipo.group(1)}"
            else:
                # Format: "AO 43 B1" (distal tibia)
                ao_43 = re.search(r'AO\s+(43\s+[A-C]\d)', full_text, re.IGNORECASE)
                if ao_43:
                    result['ao'] = ao_43.group(1).replace(' ', '-')
                elif re.search(r'AO\s+no\s+clasificable', full_text, re.IGNORECASE):
                    result['ao'] = 'no clasificable'
                elif re.search(r'AO\s+clasificable', full_text, re.IGNORECASE):
                    # "AO clasificable" means it IS classifiable but specific code not in drawio
                    result['ao'] = 'clasificable'

    # Lauge-Hansen
    lh_match = re.search(r'Lauge[- ]Hansen\s+(SA|SER|PA|PER)\b', full_text, re.IGNORECASE)
    if lh_match:
        result['lauge_hansen'] = lh_match.group(1).upper()
    elif re.search(r'Lauge[- ]Hansen\s+no\s+clasificable', full_text, re.IGNORECASE):
        result['lauge_hansen'] = 'no clasificable'

    # Danis-Weber
    weber_match = re.search(r'Weber\s+([ABC])\b', full_text, re.IGNORECASE)
    if weber_match:
        result['weber'] = weber_match.group(1).upper()

    # Bartonicek
    bart_match = re.search(r'Barton[ií]cek\s+(\d)', full_text, re.IGNORECASE)
    if bart_match:
        result['bartonicek'] = int(bart_match.group(1))

    return result


def trace_path_to_root(terminal_id):
    """Trace path from terminal node back to root, collecting decision→option pairs."""
    path = []
    visited = set()
    current = terminal_id

    while current and current != root_decision:
        if current in visited:
            break
        visited.add(current)

        parent_ids = parents.get(current, [])
        if not parent_ids:
            break

        parent_id = parent_ids[0]
        parent_node = cells.get(parent_id)
        if not parent_node:
            break

        if parent_node['type'] == 'option':
            option_text = parent_node['text']
            grandparent_ids = parents.get(parent_id, [])
            decision_id = None
            decision_text = None

            for gp_id in grandparent_ids:
                gp_node = cells.get(gp_id)
                if gp_node and gp_node['type'] == 'decision':
                    decision_id = gp_id
                    decision_text = gp_node['text']
                    break

            if decision_text:
                path.append({
                    'question': decision_text,
                    'answer': option_text,
                    'decision_id': decision_id,
                    'option_id': parent_id
                })
                current = decision_id
            else:
                current = parent_id
        elif parent_node['type'] == 'decision':
            current_node = cells.get(current)
            if current_node and current_node['type'] == 'option':
                path.append({
                    'question': parent_node['text'],
                    'answer': current_node['text'],
                    'decision_id': parent_id,
                    'option_id': current
                })
            current = parent_id
        else:
            current = parent_id

    path.reverse()
    return path


def normalize_labels(branch, clicks):
    """Post-process click sequences to map drawio labels to form labels.

    The drawio has raw labels that don't always match the form's UI labels.
    This function normalizes them so test cases match what the form displays.
    """
    result = []
    for click in clicks:
        q = click['question']
        label = click['label']
        if label is None:
            result.append(click)
            continue

        # --- Fibular level mapping for lateral_medial and trimaleolar ---
        # These branches use a 2-option question (Alta/Baja) instead of 3-option
        if branch in ('lateral_medial', 'trimaleolar'):
            if q == '¿A qué nivel está la fractura de peroné?':
                if label in ('Infrasindesmal', 'Transindesmal'):
                    label = 'Baja (Transindesmal / Infrasindesmal)'
                elif label in ('Suprasindesmal', 'Alta (Suprasindesmal)'):
                    label = 'Alta (Suprasindesmal)'

        # --- Suprasindesmal type mapping ---
        if q == '¿De qué tipo?':
            if label == 'Multifragmentaria/ala de mariposa':
                label = 'Multifragmentaria'
            elif label == 'Fractura en ala de maliposa/multifragmentaria':
                label = 'Multifragmentaria'
            elif label in ('Proximal (1/ proximal de peroné)',
                           'Proximal (1/3 proximal de peroné)',
                           'Proximal (1/3 proximal peroné)'):
                label = 'Proximal'

        # --- Fibula trace pattern mapping ---
        if q == '¿Cómo es el trazo principal del peroné?':
            if label.startswith('Parasindesmal conminuta'):
                label = 'Parasindesmal de trazo oblicuo corto/transverso/conminuto'

        # --- Lateral morphology mapping for lateral_medial and trimaleolar ---
        # These branches use 3-option morphology (Transversa / Oblicua / Espiroidea)
        if branch in ('lateral_medial', 'trimaleolar'):
            if q == '¿De qué morfología es la fractura del peroné?':
                if label == 'Transversa/Oblicua (Baja medial, alta lateral)':
                    label = 'Transversa'
                elif label == 'Conminuta/ala de mariposa':
                    label = 'Oblicua (Baja medial, alta lateral)/Conminuta'

        # --- Lateral morphology mapping for lateral_only, lateral_posterior ---
        if branch in ('lateral_only', 'lateral_posterior'):
            if q == '¿De qué morfología es la fractura del peroné?':
                if label == 'Transversa/Oblicua (Baja medial, alta lateral)':
                    label = 'Transversa/Oblicua (Baja medial, alta lateral)/Conminuta'

        # --- Fibula trace pattern mapping (all variants) ---
        # Drawio uses long descriptions; form uses shorter standard labels
        if 'trazo' in q.lower() or 'peroné' in q.lower():
            if 'Parasindesmal' in label and ('corto' in label or 'conminuta' in label.lower()):
                label = 'Parasindesmal de trazo oblicuo corto/transverso/conminuto'
            elif 'Parasindesmal' in label and ('largo' in label or 'espiroideo' in label):
                label = 'Parasindesmal de trazo oblicuo largo/espiroideo'
            elif 'Suprasindesmal' in label and '>6cm' in label:
                label = 'Suprasindesmal (>6cm de superficie articular)'

        # --- Lateral subtype mapping (transindesmal subtypes) ---
        # Drawio labels differ from form labels for B1 subtypes
        # Context: after morphology in transindesmal path, "¿De qué tipo?" = lateral subtype
        if q == '¿De qué tipo?' and any(
            prev['label'] and ('Espiroidea' in prev['label'] or 'Transversa/Oblicua' in prev['label'])
            for prev in result[-2:] if isinstance(prev, dict) and 'label' in prev
        ):
            if label == 'Fractura simple':
                label = 'Simple'
            elif label.startswith('Asocia rotura de sindesmosis'):
                label = 'Rotura de sindesmosis'
            elif label == 'Multifragmentaria':
                label = 'Ala de mariposa / cuña'

        # --- Infrasindesmal morphology mapping ---
        # Drawio uses "Avulsión" / "Transversa" but form uses
        # "Avulsión punta del peroné" / "Fractura del maléolo"
        if q in ('¿Cómo es el maleolo lateral?', '¿Cómo es el maléolo lateral?'):
            if label == 'Avulsión':
                label = 'Avulsión punta del peroné'
            elif label == 'Transversa':
                label = 'Fractura del maléolo'

        # --- Medial subtype mapping ---
        # Drawio uses "Abierta la mortaja" / "Fractura del maleolo/avulsión"
        # Form uses "Abierta mortaja" / "Fractura del maléolo"
        if q in ('¿Cómo es el maleolo medial?', '¿Cómo es el maléolo medial?'):
            if label == 'Abierta la mortaja':
                label = 'Abierta mortaja'
            elif label in ('Fractura del maleolo/avulsión', 'Fractura del maléolo/avulsión'):
                label = 'Fractura del maléolo'

        # --- Medial morphology LM normalization ---
        # Drawio uses "Transverso/oblicuo/avulsión/abierta mortaja" but form uses "Transverso/oblicuo"
        if q in ('¿De qué morfología es la fractura del maleolo medial?',
                 '¿De qué morfología es la fractura del maléolo medial?'):
            if label.startswith('Transverso/oblicuo'):
                label = 'Transverso/oblicuo'

        # --- Posterior fracture type label normalization ---
        if label == 'Fragmento extraincisural posteromedial':
            label = 'Fragmento extraincisural postero-medial'
        elif label == 'Fragmento extraincisural posterior':
            label = 'Fragmento extraincisural'

        result.append({'question': q, 'label': label})
    return result


def determine_branch(path):
    """Determine the malleoli branch from the first answer in the path."""
    if not path:
        return 'unknown'
    first = path[0]['answer'].lower()
    if 'lateral' in first and 'medial' in first and 'posterior' in first:
        return 'trimaleolar'
    if 'lateral' in first and 'posterior' in first:
        return 'lateral_posterior'
    if 'lateral' in first and 'medial' in first:
        return 'lateral_medial'
    if 'medial' in first and 'posterior' in first:
        return 'medial_posterior'
    if 'posterior' in first:
        return 'posterior_only'
    if 'medial' in first:
        return 'medial_only'
    if 'lateral' in first:
        return 'lateral_only'
    return 'unknown'


# Trace all paths and generate test cases
terminals = [c for c in cells.values() if c['type'] == 'terminal']
all_test_cases = {}
branch_counts = {}

for terminal in terminals:
    path = trace_path_to_root(terminal['id'])
    parsed = parse_terminal_value(terminal['text'])
    branch = determine_branch(path)

    all_test_cases.setdefault(branch, [])
    branch_counts[branch] = branch_counts.get(branch, 0) + 1
    idx = branch_counts[branch]

    clicks = [{'question': step['question'], 'label': step['answer']} for step in path]
    clicks.append({'question': 'Clasificar Fractura', 'label': None})
    clicks = normalize_labels(branch, clicks)

    all_test_cases[branch].append({
        'id': f'{branch}_{idx}',
        'description': ' → '.join([s['answer'] for s in path]),
        'clicks': clicks,
        'expected': parsed,
        'terminal_id': terminal['id'],
        'terminal_raw': terminal['text']
    })

# Print summary
total = 0
print(f"\nTerminal nodes per branch:")
for branch in sorted(all_test_cases.keys()):
    count = len(all_test_cases[branch])
    total += count
    print(f"  {branch}: {count}")
print(f"  TOTAL: {total}")

# Check for parsing issues
issues = 0
for branch, cases in all_test_cases.items():
    for case in cases:
        exp = case['expected']
        if not exp.get('fracture_type'):
            issues += 1
            print(f"  WARNING: {case['id']} missing fracture_type")

print(f"\nParsing issues: {issues}")

# Write output
with open(OUTPUT_PATH, 'w') as f:
    json.dump(all_test_cases, f, indent=2, ensure_ascii=False)

print(f"Test cases written to {OUTPUT_PATH}")

# Also write summary
summary_path = OUTPUT_PATH.replace('.json', '_summary.txt')
with open(summary_path, 'w') as f:
    f.write(f"Classification Flow Test Cases\n{'='*40}\n\n")
    for branch in sorted(all_test_cases.keys()):
        f.write(f"{branch}: {len(all_test_cases[branch])} terminals\n")
    f.write(f"\nTotal: {total}\n")
print(f"Summary written to {summary_path}")
