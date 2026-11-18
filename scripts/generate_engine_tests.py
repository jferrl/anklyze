#!/usr/bin/env python3
"""Generate Go table-driven tests for the rules engine from drawio test cases.

Reads /tmp/classification_test_cases.json (produced by parse_drawio_test_cases.py)
and generates internal/rules/engine_drawio_test.go with subtests grouped by branch.

Usage:
    python3 scripts/generate_engine_tests.py [input_path] [output_path]

Defaults:
    input_path:  /tmp/classification_test_cases.json
    output_path: internal/rules/engine_drawio_test.go
"""

import json
import re
import subprocess
import sys

INPUT_PATH = sys.argv[1] if len(sys.argv) > 1 else "/tmp/classification_test_cases.json"
OUTPUT_PATH = sys.argv[2] if len(sys.argv) > 2 else "internal/rules/engine_drawio_test.go"

# --- Label-to-domain-value mappings ---
# Answer labels come from the form (es.json, already normalized by
# parse_drawio_test_cases.py); option keys are the domain values, and the Go
# constant for each value is read from internal/domain/fracture.go.
I18N_PATH = "frontend/src/i18n/es.json"
DOMAIN_PATH = "internal/domain/fracture.go"

# FractureInput field -> es.json option groups whose keys are that field's values.
FIELD_GROUPS = {
    'InvolvedMalleoli': ('involvedMalleoli',),
    'PosteriorFractureType': ('posteriorType', 'posteriorTypeMedPost', 'posteriorTypeLPInfra'),
    'MedialMorphology': ('medialMorphology', 'medialMorphologyLM'),
    'FibularLevel': ('fibularLevel',),
    'FibulaTraceCount': ('fibulaTraceCount',),
    'LateralMorphology': ('lateralMorphology', 'lateralMorphologyMulti', 'lateralMorphologyLP',
                          'fibulaMorphologyLM', 'fibulaMorphologyLMMulti',
                          'fibulaMorphologyTri', 'fibulaMorphologyTriMulti'),
    'InfrasindesmalMorphology': ('infrasindesmalMorphology', 'infrasindesmalMorphologyLMTri'),
    'LateralSubtype': ('lateralSubtype',),
    'MedialSubtype': ('medialSubtype',),
    'SuprasindesmalType': ('suprasindesmalType', 'suprasindesmalTypeLP'),
    'FibulaTracePattern': ('fibulaTracePattern', 'fibulaTracePatternLP', 'fibulaTracePatternMultiLP'),
    'ArticularInvolvement': ('articularInvolvement',),
}

# Yes/no questions, matched by a keyword of the question text.
BOOL_QUESTIONS = (
    ('tac', 'HasCTScan'),
    ('depresión articular', 'HasArticularDepression'),
    ('es infrasindesmal', 'FibulaInfrasindesmalTransverse'),
    ('acortamiento', 'HasFibulaHeadShortening'),
    ('posteromedial', 'IsPosteriorPosteromedial'),
)


def load_label_map():
    """Return {form label: (FractureInput field, Go constant)}."""
    with open(DOMAIN_PATH, encoding='utf-8') as f:
        src = f.read()
    consts = {(typ, val): f'domain.{name}'
              for name, typ, val in re.findall(r'^\s*(\w+)\s+(\w+)\s*=\s*"([^"]*)"', src, re.M)}
    struct = src[src.index('type FractureInput struct'):]
    field_types = dict(re.findall(r'^\s*(\w+)\s+\*?(\w+)\s+`', struct, re.M))

    with open(I18N_PATH, encoding='utf-8') as f:
        options = json.load(f)['form']['options']
    label_map = {}
    for field, groups in FIELD_GROUPS.items():
        for group in groups:
            for value, label in options[group].items():
                entry = (field, consts[(field_types[field], value)])
                assert label_map.setdefault(label, entry) == entry, f"ambiguous form label: {label}"
    return label_map


LABEL_MAP = load_label_map()

YES_NO = {
    'Sí': True,
    'No': False,
}

