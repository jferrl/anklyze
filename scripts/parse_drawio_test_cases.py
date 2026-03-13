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

# --- Form labels from i18n/es.json (source of truth for E2E click targets) ---
# These MUST match the actual form UI labels exactly.
FORM_LABELS = {
    'involved_malleoli': {
        'posterior_only': 'Maléolo posterior',
        'medial_only': 'Maléolo medial',
        'lateral_only': 'Maléolo lateral',
        'medial_posterior': 'Maléolos medial y posterior',
        'lateral_posterior': 'Maléolos lateral y posterior',
        'lateral_medial': 'Maléolos lateral y medial',
        'trimaleolar': 'Maléolos medial, lateral y posterior',
    },
    'fibular_level': {
        'infrasindesmal': 'Infrasindesmal',
        'transindesmal': 'Transindesmal',
        'suprasindesmal': 'Suprasindesmal',
    },
    'lateral_morphology': {
        'oblique': 'Transversa/Oblicua (Baja medial, alta lateral)/Conminuta',
        'spiral': 'Espiroidea (Baja anterior, alta posterior)',
    },
    'fibula_morphology_lm': {
        'transverse': 'Transversa/Oblicua (Baja medial, alta lateral)',
        'spiral': 'Espiroidea (Baja anterior, alta posterior)',
        'conminuta': 'Conminuta/ala de mariposa',
    },
    'fibula_morphology_tri': {
        'transverse': 'Transversa/Oblicua (Baja medial, alta lateral)',
        'oblique': 'Conminuta/ala de mariposa',
        'spiral': 'Espiroidea (Baja anterior, alta posterior)',
    },
    'infrasindesmal_morphology': {
        'avulsion': 'Avulsión de la punta del maleolo',
        'malleolus_fracture': 'Fractura de maleolo lateral',
    },
    'infrasindesmal_morphology_lm_tri': {
        'avulsion': 'Avulsión',
        'malleolus_fracture': 'Transversa',
    },
    'lateral_subtype': {
        'simple': 'Fractura simple',
        'syndesmosis_rupture': 'Asocia rotura de sindesmosis anterior (Tillaux/Wasgstaffe)',
        'butterfly': 'Fractura en ala de maliposa/multifragmentaria',
    },
    'medial_subtype': {
        'open_mortise': 'Abierta mortaja',
        'malleolus_fracture': 'Fractura del maléolo',
    },
    'suprasindesmal_type': {
        'simple_diaphyseal': 'Diafisaria Simple',
        'multifragmentary': 'Multifragmentaria',
        'proximal': 'Proximal',
    },
    'fibula_trace_pattern': {
        'parasindesmotic_short': 'Parasindesmal de trazo oblicuo corto/transverso/conminuto',
        'parasindesmotic_long': 'Parasindesmal de trazo oblicuo largo/espiroideo',
        'suprasindesmotic_far': 'Suprasindesmal (>6cm de superficie articular)',
    },
    'articular_involvement': {
        'large_with_extension': '>1/3 de superficie articular con extensión metafisaria',
        'small_without_extension': '<1/3 de superficie articular sin extensión metafisaria',
    },
    'medial_morphology': {
        'vertical': 'Vertical',
        'transverse_oblique': 'Transverso/oblicuo',
    },
    'posterior_fracture_type': {
        'extraincisural': 'Fragmento extraincisural',
        'posterolateral': 'Fragmento posterolateral',
        'posteromedial_posterolateral': 'Fragmento posteromedial y posterolateral',
        'large_posterolateral': 'Gran fragmento triangular posterolateral',
        'extraincisural_posteromedial': 'Fragmento extraincisural postero-medial',
    },
    'yes_no': {
        'true': 'Sí',
        'false': 'No',
    },
}

