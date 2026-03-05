#!/usr/bin/env python3
"""Generate chat classification test cases from the drawio-parsed form test cases.

For each form test case (a sequence of clicks), this script generates:
1. A COMPLETE test case: natural language description covering ALL fields
   -> LLM should extract everything, no clarification needed
2. A PARTIAL test case: description with only the first 1-2 fields
   -> LLM should ask clarification questions for the remaining fields

Usage:
    python3 scripts/generate_chat_test_cases.py [input_path] [output_path]

Defaults:
    input_path:  /tmp/chat_test_cases_raw.json  (from parse_drawio_test_cases.py)
    output_path: /tmp/chat_classification_test_cases.json
"""

import json
import sys
import random

INPUT_PATH = sys.argv[1] if len(sys.argv) > 1 else "/tmp/chat_test_cases_raw.json"
OUTPUT_PATH = sys.argv[2] if len(sys.argv) > 2 else "/tmp/chat_classification_test_cases.json"

# --- Natural language templates for generating descriptions ---

# Map from drawio option labels to natural language phrases (English)
MALLEOLI_MAP = {
    "Maleolo posterior": ("posterior malleolus fracture", "posterior_only"),
    "Maleolo medial": ("medial malleolus fracture", "medial_only"),
    "Maleolo lateral": ("lateral malleolus fracture", "lateral_only"),
    "Maleolos medial y posterior": ("bimalleolar fracture involving medial and posterior malleoli", "medial_posterior"),
    "Maleolos lateral y posterior": ("bimalleolar fracture involving lateral and posterior malleoli", "lateral_posterior"),
    "Maleolos lateral y medial": ("bimalleolar fracture involving lateral and medial malleoli", "lateral_medial"),
    "maleolos medial, lateral y posterior": ("trimaleolar fracture", "trimaleolar"),
}

ARTICULAR_INVOLVEMENT_MAP = {
    ">1/3 de superficie articular con extensión metafisaria": "with more than one-third articular surface involvement and metaphyseal extension",
    "<1/3 de superficie articular sin extensión metafisaria": "with less than one-third articular surface involvement, no metaphyseal extension",
}

ARTICULAR_DEPRESSION_MAP = {
    "Sí": "articular depression present",
    "No": "no articular depression",
}

MEDIAL_MORPHOLOGY_MAP = {
    "Vertical": "vertical fracture line",
    "Transverso/oblicuo": "transverse/oblique fracture line",
}

FIBULAR_LEVEL_MAP = {
    "Infrasindesmal": "below the syndesmosis (infrasyndesmal)",
    "Transindesmal": "at the syndesmosis level (transyndesmal)",
    "Suprasindesmal": "above the syndesmosis (suprasyndesmal)",
    "Alta (Suprasindesmal)": "above the syndesmosis (suprasyndesmal, high fibula)",
    "Baja (Transindesmal / Infrasindesmal)": "at or below the syndesmosis level",
}

LATERAL_MORPHOLOGY_MAP = {
    "Espiroidea (Baja anterior, alta posterior)": "spiral fracture pattern",
    "Transversa/Oblicua (Baja medial, alta lateral)/Conminuta": "oblique/transverse fracture pattern",
    "Transversa": "transverse fracture pattern",
    "Oblicua (Baja medial, alta lateral)/Conminuta": "oblique/comminuted fracture pattern",
}

SUPRASINDESMAL_TYPE_MAP = {
    "Diafisaria Simple": "simple diaphyseal type",
    "Multifragmentaria": "multifragmentary type",
    "Proximal": "proximal fibula (Maisonneuve)",
}

TRACE_PATTERN_MAP = {
    "Parasindesmal de trazo oblicuo corto/transverso/conminuto": "short oblique/transverse parasyndesmotic trace",
    "Parasindesmal de trazo oblicuo largo/espiroideo": "long oblique/spiral parasyndesmotic trace",
    "Suprasindesmal (>6cm de superficie articular)": "suprasyndesmotic trace more than 6cm from articular surface",
}

CT_SCAN_MAP = {
    "Sí": "CT scan available",
    "No": "no CT scan available",
}