# AO code mapping from drawio expected to Go constants
AO_CODE_MAP = {
    '44-A1': 'domain.AOOTAA1',
    '44-A1.2': 'domain.AOOTAA1_2',
    '44-A1.3': 'domain.AOOTAA1_3',
    '44-A2': 'domain.AOOTAA2',
    '44-A2.2': 'domain.AOOTAA2_2',
    '44-A2.3': 'domain.AOOTAA2_3',
    '44-A3': 'domain.AOOTAA3',
    '44-A3.2': 'domain.AOOTAA3_2',
    '44-A3.3': 'domain.AOOTAA3_3',
    '44-B1': 'domain.AOOTAB1',
    '44-B1.1': 'domain.AOOTAB1_1',
    '44-B1.2': 'domain.AOOTAB1_2',
    '44-B1.3': 'domain.AOOTAB1_3',
    '44-B2': 'domain.AOOTAB2',
    '44-B2.1': 'domain.AOOTAB2_1',
    '44-B2.2': 'domain.AOOTAB2_2',
    '44-B2.3': 'domain.AOOTAB2_3',
    '44-B3': 'domain.AOOTAB3',
    '44-B3.1': 'domain.AOOTAB3_1',
    '44-B3.2': 'domain.AOOTAB3_2',
    '44-B3.3': 'domain.AOOTAB3_3',
    '44-C1': 'domain.AOOTAC1',
    '44-C1.1': 'domain.AOOTAC1_1',
    '44-C1.2': 'domain.AOOTAC1_2',
    '44-C1.3': 'domain.AOOTAC1_3',
    '44-C2': 'domain.AOOTAC2',
    '44-C2.1': 'domain.AOOTAC2_1',
    '44-C2.2': 'domain.AOOTAC2_2',
    '44-C2.3': 'domain.AOOTAC2_3',
    '44-C3': 'domain.AOOTAC3',
    '44-C3.1': 'domain.AOOTAC3_1',
    '44-C3.2': 'domain.AOOTAC3_2',
    '44-C3.3': 'domain.AOOTAC3_3',
    '43-B1': 'domain.AOOTA43B1',
    '43-B2': 'domain.AOOTA43B2',
}

LH_MAP = {
    'SA': 'domain.LaugeHansenSA',
    'SER': 'domain.LaugeHansenSER',
    'PA': 'domain.LaugeHansenPA',
    'PER': 'domain.LaugeHansenPER',
}

WEBER_MAP = {
    'A': 'domain.DanisWeberA',
    'B': 'domain.DanisWeberB',
    'C': 'domain.DanisWeberC',
}

BARTONICEK_MAP = {
    1: 'domain.BartonicekType1',
    2: 'domain.BartonicekType2',
    3: 'domain.BartonicekType3',
    4: 'domain.BartonicekType4',
}

# Expected fracture_type per branch
FRACTURE_TYPE_MAP = {
    'posterior_only_distal_tibia': 'posterior_distal_tibia',
    'posterior_only': 'unimaleolar_posterior',
    'medial_only_distal_tibia': 'distal_tibia',
    'medial_only': 'unimaleolar_medial',
    'lateral_only': 'unimaleolar_lateral',
    'medial_posterior': 'bimaleolar_medial_posterior',
    'lateral_posterior': 'bimaleolar_lateral_posterior',
    'lateral_medial': 'bimaleolar_lateral_medial',
    'trimaleolar': 'trimaleolar',
}


NO_POSTERIOR_BRANCHES = ('medial_only', 'lateral_only', 'lateral_medial')

# Drawio terminal id -> why the engine disagrees with that path's codes.
# These subtests are emitted with t.Skip until the clinician resolves them.
KNOWN_DISCREPANCIES = {}


def clicks_to_input(clicks):
    """Convert a test case's clicks array to FractureInput field assignments."""
    fields = {}
    bool_fields = {}

    for click in clicks:
        q = click['question'].lower()
        label = click.get('label')
        if label is None:
            continue

        if label not in YES_NO:
            if label not in LABEL_MAP:
                raise ValueError(f"Unknown form label: {label}")
            field, const = LABEL_MAP[label]
            fields[field] = const
        elif 'importante afectación articular' in q:
            fields['ArticularInvolvement'] = (
                'domain.ArticularLargeWithExtension' if YES_NO[label]
                else 'domain.ArticularSmallWithoutExtension')
        else:
            field = next((f for kw, f in BOOL_QUESTIONS if kw in q), None)
            if field is None:
                raise ValueError(f"Unknown yes/no question: {click['question']}")
            bool_fields[field] = YES_NO[label]

    return fields, bool_fields