# Collect all valid form labels for validation
ALL_VALID_LABELS = set()
for group in FORM_LABELS.values():
    for label in group.values():
        ALL_VALID_LABELS.add(label)

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
    """Trace path from terminal node back to root, collecting decision->option pairs."""
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

    IMPORTANT: The drawio has 3 morphology options for LM/tri transindesmal:
      1. "Transversa/Oblicua (Baja medial, alta lateral)" -> combined transverse+oblique
      2. "Conminuta/ala de mariposa" -> conminuta/butterfly
      3. "Espiroidea (Baja anterior, alta posterior)" -> spiral

    The form has 4 options: Transversa, Oblicua/Conminuta, Espiroidea, Conminuta.

    Mapping differs by branch:
    - lateral_medial: drawio "Conminuta/ala de mariposa" -> form "Conminuta"
      (B2.3 direct, no medial subtype)
    - trimaleolar: drawio "Conminuta/ala de mariposa" -> form "Oblicua/Conminuta"
      (has medial subtype, gives B3.3/nil — matches engine's oblique path)
    """
    result = []
    for click in clicks:
        q = click['question']
        label = click['label']
        if label is None:
            result.append(click)
            continue

        # --- Involved malleoli accent normalization ---
        # Drawio uses "Maleolo"/"Maleolos"/"maleolos" without accent;
        # form uses "Maléolo"/"Maléolos" with accent.
        if q == '¿Qué maleolos tiene fracturados?':
            label = label.replace('Maleolo ', 'Maléolo ')
            label = label.replace('Maleolos ', 'Maléolos ')
            label = label.replace('maleolos ', 'Maléolos ')
            # Capitalize first letter after replacement
            if label and label[0].islower():
                label = label[0].upper() + label[1:]

        # --- Yes/No accent normalization ---
        # Drawio uses "Si" without accent; form uses "Sí"
        if label == 'Si':
            label = 'Sí'

        # --- Fibular level mapping for lateral_medial and trimaleolar ---
        # These branches now use 3-option (Infrasindesmal/Transindesmal/Suprasindesmal)
        if branch in ('lateral_medial', 'trimaleolar'):
            if q == '¿A qué nivel está la fractura de peroné?':
                if label == 'Alta (Suprasindesmal)':
                    label = 'Suprasindesmal'

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
        if q == '¿Cómo es el trazo principal de la fractura del peroné?':
            if label.startswith('Parasindesmal conminuta'):
                label = 'Parasindesmal de trazo oblicuo corto/transverso/conminuto'

        # --- Lateral morphology mapping for lateral_medial ---
        # Drawio has 3 options; form has 3 matching options.
        # Labels match directly after the form split.
        if branch == 'lateral_medial':
            if q == '¿De qué morfología es la fractura del peroné?':
                if label == 'Transversa/Oblicua (Baja medial, alta lateral)':
                    label = 'Transversa/Oblicua (Baja medial, alta lateral)'
                elif label == 'Conminuta/ala de mariposa':
                    label = 'Conminuta/ala de mariposa'

        # --- Lateral morphology mapping for trimaleolar ---
        # Drawio has 3 options; form has 3 matching options.
        if branch == 'trimaleolar':
            if q == '¿De qué morfología es la fractura del peroné?':
                if label == 'Transversa/Oblicua (Baja medial, alta lateral)':
                    label = 'Transversa/Oblicua (Baja medial, alta lateral)'
                elif label == 'Conminuta/ala de mariposa':
                    label = 'Conminuta/ala de mariposa'

        # --- Lateral morphology mapping for lateral_only, lateral_posterior ---
        # These branches use a different question text: "¿De qué morfología es la fractura?"
        # (without "del peroné"), and also "¿De qué morfología es la fractura del peroné?"
        if branch in ('lateral_only', 'lateral_posterior'):
            if q in ('¿De qué morfología es la fractura?',
                     '¿De qué morfología es la fractura del peroné?'):
                if label == 'Transversa/Oblicua (Baja medial, alta lateral)':
                    label = 'Transversa/Oblicua (Baja medial, alta lateral)/Conminuta'
                elif label == 'Transversa/Oblicua (Baja medial, alta lateral)/Conminuta':
                    pass  # Already correct

        # --- Fibula trace pattern mapping (all variants) ---
        # Drawio uses long descriptions; form uses shorter standard labels
        if 'trazo' in q.lower() or 'peroné' in q.lower():
            if 'Parasindesmal' in label and ('corto' in label or 'conminuta' in label.lower()):
                label = 'Parasindesmal de trazo oblicuo corto/transverso/conminuto'
            elif 'Parasindesmal' in label and ('largo' in label or 'espiroideo' in label):
                label = 'Parasindesmal de trazo oblicuo largo/espiroideo'
            elif 'Suprasindesmal' in label and '>6cm' in label:
                label = 'Suprasindesmal (>6cm de superficie articular)'

        # --- Lateral subtype: form now matches drawio labels directly ---
        # No normalization needed for: Fractura simple, Asocia rotura de sindesmosis...,
        # Fractura en ala de maliposa/multifragmentaria

        # --- Infrasindesmal morphology mapping for lm/tri ---
        # Drawio uses "Avulsión" / "Transversa", form now matches directly
        # No normalization needed

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


# --- Required form questions per branch ---
# These define which questions the form ALWAYS asks for each branch+level.
# Used to detect shortcut paths in the drawio that skip required form questions.
REQUIRED_QUESTIONS = {
    # Trimaleolar always asks CT scan
    ('trimaleolar', 'infrasindesmal'): {'¿Tiene TAC?'},
    ('trimaleolar', 'transindesmal'): {'¿Tiene TAC?'},
    ('trimaleolar', 'suprasindesmal'): {'¿Tiene TAC?'},
    # Lateral+posterior always asks CT scan
    ('lateral_posterior', 'infrasindesmal'): {'¿Tiene TAC?'},
    ('lateral_posterior', 'transindesmal'): {'¿Tiene TAC?'},
    ('lateral_posterior', 'suprasindesmal'): {'¿Tiene TAC?'},
}


def detect_fibular_level(clicks):
    """Extract the fibular level from clicks (Infrasindesmal/Transindesmal/Suprasindesmal)."""
    for click in clicks:
        label = click.get('label', '')
        if not label:
            continue
        ll = label.lower()
        if ll in ('infrasindesmal',):
            return 'infrasindesmal'
        if ll in ('transindesmal',):
            return 'transindesmal'
        if ll in ('suprasindesmal',):
            return 'suprasindesmal'
        # Normalized labels
        if 'infrasindesmal' in ll and 'suprasindesmal' not in ll:
            return 'infrasindesmal'
    return None


def is_shortcut_path(branch, clicks):
    """Detect if a test case is a drawio shortcut that skips required form questions.

    The drawio sometimes has terminal nodes reachable via shorter paths that skip
    questions the form always asks (e.g., CT scan for trimaleolar). These paths
    produce the same classification as the longer path with the skipped question
    answered "No", so they are redundant for E2E testing.
    """
    level = detect_fibular_level(clicks)
    key = (branch, level)
    required = REQUIRED_QUESTIONS.get(key)
    if not required:
        return False

    questions_in_path = {c['question'] for c in clicks if c.get('label') is not None}
    missing = required - questions_in_path
    return len(missing) > 0


# Trace all paths and generate test cases
terminals = [c for c in cells.values() if c['type'] == 'terminal']
all_test_cases = {}
branch_counts = {}
shortcut_count = 0
label_warnings = []

for terminal in terminals:
    path = trace_path_to_root(terminal['id'])
    parsed = parse_terminal_value(terminal['text'])
    branch = determine_branch(path)

    clicks = [{'question': step['question'], 'label': step['answer']} for step in path]
    clicks.append({'question': 'Clasificar Fractura', 'label': None})
    clicks = normalize_labels(branch, clicks)

    # Filter shortcut paths that skip required form questions
    if is_shortcut_path(branch, clicks):
        shortcut_count += 1
        continue

    all_test_cases.setdefault(branch, [])
    branch_counts[branch] = branch_counts.get(branch, 0) + 1
    idx = branch_counts[branch]

    # Validate all normalized labels against known form labels
    for click in clicks:
        label = click.get('label')
        if label is None:
            continue
        if label not in ALL_VALID_LABELS:
            label_warnings.append({
                'test_id': f'{branch}_{idx}',
                'question': click['question'],
                'label': label,
                'terminal_id': terminal['id'],
            })

    all_test_cases[branch].append({
        'id': f'{branch}_{idx}',
        'description': ' -> '.join([s['answer'] for s in path]),
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
if shortcut_count:
    print(f"  Filtered shortcut paths: {shortcut_count}")

# Check for parsing issues
issues = 0
for branch, cases in all_test_cases.items():
    for case in cases:
        exp = case['expected']
        if not exp.get('fracture_type'):
            issues += 1
            print(f"  WARNING: {case['id']} missing fracture_type")

print(f"\nParsing issues: {issues}")

# Report label validation warnings
if label_warnings:
    print(f"\n{'='*60}")
    print(f"LABEL VALIDATION WARNINGS: {len(label_warnings)} labels don't match form i18n")
    print(f"{'='*60}")
    for w in label_warnings:
        print(f"  {w['test_id']}: question=\"{w['question']}\" label=\"{w['label']}\"")
    print(f"{'='*60}")
else:
    print(f"\nLabel validation: all labels match form i18n")

# --- Drawio vs Form structure validation ---
print(f"\n{'='*60}")
print("DRAWIO vs FORM STRUCTURE VALIDATION")
print(f"{'='*60}")

# Collect unique drawio morphology options per branch
drawio_morphology_options = {}
for branch, cases in all_test_cases.items():
    morph_labels = set()
    for case in cases:
        for click in case['clicks']:
            q = click.get('question', '')
            label = click.get('label', '')
            if label and 'morfología' in q.lower() and 'fractura' in q.lower():
                # Only lateral/fibula morphology questions, not medial morphology
                if 'medial' not in q.lower():
                    morph_labels.add(label)
    if morph_labels:
        drawio_morphology_options[branch] = morph_labels

form_morphology_options = {
    'lateral_only': set(FORM_LABELS['lateral_morphology'].values()),
    'lateral_posterior': set(FORM_LABELS['lateral_morphology'].values()),
    'lateral_medial': set(FORM_LABELS['fibula_morphology_lm'].values()),
    'trimaleolar': set(FORM_LABELS['fibula_morphology_tri'].values()),
}

for branch in sorted(set(drawio_morphology_options) | set(form_morphology_options)):
    drawio_opts = drawio_morphology_options.get(branch, set())
    form_opts = form_morphology_options.get(branch, set())

    if drawio_opts == form_opts:
        print(f"  {branch} morphology: OK ({len(drawio_opts)} options)")
    else:
        extra_in_form = form_opts - drawio_opts
        extra_in_drawio = drawio_opts - form_opts
        print(f"  {branch} morphology: MISMATCH")
        print(f"    Drawio options ({len(drawio_opts)}): {sorted(drawio_opts)}")
        print(f"    Form options ({len(form_opts)}):   {sorted(form_opts)}")
        if extra_in_form:
            print(f"    Extra in form (not in drawio): {sorted(extra_in_form)}")
        if extra_in_drawio:
            print(f"    Extra in drawio (not in form): {sorted(extra_in_drawio)}")

print(f"{'='*60}")

# --- Check for duplicate paths ---
print(f"\nDuplicate path check:")
dup_count = 0
for branch, cases in all_test_cases.items():
    paths = {}
    for case in cases:
        path_key = ' -> '.join([c['label'] or 'CLASSIFY' for c in case['clicks']])
        if path_key in paths:
            dup_count += 1
            print(f"  DUPLICATE in {branch}: {case['id']} duplicates {paths[path_key]}")
        paths[path_key] = case['id']
if dup_count == 0:
    print("  No duplicates found")

# Write output
with open(OUTPUT_PATH, 'w') as f:
    json.dump(all_test_cases, f, indent=2, ensure_ascii=False)

print(f"\nTest cases written to {OUTPUT_PATH}")

# Also write summary
summary_path = OUTPUT_PATH.replace('.json', '_summary.txt')
with open(summary_path, 'w') as f:
    f.write(f"Classification Flow Test Cases\n{'='*40}\n\n")
    for branch in sorted(all_test_cases.keys()):
        f.write(f"{branch}: {len(all_test_cases[branch])} terminals\n")
    f.write(f"\nTotal: {total}\n")
    if shortcut_count:
        f.write(f"Filtered shortcut paths: {shortcut_count}\n")
    if label_warnings:
        f.write(f"\nLabel warnings: {len(label_warnings)}\n")
        for w in label_warnings:
            f.write(f"  {w['test_id']}: {w['question']} -> {w['label']}\n")
print(f"Summary written to {summary_path}")