POSTERIOR_TYPE_MAP = {
    "Fragmento extraincisural": "Bartonicek type 1 (extraincisural fragment)",
    "Fragmento posterolateral": "Bartonicek type 2 (posterolateral fragment)",
    "Fragmento posteromedial y posterolateral": "Bartonicek type 3 (posteromedial and posterolateral)",
    "Gran fragmento triangular posterolateral": "Bartonicek type 4 (large triangular posterolateral fragment)",
    "Fragmento extraincisural postero-medial": "extraincisural posteromedial fragment",
}

POSTERIOR_POSTEROMEDIAL_MAP = {
    "Sí": "posterior fragment is posteromedial",
    "No": "posterior fragment is not posteromedial",
}

FIBULA_INFRA_TRANSVERSE_MAP = {
    "Sí": "fibula fracture is infrasyndesmal and transverse",
    "No": "fibula fracture is not infrasyndesmal transverse",
}

FIBULAR_LEVEL_TRANSVERSE_MAP = {
    "Infrasindesmal": "infrasyndesmal level",
    "Transindesmal": "transyndesmal level",
}

INFRA_MORPHOLOGY_MAP = {
    "Avulsión punta del peroné": "avulsion of the fibular tip",
    "Fractura del maléolo": "lateral malleolus fracture (not avulsion)",
}

MEDIAL_SUBTYPE_MAP = {
    "Abierta mortaja": "open mortise",
    "Fractura del maléolo": "medial malleolus fracture",
}

FIBULA_HEAD_MAP = {
    "Sí": "with fibula head shortening",
    "No": "without fibula head shortening",
}

LATERAL_SUBTYPE_MAP = {
    "Simple": "simple fracture",
    "Rotura de sindesmosis": "with syndesmosis rupture",
    "Ala de mariposa / cuña": "butterfly/wedge pattern",
}

ARTICULAR_MEDIAL_MAP = {
    "Sí": "with significant articular involvement and metaphyseal extension",
    "No": "without significant articular involvement",
}

# Map questions to their label-to-NL maps
QUESTION_MAP = {
    "¿Qué maleolos tiene fracturados?": MALLEOLI_MAP,
    "¿Cuál es la afectación?": ARTICULAR_INVOLVEMENT_MAP,
    "¿Existe depresión articular?": ARTICULAR_DEPRESSION_MAP,
    "¿Qué morfología tiene?": MEDIAL_MORPHOLOGY_MAP,
    "¿De qué morfología es la fractura del maleolo medial?": MEDIAL_MORPHOLOGY_MAP,
    "¿De qué morfología es la fractura del maléolo medial?": MEDIAL_MORPHOLOGY_MAP,
    "¿A qué nivel está la fractura?": FIBULAR_LEVEL_MAP,
    "¿A qué nivel está la fractura de peroné?": FIBULAR_LEVEL_MAP,
    "¿De qué morfología es la fractura?": LATERAL_MORPHOLOGY_MAP,
    "¿De qué morfología es la fractura del peroné?": LATERAL_MORPHOLOGY_MAP,
    "¿De qué tipo?": SUPRASINDESMAL_TYPE_MAP,  # may also be lateral_subtype, handled below
    "¿Cómo es el trazo principal del peroné?": TRACE_PATTERN_MAP,
    "¿Cuál es el patrón de fractura del peroné?": TRACE_PATTERN_MAP,
    "¿Tiene TAC?": CT_SCAN_MAP,
    "¿Qué tipo de fractura es?": POSTERIOR_TYPE_MAP,
    "¿El fragmento posterior es posteromedial?": POSTERIOR_POSTEROMEDIAL_MAP,
    "¿La fractura del peroné es infrasindesmal?": FIBULA_INFRA_TRANSVERSE_MAP,
    "¿La fractura del peroné es infrasindesmal y transversa?": FIBULA_INFRA_TRANSVERSE_MAP,
    "¿A qué nivel está la fractura del peroné?": FIBULAR_LEVEL_TRANSVERSE_MAP,
    "¿Cómo es el maleolo lateral?": INFRA_MORPHOLOGY_MAP,
    "¿Cómo es el maléolo lateral?": INFRA_MORPHOLOGY_MAP,
    "¿Cómo es el maleolo medial?": MEDIAL_SUBTYPE_MAP,
    "¿Cómo es el maléolo medial?": MEDIAL_SUBTYPE_MAP,
    "¿Tiene acortamiento de la cabeza del peroné?": FIBULA_HEAD_MAP,
    "¿Tiene importante afectación articular con extensión metafisaria?": ARTICULAR_MEDIAL_MAP,
    # Drawio question variants
    "¿Qué tipo de fractura es el maleolo posterior?": POSTERIOR_TYPE_MAP,
    "¿Cuál es la morfología del maleolo posterior?": POSTERIOR_TYPE_MAP,
    "¿Cómo es el trazo del peroné?": TRACE_PATTERN_MAP,
    "¿Acortamiento a nivel de cabeza de peroné?": FIBULA_HEAD_MAP,
    "¿Presenta depresión articular?": ARTICULAR_DEPRESSION_MAP,
    "¿Tiene depresión articular?": ARTICULAR_DEPRESSION_MAP,
}