def determine_fracture_type(branch, fields):
    """Determine expected fracture_type based on branch and articular involvement."""
    if fields.get('ArticularInvolvement') == 'domain.ArticularLargeWithExtension':
        return FRACTURE_TYPE_MAP[f'{branch}_distal_tibia']
    return FRACTURE_TYPE_MAP.get(branch, branch)


def build_input_literal(fields, bool_fields):
    """Build Go struct literal for domain.FractureInput."""
    lines = []
    for field, value in fields.items():
        lines.append(f'\t\t\t\t{field}: {value},')
    for field, value in bool_fields.items():
        if value:
            lines.append(f'\t\t\t\t{field}: &boolTrue,')
        else:
            lines.append(f'\t\t\t\t{field}: &boolFalse,')
    return '\n'.join(lines)


def build_expected_checks(expected, fracture_type, branch):
    """Build Go assertion statements for expected classification results."""
    checks = []

    # Fracture type
    checks.append(f'\t\t\tif result.FractureType != "{fracture_type}" {{')
    checks.append(f'\t\t\t\tt.Errorf("FractureType = %q, want %q", result.FractureType, "{fracture_type}")')
    checks.append('\t\t\t}')

    # Weber — always present; missing from drawio means not_classifiable
    weber = expected.get('weber')
    if weber:
        go_val = WEBER_MAP[weber]
        checks.append(f'\t\t\tif result.DanisWeber == nil {{')
        checks.append(f'\t\t\t\tt.Fatal("DanisWeber is nil, want {weber}")')
        checks.append(f'\t\t\t\treturn')
        checks.append(f'\t\t\t}}')
        checks.append(f'\t\t\tif result.DanisWeber.Type != {go_val} {{')
        checks.append(f'\t\t\t\tt.Errorf("DanisWeber = %q, want %q", result.DanisWeber.Type, {go_val})')
        checks.append(f'\t\t\t}}')
    else:
        checks.append(f'\t\t\tif result.DanisWeber == nil {{')
        checks.append(f'\t\t\t\tt.Fatal("DanisWeber is nil, want not_classifiable")')
        checks.append(f'\t\t\t\treturn')
        checks.append(f'\t\t\t}}')
        checks.append(f'\t\t\tif result.DanisWeber.Type != domain.DanisWeberNotClassifiable {{')
        checks.append(f'\t\t\t\tt.Errorf("DanisWeber = %q, want %q", result.DanisWeber.Type, domain.DanisWeberNotClassifiable)')
        checks.append(f'\t\t\t}}')

    # Lauge-Hansen
    lh = expected.get('lauge_hansen')
    if lh and lh != 'no clasificable':
        go_val = LH_MAP[lh]
        checks.append(f'\t\t\tif result.LaugeHansen == nil {{')
        checks.append(f'\t\t\t\tt.Fatal("LaugeHansen is nil, want {lh}")')
        checks.append(f'\t\t\t\treturn')
        checks.append(f'\t\t\t}}')
        checks.append(f'\t\t\tif result.LaugeHansen.Type != {go_val} {{')
        checks.append(f'\t\t\t\tt.Errorf("LaugeHansen = %q, want %q", result.LaugeHansen.Type, {go_val})')
        checks.append(f'\t\t\t}}')
    elif lh == 'no clasificable':
        checks.append(f'\t\t\tif result.LaugeHansen == nil {{')
        checks.append(f'\t\t\t\tt.Fatal("LaugeHansen is nil, want not_classifiable")')
        checks.append(f'\t\t\t\treturn')
        checks.append(f'\t\t\t}}')
        checks.append(f'\t\t\tif result.LaugeHansen.Type != domain.LaugeHansenNotClassifiable {{')
        checks.append(f'\t\t\t\tt.Errorf("LaugeHansen = %q, want %q", result.LaugeHansen.Type, domain.LaugeHansenNotClassifiable)')
        checks.append(f'\t\t\t}}')
    else:
        checks.append(f'\t\t\tif result.LaugeHansen == nil {{')
        checks.append(f'\t\t\t\tt.Fatal("LaugeHansen is nil, want not_classifiable")')
        checks.append(f'\t\t\t\treturn')
        checks.append(f'\t\t\t}}')
        checks.append(f'\t\t\tif result.LaugeHansen.Type != domain.LaugeHansenNotClassifiable {{')
        checks.append(f'\t\t\t\tt.Errorf("LaugeHansen = %q, want %q", result.LaugeHansen.Type, domain.LaugeHansenNotClassifiable)')
        checks.append(f'\t\t\t}}')

    # AO/OTA
    ao = expected.get('ao')
    if ao and ao != 'no clasificable' and ao != 'clasificable':
        go_val = AO_CODE_MAP.get(ao)
        if go_val:
            checks.append(f'\t\t\tif result.AOOTA == nil {{')
            checks.append(f'\t\t\t\tt.Fatal("AOOTA is nil, want {ao}")')
            checks.append(f'\t\t\t\treturn')
            checks.append(f'\t\t\t}}')
            checks.append(f'\t\t\tif result.AOOTA.Code != {go_val} {{')
            checks.append(f'\t\t\t\tt.Errorf("AOOTA = %q, want %q", result.AOOTA.Code, {go_val})')
            checks.append(f'\t\t\t}}')
        else:
            checks.append(f'\t\t\t// TODO: unknown AO code "{ao}"')
    elif ao == 'clasificable':
        checks.append('\t\t\t// AO not asserted: drawio says "AO clasificable" without a code.')
    elif ao == 'no clasificable':
        # "no clasificable" → expect AOOTANotClassifiable
        checks.append(f'\t\t\tif result.AOOTA == nil {{')
        checks.append(f'\t\t\t\tt.Fatal("AOOTA is nil, want no clasificable")')
        checks.append(f'\t\t\t\treturn')
        checks.append(f'\t\t\t}}')
        checks.append(f'\t\t\tif result.AOOTA.Code != domain.AOOTANotClassifiable {{')
        checks.append(f'\t\t\t\tt.Errorf("AOOTA = %q, want %q", result.AOOTA.Code, domain.AOOTANotClassifiable)')
        checks.append(f'\t\t\t}}')
    else:
        # Missing AO → expect not_classifiable
        checks.append(f'\t\t\tif result.AOOTA == nil {{')
        checks.append(f'\t\t\t\tt.Fatal("AOOTA is nil, want not_classifiable")')
        checks.append(f'\t\t\t\treturn')
        checks.append(f'\t\t\t}}')
        checks.append(f'\t\t\tif result.AOOTA.Code != domain.AOOTANotClassifiable {{')
        checks.append(f'\t\t\t\tt.Errorf("AOOTA = %q, want %q", result.AOOTA.Code, domain.AOOTANotClassifiable)')
        checks.append(f'\t\t\t}}')

    # Bartonicek
    bart = expected.get('bartonicek')
    if bart:
        go_val = BARTONICEK_MAP[bart]
        checks.append(f'\t\t\tif result.Bartonicek == nil {{')
        checks.append(f'\t\t\t\tt.Fatal("Bartonicek is nil, want {bart}")')
        checks.append(f'\t\t\t\treturn')
        checks.append(f'\t\t\t}}')
        checks.append(f'\t\t\tif result.Bartonicek.Type != {go_val} {{')
        checks.append(f'\t\t\t\tt.Errorf("Bartonicek = %q, want %q", result.Bartonicek.Type, {go_val})')
        checks.append(f'\t\t\t}}')
    else:
        # Drawio "no clasificable": the engine reports no_posterior_fracture when the
        # posterior malleolus is not involved, not_classifiable otherwise.
        if branch in NO_POSTERIOR_BRANCHES:
            want, go_val = 'no_posterior_fracture', 'domain.BartonicekNoPosteriorFracture'
        else:
            want, go_val = 'not_classifiable', 'domain.BartonicekNotClassifiable'
        checks.append(f'\t\t\tif result.Bartonicek == nil {{')
        checks.append(f'\t\t\t\tt.Fatal("Bartonicek is nil, want {want}")')
        checks.append(f'\t\t\t\treturn')
        checks.append(f'\t\t\t}}')
        checks.append(f'\t\t\tif result.Bartonicek.Type != {go_val} {{')
        checks.append(f'\t\t\t\tt.Errorf("Bartonicek = %q, want %q", result.Bartonicek.Type, {go_val})')
        checks.append(f'\t\t\t}}')

    return '\n'.join(checks)


