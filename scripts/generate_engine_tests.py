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
import sys
import re

INPUT_PATH = sys.argv[1] if len(sys.argv) > 1 else "/tmp/classification_test_cases.json"
OUTPUT_PATH = sys.argv[2] if len(sys.argv) > 2 else "internal/rules/engine_drawio_test.go"

# --- Label-to-domain-value mappings ---
# These map the normalized form labels (from parse_drawio_test_cases.py FORM_LABELS)
# to the Go domain constant values used in FractureInput.

INVOLVED_MALLEOLI = {
    'Maléolo posterior': 'domain.InvolvedPosteriorOnly',
    'Maléolo medial': 'domain.InvolvedMedialOnly',
    'Maléolo lateral': 'domain.InvolvedLateralOnly',
    'Maléolos medial y posterior': 'domain.InvolvedMedialPosterior',
    'Maléolos lateral y posterior': 'domain.InvolvedLateralPosterior',
    'Maléolos lateral y medial': 'domain.InvolvedLateralMedial',
    'Maléolos medial, lateral y posterior': 'domain.InvolvedTrimaleolar',
}

FIBULAR_LEVEL = {
    'Infrasindesmal': 'domain.FibularLevelInfrasindesmal',
    'Transindesmal': 'domain.FibularLevelTransindesmal',
    'Suprasindesmal': 'domain.FibularLevelSuprasindesmal',
}

LATERAL_MORPHOLOGY = {
    # 2-option form (lateral_only, lateral_posterior)
    'Transversa/Oblicua (Baja medial, alta lateral)/Conminuta': 'domain.LateralMorphologyOblique',
    'Espiroidea (Baja anterior, alta posterior)': 'domain.LateralMorphologySpiral',
    # 3-option form: lateral_medial
    'Transversa/Oblicua (Baja medial, alta lateral)': 'domain.LateralMorphologyTransverse',
    'Conminuta/ala de mariposa': None,  # branch-dependent: see map_lateral_morphology()
}

SUPRASINDESMAL_TYPE = {
    'Diafisaria Simple': 'domain.SuprasindesmalSimpleDiaphyseal',
    'Multifragmentaria': 'domain.SuprasindesmalMultifragmentary',
    'Proximal': 'domain.SuprasindesmalProximal',
}

FIBULA_TRACE = {
    'Parasindesmal de trazo oblicuo corto/transverso/conminuto': 'domain.FibulaTraceParasindesmoticShort',
    'Parasindesmal de trazo oblicuo largo/espiroideo': 'domain.FibulaTraceParasindesmoticLong',
    'Suprasindesmal (>6cm de superficie articular)': 'domain.FibulaTraceSuprasindesmoticFar',
}

ARTICULAR_INVOLVEMENT = {
    '>1/3 de superficie articular con extensión metafisaria': 'domain.ArticularLargeWithExtension',
    '<1/3 de superficie articular sin extensión metafisaria': 'domain.ArticularSmallWithoutExtension',
}

MEDIAL_MORPHOLOGY = {
    'Vertical': 'domain.MedialMorphologyVertical',
    'Transverso/oblicuo': 'domain.MedialMorphologyTransverse',
}

POSTERIOR_TYPE = {
    'Fragmento extraincisural': 'domain.PosteriorExtraincisural',
    'Fragmento posterolateral': 'domain.PosteriorPosterolateral',
    'Fragmento posteromedial y posterolateral': 'domain.PosteriorPosteromedialPosterolateral',
    'Gran fragmento triangular posterolateral': 'domain.PosteriorLargePosterolateral',
    'Fragmento extraincisural postero-medial': 'domain.PosteriorExtraincisuralPosteromedial',
}

INFRASINDESMAL_MORPHOLOGY = {
    'Avulsión punta del peroné': 'domain.LateralSubtypeAvulsion',
    'Fractura del maléolo': 'domain.LateralSubtypeMalleolusFracture',
}

LATERAL_SUBTYPE = {
    'Simple': 'domain.LateralSubtypeSimple',
    'Rotura de sindesmosis': 'domain.LateralSubtypeSyndesmosisRupture',
    'Ala de mariposa / cuña': 'domain.LateralSubtypeButterfly',
}