# --- Field mapping: question -> extraction field name ---
QUESTION_TO_FIELD = {
    "¿Qué maleolos tiene fracturados?": "involved_malleoli",
    "¿Cuál es la afectación?": "articular_involvement",
    "¿Existe depresión articular?": "has_articular_depression",
    "¿Qué morfología tiene?": "medial_morphology",
    "¿De qué morfología es la fractura del maleolo medial?": "medial_morphology",
    "¿De qué morfología es la fractura del maléolo medial?": "medial_morphology",
    "¿A qué nivel está la fractura?": "fibular_level",
    "¿A qué nivel está la fractura de peroné?": "fibular_level",
    "¿De qué morfología es la fractura?": "lateral_morphology",
    "¿De qué morfología es la fractura del peroné?": "lateral_morphology",
    "¿De qué tipo?": "suprasindesmal_type",  # context-dependent
    "¿Cómo es el trazo principal del peroné?": "fibula_trace_pattern",
    "¿Cuál es el patrón de fractura del peroné?": "fibula_trace_pattern",
    "¿Tiene TAC?": "has_ct_scan",
    "¿Qué tipo de fractura es?": "posterior_fracture_type",
    "¿El fragmento posterior es posteromedial?": "is_posterior_posteromedial",
    "¿La fractura del peroné es infrasindesmal?": "fibula_infrasindesmal_transverse",
    "¿La fractura del peroné es infrasindesmal y transversa?": "fibula_infrasindesmal_transverse",
    "¿A qué nivel está la fractura del peroné?": "fibular_level_for_transverse",
    "¿Cómo es el maleolo lateral?": "infrasindesmal_morphology",
    "¿Cómo es el maléolo lateral?": "infrasindesmal_morphology",
    "¿Cómo es el maleolo medial?": "medial_subtype",
    "¿Cómo es el maléolo medial?": "medial_subtype",
    "¿Tiene acortamiento de la cabeza del peroné?": "has_fibula_head_shortening",
    "¿Tiene importante afectación articular con extensión metafisaria?": "articular_involvement",
    # Drawio question variants
    "¿Qué tipo de fractura es el maleolo posterior?": "posterior_fracture_type",
    "¿Cuál es la morfología del maleolo posterior?": "posterior_fracture_type",
    "¿Cómo es el trazo del peroné?": "fibula_trace_pattern",
    "¿Acortamiento a nivel de cabeza de peroné?": "has_fibula_head_shortening",
    "¿Presenta depresión articular?": "has_articular_depression",
    "¿Tiene depresión articular?": "has_articular_depression",
}