def sanitize_test_name(desc):
    """Convert description to a valid Go test name."""
    # Truncate and clean for readability
    name = desc.replace(' -> ', '_')
    name = re.sub(r'[^a-zA-Z0-9_]', '_', name)
    name = re.sub(r'_+', '_', name)
    name = name.strip('_')
    if len(name) > 120:
        name = name[:120]
    return name


def main():
    with open(INPUT_PATH) as f:
        test_cases = json.load(f)

    total = sum(len(cases) for cases in test_cases.values())
    print(f"Generating {total} test cases from {len(test_cases)} branches")

    lines = []
    lines.append('package rules')
    lines.append('')
    lines.append('// Code generated by scripts/generate_engine_tests.py from drawio test cases.')
    lines.append(f'// {total} test cases from {len(test_cases)} branches.')
    lines.append('// DO NOT EDIT.')
    lines.append('')
    lines.append('import (')
    lines.append('\t"testing"')
    lines.append('')
    lines.append('\t"github.com/jferrl/anklyze/internal/domain"')
    lines.append(')')
    lines.append('')

    errors = []
    skipped = []

    for branch in sorted(test_cases.keys()):
        cases = test_cases[branch]
        func_name = 'TestDrawio_' + ''.join(w.capitalize() for w in branch.split('_'))
        lines.append(f'func {func_name}(t *testing.T) {{')
        lines.append('\tengine := NewEngine()')
        lines.append('\tboolTrue := true')
        lines.append('\tboolFalse := false')
        lines.append('')

        for case in cases:
            test_id = case['id']
            desc = case['description']
            clicks = case['clicks']
            expected = case['expected']

            try:
                fields, bool_fields = clicks_to_input(clicks)
                fracture_type = determine_fracture_type(branch, fields)
                input_literal = build_input_literal(fields, bool_fields)
                expected_checks = build_expected_checks(expected, fracture_type, branch)

                test_name = sanitize_test_name(desc)
                lines.append(f'\tt.Run("{test_id}/{test_name}", func(t *testing.T) {{')
                reason = KNOWN_DISCREPANCIES.get(case['terminal_id'])
                if reason:
                    skipped.append(f"{test_id} ({case['terminal_id']}): {reason}")
                    lines.append(f'\t\tt.Skip({json.dumps("drawio/engine discrepancy: " + reason, ensure_ascii=False)})')
                lines.append(f'\t\tresult, err := engine.Classify(domain.FractureInput{{')
                lines.append(input_literal)
                lines.append(f'\t\t}})')
                lines.append(f'\t\tif err != nil {{')
                lines.append(f'\t\t\tt.Fatalf("Classify() error: %v", err)')
                lines.append(f'\t\t}}')
                lines.append(f'\t\tif result == nil {{')
                lines.append(f'\t\t\tt.Fatal("Classify() returned nil")')
                lines.append(f'\t\t\treturn')
                lines.append(f'\t\t}}')
                lines.append(expected_checks)
                lines.append(f'\t}})')
                lines.append('')
            except Exception as e:
                errors.append(f"{test_id}: {e}")
                lines.append(f'\t// SKIPPED {test_id}: {e}')
                lines.append('')

        # Suppress unused variable warnings when branch has no bool fields
        lines.append('\t_ = boolTrue')
        lines.append('\t_ = boolFalse')
        lines.append('}')
        lines.append('')

    with open(OUTPUT_PATH, 'w') as f:
        f.write('\n'.join(lines))
    try:
        subprocess.run(['gofmt', '-w', OUTPUT_PATH], check=True)
    except FileNotFoundError:
        print("WARNING: gofmt not found; output is not formatted")

    print(f"Generated {OUTPUT_PATH}")
    if skipped:
        print(f"\nSkipped known discrepancies ({len(skipped)}):")
        for s in skipped:
            print(f"  {s}")
    if errors:
        print(f"\nErrors ({len(errors)}):")
        for e in errors:
            print(f"  {e}")
    else:
        print("No errors")


if __name__ == '__main__':
    main()
