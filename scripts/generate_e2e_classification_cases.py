#!/usr/bin/env python3
"""Generate the E2E classification fixture from the draw.io decision tree.

Runs parse_drawio_test_cases.py and turns every terminal path into the
answers to click (draw.io wording) and the four codes the results panel must
show, so the E2E expectations come from the clinician's tree, not the app.

Usage:
    python3 -I scripts/generate_e2e_classification_cases.py [drawio_path] [output_path]
"""

import json
import os
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRAWIO = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    ROOT, 'docs', 'Danis-Weber AO_OTA Flow-2026-02-28-ES.drawio')
OUTPUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
    ROOT, 'e2e', 'fixtures', 'classification-cases.json')

# Draw.io answers whose wording differs from the form label beyond case,
# accents and whitespace (the spec ignores those). Value is the es.json label.
ALIASES = {
    'Alta (Suprasindesmal)': 'Suprasindesmal',
    'Proximal (1/3 proximal peroné)': 'Proximal (1/3 proximal de peroné)',
    'Parasindesmal de trazo oblicuo largo/espiroideo (a < de 6cm de la superficie articular)':
        'Parasindesmal (a < 6 cm de la superficie articular) de trazo oblicuo largo/espiroideo',
}

NOT_CLASSIFIABLE = 'No clasificable'


def expected_codes(raw, parsed):
    """Map parsed terminal codes to the text the results panel shows.

    None means the terminal does not mention that system, so it is not asserted.
    """
    def stated(value, *words):
        if not any(w in raw for w in words):
            return None
        if value is None or value == 'no clasificable':
            return NOT_CLASSIFIABLE
        return str(value)

    return {
        'ao': stated(parsed['ao'], 'AO'),
        'lauge_hansen': stated(parsed['lauge_hansen'], 'Lauge'),
        # The panel prefixes these codes ("Weber A", "Bartonicek 1"), as the draw.io writes them.
        'danis_weber': stated(parsed['weber'] and f"Weber {parsed['weber']}", 'Weber'),
        'bartonicek': stated(parsed['bartonicek'] and f"Bartonicek {parsed['bartonicek']}",
                             'Bartonicek', 'Bartonícek'),
    }


def main():
    with tempfile.TemporaryDirectory() as tmp:
        parsed_path = os.path.join(tmp, 'cases.json')
        subprocess.run(
            [sys.executable, '-I', os.path.join(ROOT, 'scripts', 'parse_drawio_test_cases.py'),
             DRAWIO, parsed_path],
            check=True, stdout=subprocess.DEVNULL)
        with open(parsed_path, encoding='utf-8') as f:
            branches = json.load(f)

    cases = []
    for branch in sorted(branches):
        for case in branches[branch]:
            # description holds the raw draw.io answers; clicks hold the raw questions.
            answers = case['description'].split(' -> ')
            questions = [c['question'] for c in case['clicks'] if c['label'] is not None]
            assert len(answers) == len(questions), case['id']
            cases.append({
                'id': case['id'],
                'terminal_id': case['terminal_id'],
                'path': [
                    {'question': ' '.join(q.split()), 'answer': ALIASES.get(a, ' '.join(a.split()))}
                    for q, a in zip(questions, answers)
                ],
                'expected': expected_codes(case['terminal_raw'], case['expected']),
                'terminal': ' | '.join(l.strip() for l in case['terminal_raw'].split('\n') if l.strip()),
            })

    ids = [c['terminal_id'] for c in cases]
    assert len(ids) == len(set(ids)), 'duplicate terminal ids'

    with open(OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(cases, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print(f'{len(cases)} cases written to {OUTPUT}')


if __name__ == '__main__':
    main()