# Map form labels to extraction field values
LABEL_TO_FIELD_VALUE = {
    # Malleoli
    "Maleolo posterior": "posterior_only",
    "Maleolo medial": "medial_only",
    "Maleolo lateral": "lateral_only",
    "Maleolos medial y posterior": "medial_posterior",
    "Maleolos lateral y posterior": "lateral_posterior",
    "Maleolos lateral y medial": "lateral_medial",
    "maleolos medial, lateral y posterior": "trimaleolar",
    # Articular involvement
    ">1/3 de superficie articular con extensión metafisaria": "large_with_extension",
    "<1/3 de superficie articular sin extensión metafisaria": "small_without_extension",
    # Boolean yes/no (context-dependent)
    "Sí": True,
    "No": False,
    # Medial morphology
    "Vertical": "vertical",
    "Transverso/oblicuo": "transverse_oblique",
    # Fibular level
    "Infrasindesmal": "infrasindesmal",
    "Transindesmal": "transindesmal",
    "Suprasindesmal": "suprasindesmal",
    "Alta (Suprasindesmal)": "suprasindesmal",
    "Baja (Transindesmal / Infrasindesmal)": "transindesmal",
    # Lateral morphology
    "Espiroidea (Baja anterior, alta posterior)": "spiral",
    "Transversa/Oblicua (Baja medial, alta lateral)/Conminuta": "oblique",
    "Transversa": "transverse",
    "Oblicua (Baja medial, alta lateral)/Conminuta": "oblique",
    # Suprasindesmal type
    "Diafisaria Simple": "simple_diaphyseal",
    "Multifragmentaria": "multifragmentary",
    "Proximal": "proximal",
    # Trace pattern
    "Parasindesmal de trazo oblicuo corto/transverso/conminuto": "parasindesmotic_short",
    "Parasindesmal de trazo oblicuo largo/espiroideo": "parasindesmotic_long",
    "Suprasindesmal (>6cm de superficie articular)": "suprasindesmotic_far",
    # Posterior fracture type
    "Fragmento extraincisural": "extraincisural",
    "Fragmento posterolateral": "posterolateral",
    "Fragmento posteromedial y posterolateral": "posteromedial_posterolateral",
    "Gran fragmento triangular posterolateral": "large_posterolateral",
    "Fragmento extraincisural postero-medial": "extraincisural_posteromedial",
    # Infrasindesmal morphology
    "Avulsión punta del peroné": "avulsion",
    "Fractura del maléolo": "malleolus_fracture",
    # Medial subtype
    "Abierta mortaja": "open_mortise",
    # Lateral subtype
    "Simple": "simple",
    "Rotura de sindesmosis": "syndesmosis_rupture",
    "Ala de mariposa / cuña": "butterfly",
}

# For "¿De qué tipo?" which can mean suprasindesmal_type OR lateral_subtype
LATERAL_SUBTYPE_LABELS = {"Simple", "Rotura de sindesmosis", "Ala de mariposa / cuña",
                          "Fractura simple"}


def get_nl_for_click(question, label, prev_clicks):
    """Get natural language phrase for a click, handling context-dependent questions."""
    if label is None:
        return None

    # Special handling for "¿De qué tipo?" which can be suprasindesmal_type or lateral_subtype
    if question == "¿De qué tipo?":
        if label in LATERAL_SUBTYPE_LABELS:
            nl = LATERAL_SUBTYPE_MAP.get(label)
            if nl:
                return nl

    # Check main question map
    label_map = QUESTION_MAP.get(question)
    if label_map:
        if isinstance(label_map, dict):
            # For malleoli, return tuple[0] (NL phrase)
            val = label_map.get(label)
            if isinstance(val, tuple):
                return val[0]
            if val:
                return val

    return label


def get_field_and_value(question, label, prev_clicks):
    """Get the extraction field name and value for a click."""
    if label is None:
        return None, None

    field = QUESTION_TO_FIELD.get(question)
    if not field:
        return None, None

    # Context-dependent: "¿De qué tipo?" can be lateral_subtype
    if question == "¿De qué tipo?" and label in LATERAL_SUBTYPE_LABELS:
        field = "lateral_subtype"

    # Context-dependent: articular involvement yes/no maps to string values, not booleans
    if field == "articular_involvement" and label in ("Sí", "No"):
        value = "large_with_extension" if label == "Sí" else "small_without_extension"
        return field, value

    value = LABEL_TO_FIELD_VALUE.get(label, label)

    return field, value


def build_complete_description(clicks):
    """Build a complete natural language description from all clicks."""
    parts = []
    for i, click in enumerate(clicks):
        q = click["question"]
        label = click["label"]
        if label is None or q == "Clasificar Fractura":
            continue
        nl = get_nl_for_click(q, label, clicks[:i])
        if nl:
            parts.append(nl)
    return ", ".join(parts) if parts else "ankle fracture"