MEDIAL_SUBTYPE = {
    'Abierta mortaja': 'domain.MedialSubtypeOpenMortise',
    'Fractura del maléolo': 'domain.MedialSubtypeMalleolusFracture',
}

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
    'posterior_only_distal_tibia': 'distal_tibia',
    'posterior_only': 'unimaleolar_posterior',
    'medial_only_distal_tibia': 'distal_tibia',
    'medial_only': 'unimaleolar_medial',
    'lateral_only': 'unimaleolar_lateral',
    'medial_posterior': 'bimaleolar_medial_posterior',
    'lateral_posterior': 'bimaleolar_lateral_posterior',
    'lateral_medial': 'bimaleolar_lateral_medial',
    'trimaleolar': 'trimaleolar',
}


# Question patterns for matching drawio questions to input fields
# The drawio uses slightly different question text than the form labels,
# so we match on keywords.

def is_question(q, *keywords):
    """Check if question text contains all keywords (case-insensitive)."""
    ql = q.lower()
    return all(k.lower() in ql for k in keywords)


def map_lateral_morphology(label, branch):
    """Map lateral morphology label to Go constant, handling branch-dependent mapping."""
    if label == 'Conminuta/ala de mariposa':
        if branch == 'lateral_medial':
            return 'domain.LateralMorphologyConminuta'
        else:
            # trimaleolar: "Conminuta/ala de mariposa" maps to Oblique
            return 'domain.LateralMorphologyOblique'
    if label == 'Transversa/Oblicua (Baja medial, alta lateral)':
        return 'domain.LateralMorphologyTransverse'
    if label == 'Espiroidea (Baja anterior, alta posterior)':
        return 'domain.LateralMorphologySpiral'
    if label == 'Transversa/Oblicua (Baja medial, alta lateral)/Conminuta':
        return 'domain.LateralMorphologyOblique'
    raise ValueError(f"Unknown lateral morphology label: {label}")