def build_partial_description(clicks, n_fields=1):
    """Build a partial description with only the first N fields."""
    parts = []
    count = 0
    for i, click in enumerate(clicks):
        q = click["question"]
        label = click["label"]
        if label is None or q == "Clasificar Fractura":
            continue
        if count >= n_fields:
            break
        nl = get_nl_for_click(q, label, clicks[:i])
        if nl:
            parts.append(nl)
        count += 1
    return ", ".join(parts) if parts else "ankle fracture"


def build_expected_extraction(clicks):
    """Build the expected extraction dict from clicks."""
    result = {}
    for i, click in enumerate(clicks):
        q = click["question"]
        label = click["label"]
        if label is None or q == "Clasificar Fractura":
            continue
        field, value = get_field_and_value(q, label, clicks[:i])
        if field and value is not None:
            result[field] = value
    return result


def build_clarification_answers(clicks, n_skip=1):
    """Build clarification answers for fields not in the partial description.

    Returns a dict of field -> option text that the LLM might present.
    """
    answers = {}
    count = 0
    for i, click in enumerate(clicks):
        q = click["question"]
        label = click["label"]
        if label is None or q == "Clasificar Fractura":
            continue
        count += 1
        if count <= n_skip:
            continue  # These are in the description
        field, _ = get_field_and_value(q, label, clicks[:i])
        if field:
            # Use the NL phrase as the clarification answer
            nl = get_nl_for_click(q, label, clicks[:i])
            answers[field] = nl if nl else label
    return answers


def normalize_expected(expected):
    """Normalize the drawio expected values to match engine output format."""
    result = {}

    # Lauge-Hansen
    lh = expected.get("lauge_hansen")
    if lh and lh != "no clasificable":
        result["lauge_hansen"] = lh
    elif lh == "no clasificable":
        result["lauge_hansen"] = None
    else:
        result["lauge_hansen"] = None

    # Danis-Weber
    weber = expected.get("weber")
    if weber:
        result["weber"] = f"Weber {weber}"
    else:
        result["weber"] = None

    # AO/OTA
    ao = expected.get("ao")
    if ao and ao not in ("no clasificable", "clasificable"):
        result["ao_ota"] = ao
    else:
        result["ao_ota"] = None

    # Bartonicek
    bart = expected.get("bartonicek")
    if bart:
        result["bartonicek"] = f"Bartonicek {bart}"
    else:
        result["bartonicek"] = None

    return result


# --- Main ---

with open(INPUT_PATH) as f:
    raw_data = json.load(f)

chat_test_cases = {
    "complete": [],     # Full descriptions, no clarification needed
    "partial": [],      # Partial descriptions, clarification needed
    "spanish": [],      # Spanish language descriptions
    "edge_cases": [],   # Edge cases (ambiguous, minimal)
}

# Spanish description templates
MALLEOLI_MAP_ES = {
    "posterior_only": "fractura aislada del maleolo posterior",
    "medial_only": "fractura aislada del maleolo medial",
    "lateral_only": "fractura del maleolo lateral",
    "medial_posterior": "fractura bimaleolar de maleolos medial y posterior",
    "lateral_posterior": "fractura bimaleolar de maleolos lateral y posterior",
    "lateral_medial": "fractura bimaleolar de maleolos lateral y medial",
    "trimaleolar": "fractura trimaleolar",
}

FIBULAR_LEVEL_ES = {
    "infrasindesmal": "por debajo de la sindesmosis",
    "transindesmal": "a nivel de la sindesmosis",
    "suprasindesmal": "por encima de la sindesmosis",
}

MORPHOLOGY_ES = {
    "spiral": "patrón espiroideo",
    "oblique": "patrón oblicuo",
    "transverse": "patrón transverso",
    "vertical": "trazo vertical",
    "transverse_oblique": "trazo transverso/oblicuo",
}

SUPRATYPE_ES = {
    "simple_diaphyseal": "diafisaria simple",
    "multifragmentary": "multifragmentaria",
    "proximal": "fractura proximal del peroné (Maisonneuve)",
}

TRACE_ES = {
    "parasindesmotic_short": "trazo oblicuo corto/transverso parasindesmal",
    "parasindesmotic_long": "trazo oblicuo largo/espiroideo parasindesmal",
    "suprasindesmotic_far": "suprasindesmal a más de 6cm de la superficie articular",
}


def build_spanish_description(extraction):
    """Build a Spanish natural language description from extraction fields."""
    parts = []
    malleoli = extraction.get("involved_malleoli")
    if malleoli:
        parts.append(MALLEOLI_MAP_ES.get(malleoli, malleoli))

    level = extraction.get("fibular_level")
    if level:
        parts.append(f"peroné {FIBULAR_LEVEL_ES.get(level, level)}")

    morph = extraction.get("lateral_morphology")
    if morph:
        parts.append(MORPHOLOGY_ES.get(morph, morph))

    med_morph = extraction.get("medial_morphology")
    if med_morph:
        parts.append(f"maleolo medial con {MORPHOLOGY_ES.get(med_morph, med_morph)}")

    supra = extraction.get("suprasindesmal_type")
    if supra:
        parts.append(SUPRATYPE_ES.get(supra, supra))

    trace = extraction.get("fibula_trace_pattern")
    if trace:
        parts.append(TRACE_ES.get(trace, trace))

    ct = extraction.get("has_ct_scan")
    if ct is True:
        parts.append("con TAC disponible")
    elif ct is False:
        parts.append("sin TAC")

    post = extraction.get("posterior_fracture_type")
    if post:
        bart_map = {
            "extraincisural": "Bartonicek tipo 1",
            "posterolateral": "Bartonicek tipo 2",
            "posteromedial_posterolateral": "Bartonicek tipo 3",
            "large_posterolateral": "Bartonicek tipo 4",
            "extraincisural_posteromedial": "fragmento extraincisural posteromedial",
        }
        parts.append(bart_map.get(post, post))

    return ", ".join(parts) if parts else "fractura de tobillo"


for branch, cases in raw_data.items():
    for case in cases:
        clicks = case["clicks"]
        expected_raw = case["expected"]
        expected = normalize_expected(expected_raw)
        extraction = build_expected_extraction(clicks)

        # 1. Complete description (English)
        full_desc = build_complete_description(clicks)
        chat_test_cases["complete"].append({
            "test_id": f"chat_complete_{case['id']}",
            "branch": branch,
            "description": full_desc,
            "language": "en",
            "expected_extraction": extraction,
            "clarification_answers": {},
            "expected": expected,
            "form_test_id": case["id"],
        })

        # 2. Partial description (English) - only first field
        partial_desc = build_partial_description(clicks, n_fields=1)
        clar_answers = build_clarification_answers(clicks, n_skip=1)
        if clar_answers:  # Only add if there ARE fields to clarify
            chat_test_cases["partial"].append({
                "test_id": f"chat_partial_{case['id']}",
                "branch": branch,
                "description": partial_desc,
                "language": "en",
                "expected_extraction": {k: v for k, v in extraction.items()
                                       if k == "involved_malleoli" or k == list(extraction.keys())[0]},
                "clarification_answers": clar_answers,
                "expected": expected,
                "form_test_id": case["id"],
            })

    # 3. Spanish descriptions (one complete per branch, first case)
    first_case = cases[0]
    clicks = first_case["clicks"]
    expected_raw = first_case["expected"]
    expected = normalize_expected(expected_raw)
    extraction = build_expected_extraction(clicks)
    es_desc = build_spanish_description(extraction)

    chat_test_cases["spanish"].append({
        "test_id": f"chat_es_{branch}_1",
        "branch": branch,
        "description": es_desc,
        "language": "es",
        "expected_extraction": extraction,
        "clarification_answers": {},
        "expected": expected,
        "form_test_id": first_case["id"],
    })