def clicks_to_input(clicks, branch):
    """Convert a test case's clicks array to FractureInput field assignments."""
    fields = {}
    bool_fields = {}

    for i, click in enumerate(clicks):
        q = click['question']
        label = click.get('label')
        if label is None:
            continue

        # Involved malleoli
        if is_question(q, 'maleolos', 'fracturados'):
            fields['InvolvedMalleoli'] = INVOLVED_MALLEOLI[label]

        # Articular involvement (posterior-only, medial-only)
        elif is_question(q, 'afectación') and not is_question(q, 'articular', 'extensión'):
            fields['ArticularInvolvement'] = ARTICULAR_INVOLVEMENT[label]

        # Articular involvement medial (has important articular involvement?)
        elif is_question(q, 'importante', 'afectación', 'articular'):
            if label == 'Sí':
                fields['ArticularInvolvement'] = 'domain.ArticularLargeWithExtension'
            else:
                fields['ArticularInvolvement'] = 'domain.ArticularSmallWithoutExtension'

        # Articular depression
        elif is_question(q, 'depresión articular') or is_question(q, 'depresión articular'):
            bool_fields['HasArticularDepression'] = YES_NO[label]

        # CT scan
        elif is_question(q, 'tac'):
            bool_fields['HasCTScan'] = YES_NO[label]

        # Posterior fracture type (Bartonicek)
        elif is_question(q, 'tipo', 'fractura') and 'posterior' in q.lower():
            fields['PosteriorFractureType'] = POSTERIOR_TYPE[label]

        elif is_question(q, 'tipo', 'fractura') and q.strip() in (
            '¿Qué tipo de fractura es?',
        ):
            fields['PosteriorFractureType'] = POSTERIOR_TYPE[label]

        # Posterior morphology (for lateral_posterior infrasindesmal CT path)
        # Question: "¿Cuál es la morfología del maleolo posterior?" → maps to PosteriorFractureType
        elif is_question(q, 'morfología', 'posterior'):
            if label in POSTERIOR_TYPE:
                fields['PosteriorFractureType'] = POSTERIOR_TYPE[label]

        # Medial morphology
        elif is_question(q, 'morfología') and is_question(q, 'medial'):
            fields['MedialMorphology'] = MEDIAL_MORPHOLOGY[label]

        elif q.strip() == '¿Qué morfología tiene?':
            fields['MedialMorphology'] = MEDIAL_MORPHOLOGY[label]

        # Fibular level
        elif is_question(q, 'nivel') and is_question(q, 'fractura'):
            val = FIBULAR_LEVEL.get(label)
            if val:
                if branch == 'lateral_medial' and fields.get('MedialMorphology') == 'domain.MedialMorphologyTransverse':
                    # For transverse_oblique medial + fibular level question,
                    # this goes to FibularLevel (not FibularLevelForTransverse)
                    fields['FibularLevel'] = val
                else:
                    fields['FibularLevel'] = val

        # Fibula infrasindesmal transverse (lateral_medial, yes/no)
        elif is_question(q, 'peroné', 'infrasindesmal'):
            bool_fields['FibulaInfrasindesmalTransverse'] = YES_NO[label]

        # Lateral morphology (fibula morphology)
        # Note: lateral_only infrasindesmal uses the SAME question for infrasindesmal morphology
        elif is_question(q, 'morfología') and (
            is_question(q, 'fractura del peroné') or
            (is_question(q, 'fractura') and not is_question(q, 'medial') and not is_question(q, 'posterior'))
        ):
            if label in INFRASINDESMAL_MORPHOLOGY:
                fields['InfrasindesmalMorphology'] = INFRASINDESMAL_MORPHOLOGY[label]
            else:
                fields['LateralMorphology'] = map_lateral_morphology(label, branch)

        # Suprasindesmal type
        elif q.strip() == '¿De qué tipo?':
            # Could be suprasindesmal type or lateral subtype
            # Check context: if previous click was a fibula trace or suprasindesmal level
            prev_labels = [clicks[j]['label'] for j in range(max(0, i-3), i) if clicks[j].get('label')]
            if any('Suprasindesmal' in pl or 'Proximal' in pl or 'Diafisaria' in pl or 'Multifragmentaria' in pl
                   for pl in prev_labels):
                fields['SuprasindesmalType'] = SUPRASINDESMAL_TYPE.get(label, f'UNKNOWN:{label}')
            elif label in SUPRASINDESMAL_TYPE:
                fields['SuprasindesmalType'] = SUPRASINDESMAL_TYPE[label]
            elif label in LATERAL_SUBTYPE:
                fields['LateralSubtype'] = LATERAL_SUBTYPE[label]

        # Fibula trace pattern
        elif is_question(q, 'trazo') and is_question(q, 'peroné'):
            fields['FibulaTracePattern'] = FIBULA_TRACE[label]

        # Infrasindesmal morphology (avulsion vs malleolus)
        elif is_question(q, 'maleolo lateral') or is_question(q, 'maléolo lateral'):
            fields['InfrasindesmalMorphology'] = INFRASINDESMAL_MORPHOLOGY[label]

        # Medial subtype (open mortise vs malleolus fracture)
        elif is_question(q, 'maleolo medial') or is_question(q, 'maléolo medial'):
            if label in MEDIAL_SUBTYPE:
                fields['MedialSubtype'] = MEDIAL_SUBTYPE[label]

        # Posterior posteromedial
        elif is_question(q, 'posterior', 'posteromedial'):
            bool_fields['IsPosteriorPosteromedial'] = YES_NO[label]

        # Fibula head shortening (Maisonneuve)
        elif is_question(q, 'acortamiento') and is_question(q, 'cabeza', 'peroné'):
            bool_fields['HasFibulaHeadShortening'] = YES_NO[label]

    return fields, bool_fields


def determine_fracture_type(branch, fields):
    """Determine expected fracture_type based on branch and articular involvement."""
    if branch in ('posterior_only', 'medial_only'):
        if fields.get('ArticularInvolvement') == 'domain.ArticularLargeWithExtension':
            return 'distal_tibia'
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