# 4. Edge cases
edge_cases = [
    {
        "test_id": "chat_edge_vague",
        "branch": "unknown",
        "description": "ankle fracture after twisting injury",
        "language": "en",
        "expected_extraction": {},
        "clarification_answers": {"involved_malleoli": "lateral malleolus fracture"},
        "expected_behavior": "should_ask_involved_malleoli",
        "expected": None,
    },
    {
        "test_id": "chat_edge_very_vague",
        "branch": "unknown",
        "description": "broken ankle",
        "language": "en",
        "expected_extraction": {},
        "clarification_answers": {"involved_malleoli": "trimaleolar fracture"},
        "expected_behavior": "should_ask_involved_malleoli",
        "expected": None,
    },
    {
        "test_id": "chat_edge_mixed_language",
        "branch": "lateral_only",
        "description": "fractura del perone a nivel transindesmal, spiral pattern",
        "language": "en",
        "expected_extraction": {
            "involved_malleoli": "lateral_only",
            "fibular_level": "transindesmal",
            "lateral_morphology": "spiral",
        },
        "clarification_answers": {"lateral_subtype": "simple fracture"},
        "expected": {
            "lauge_hansen": "SER",
            "weber": "Weber B",
            "ao_ota": "44-B1.1",
            "bartonicek": None,
        },
    },
    {
        "test_id": "chat_edge_synonyms",
        "branch": "lateral_only",
        "description": "fibula fracture at the level of the tibiofibular joint, twisting fracture pattern",
        "language": "en",
        "expected_extraction": {
            "involved_malleoli": "lateral_only",
            "fibular_level": "transindesmal",
            "lateral_morphology": "spiral",
        },
        "clarification_answers": {"lateral_subtype": "simple fracture"},
        "expected": {
            "lauge_hansen": "SER",
            "weber": "Weber B",
            "ao_ota": "44-B1.1",
            "bartonicek": None,
        },
    },
    {
        "test_id": "chat_edge_redundant_info",
        "branch": "lateral_only",
        "description": "Weber B fracture, spiral fibula at syndesmosis level, simple fracture without syndesmosis injury",
        "language": "en",
        "expected_extraction": {
            "involved_malleoli": "lateral_only",
            "fibular_level": "transindesmal",
            "lateral_morphology": "spiral",
            "lateral_subtype": "simple",
        },
        "clarification_answers": {},
        "expected": {
            "lauge_hansen": "SER",
            "weber": "Weber B",
            "ao_ota": "44-B1.1",
            "bartonicek": None,
        },
    },
    {
        "test_id": "chat_edge_negation",
        "branch": "posterior_only",
        "description": "isolated posterior malleolus fracture, less than one-third articular involvement, no CT scan",
        "language": "en",
        "expected_extraction": {
            "involved_malleoli": "posterior_only",
            "articular_involvement": "small_without_extension",
            "has_ct_scan": False,
        },
        "clarification_answers": {},
        "expected": {
            "lauge_hansen": "PA",
            "weber": None,
            "ao_ota": None,
            "bartonicek": None,
        },
    },
    {
        "test_id": "chat_edge_spanish_complete",
        "branch": "trimaleolar",
        "description": "Fractura trimaleolar con peroné suprasindesmal, tipo diafisaria simple, trazo oblicuo largo espiroideo parasindesmal, con TAC que muestra fragmento posterolateral (Bartonicek tipo 2)",
        "language": "es",
        "expected_extraction": {
            "involved_malleoli": "trimaleolar",
            "fibular_level": "suprasindesmal",
            "suprasindesmal_type": "simple_diaphyseal",
            "fibula_trace_pattern": "parasindesmotic_long",
            "has_ct_scan": True,
            "posterior_fracture_type": "posterolateral",
        },
        "clarification_answers": {},
        "expected": {
            "lauge_hansen": "PER",
            "weber": "Weber C",
            "ao_ota": "44-C1.3",
            "bartonicek": "Bartonicek 2",
        },
    },
    {
        "test_id": "chat_edge_minimal_trimaleolar",
        "branch": "trimaleolar",
        "description": "trimaleolar ankle fracture",
        "language": "en",
        "expected_extraction": {
            "involved_malleoli": "trimaleolar",
        },
        "clarification_answers": {
            "fibular_level": "above the syndesmosis (suprasyndesmal, high fibula)",
        },
        "expected_behavior": "should_ask_fibular_level",
        "expected": None,
    },
]
chat_test_cases["edge_cases"] = edge_cases

# --- Summary ---
total = 0
for category, cases in chat_test_cases.items():
    count = len(cases)
    total += count
    print(f"  {category}: {count}")
print(f"  TOTAL: {total}")

# Write output
with open(OUTPUT_PATH, "w") as f:
    json.dump(chat_test_cases, f, indent=2, ensure_ascii=False)

print(f"\nChat test cases written to {OUTPUT_PATH}")