def build_expected_checks(expected, fracture_type):
    """Build Go assertion statements for expected classification results."""
    checks = []

    # Fracture type
    checks.append(f'\t\t\tif result.FractureType != "{fracture_type}" {{')
    checks.append(f'\t\t\t\tt.Errorf("FractureType = %q, want %q", result.FractureType, "{fracture_type}")')
    checks.append('\t\t\t}')

    # Weber
    weber = expected.get('weber')
    if weber:
        go_val = WEBER_MAP[weber]
        checks.append(f'\t\t\tif result.DanisWeber == nil {{')
        checks.append(f'\t\t\t\tt.Fatal("DanisWeber is nil, want {weber}")')
        checks.append(f'\t\t\t}}')
        checks.append(f'\t\t\tif result.DanisWeber.Type != {go_val} {{')
        checks.append(f'\t\t\t\tt.Errorf("DanisWeber = %q, want %q", result.DanisWeber.Type, {go_val})')
        checks.append(f'\t\t\t}}')
    else:
        checks.append(f'\t\t\tif result.DanisWeber != nil {{')
        checks.append(f'\t\t\t\tt.Errorf("DanisWeber = %q, want nil", result.DanisWeber.Type)')
        checks.append(f'\t\t\t}}')

    # Lauge-Hansen
    lh = expected.get('lauge_hansen')
    if lh and lh != 'no clasificable':
        go_val = LH_MAP[lh]
        checks.append(f'\t\t\tif result.LaugeHansen == nil {{')
        checks.append(f'\t\t\t\tt.Fatal("LaugeHansen is nil, want {lh}")')
        checks.append(f'\t\t\t}}')
        checks.append(f'\t\t\tif result.LaugeHansen.Type != {go_val} {{')
        checks.append(f'\t\t\t\tt.Errorf("LaugeHansen = %q, want %q", result.LaugeHansen.Type, {go_val})')
        checks.append(f'\t\t\t}}')
    else:
        checks.append(f'\t\t\tif result.LaugeHansen != nil {{')
        checks.append(f'\t\t\t\tt.Errorf("LaugeHansen = %q, want nil", result.LaugeHansen.Type)')
        checks.append(f'\t\t\t}}')

    # AO/OTA
    ao = expected.get('ao')
    if ao and ao != 'no clasificable' and ao != 'clasificable':
        go_val = AO_CODE_MAP.get(ao)
        if go_val:
            checks.append(f'\t\t\tif result.AOOTA == nil {{')
            checks.append(f'\t\t\t\tt.Fatal("AOOTA is nil, want {ao}")')
            checks.append(f'\t\t\t}}')
            checks.append(f'\t\t\tif result.AOOTA.Code != {go_val} {{')
            checks.append(f'\t\t\t\tt.Errorf("AOOTA = %q, want %q", result.AOOTA.Code, {go_val})')
            checks.append(f'\t\t\t}}')
        else:
            checks.append(f'\t\t\t// TODO: unknown AO code "{ao}"')
    else:
        # "no clasificable" or nil → expect AOOTA to be nil
        checks.append(f'\t\t\tif result.AOOTA != nil {{')
        checks.append(f'\t\t\t\tt.Errorf("AOOTA = %q, want nil", result.AOOTA.Code)')
        checks.append(f'\t\t\t}}')

    # Bartonicek
    bart = expected.get('bartonicek')
    if bart:
        go_val = BARTONICEK_MAP[bart]
        checks.append(f'\t\t\tif result.Bartonicek == nil {{')
        checks.append(f'\t\t\t\tt.Fatal("Bartonicek is nil, want {bart}")')
        checks.append(f'\t\t\t}}')
        checks.append(f'\t\t\tif result.Bartonicek.Type != {go_val} {{')
        checks.append(f'\t\t\t\tt.Errorf("Bartonicek = %q, want %q", result.Bartonicek.Type, {go_val})')
        checks.append(f'\t\t\t}}')
    else:
        checks.append(f'\t\t\tif result.Bartonicek != nil {{')
        checks.append(f'\t\t\t\tt.Errorf("Bartonicek = %q, want nil", result.Bartonicek.Type)')
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
                fields, bool_fields = clicks_to_input(clicks, branch)
                fracture_type = determine_fracture_type(branch, fields)
                input_literal = build_input_literal(fields, bool_fields)
                expected_checks = build_expected_checks(expected, fracture_type)

                test_name = sanitize_test_name(desc)
                lines.append(f'\tt.Run("{test_id}/{test_name}", func(t *testing.T) {{')
                lines.append(f'\t\tresult, err := engine.Classify(domain.FractureInput{{')
                lines.append(input_literal)
                lines.append(f'\t\t}})')
                lines.append(f'\t\tif err != nil {{')
                lines.append(f'\t\t\tt.Fatalf("Classify() error: %v", err)')
                lines.append(f'\t\t}}')
                lines.append(f'\t\tif result == nil {{')
                lines.append(f'\t\t\tt.Fatal("Classify() returned nil")')
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

    print(f"Generated {OUTPUT_PATH}")
    if errors:
        print(f"\nErrors ({len(errors)}):")
        for e in errors:
            print(f"  {e}")
    else:
        print("No errors")


if __name__ == '__main__':
    main()
