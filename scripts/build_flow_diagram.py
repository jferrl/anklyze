#!/usr/bin/env python3
"""Build the classifier's flow diagram SVGs, one per language, from the clinician's draw.io.

The source file is never modified. For each language a temporary copy gets the
DESIGN.md palette as draw.io styles, plain labels without the author's red
revision colours, English labels (en), and taller shapes wherever the text
overflows. The draw.io CLI then exports it, so edges are routed to the new sizes.
Fails if an English label is still Spanish or a resized shape would overlap
another one. Run from the repo root: `make export-diagram`.
"""

import html
import json
import math
import os
import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET

SOURCE = "docs/Danis-Weber AO_OTA Flow-2026-02-28-ES.drawio"
OUTPUT = "internal/api/flowdiagram/classification-flow.{}.svg"
I18N = "frontend/src/i18n/{}.json"

# Token values as the app renders them (sRGB of frontend/src/index.css), light then dark.
ACCENT = ("#e5ecf8", "#202b3f")
PRIMARY = ("#142d60", "#9ac0f8")
CARD = ("#ffffff", "#121721")
INPUT = ("#bec4d0", "#3a4353")
SECONDARY = ("#edf0f6", "#1c232f")
FOREGROUND = ("#0f1a2f", "#ebeff4")

# draw.io source fill -> (node kind, fill, stroke).
KINDS = {
    "#fff2cc": ("question", ACCENT, PRIMARY),
    "#d5e8d4": ("answer", CARD, INPUT),
    "#f8cecc": ("result", SECONDARY, PRIMARY),
    "#dae8fc": ("start", ACCENT, PRIMARY),
}

# Drawio wordings that differ from their es.json label by more than spacing or case.
# Mirrors DRAWIO_ALIASES in parse_drawio_test_cases.py, plus question and result wordings.
ALIASES = {
    "Si": "Sí",
    "Alta (Suprasindesmal)": "Suprasindesmal",
    "Proximal (1/3 proximal peroné)": "Proximal (1/3 proximal de peroné)",
    "Parasindesmal de trazo oblicuo largo/espiroideo (a < de 6cm de la superficie articular)":
        "Parasindesmal (a < 6 cm de la superficie articular) de trazo oblicuo largo/espiroideo",
    "¿Cúantos trazos tiene la fractura de peroné?": "¿Cuántos trazos tiene la fractura de peroné?",
    "¿Qué tipo de fractura es el maléolo posterior?": "¿Qué tipo de fractura presenta el maléolo posterior?",
    "¿Cómo es el trazo principal del peroné?": "¿Cómo es el trazo principal de la fractura del peroné?",
    "Fractura tibia distal": "Fractura de tibia distal",
}

# Label for the start node, whose source label is a placeholder.
START = {"es": "Inicio", "en": "Start"}

# Drawio questions with no es.json counterpart.
EXTRA_EN = {
    "¿A qué nivel está la fractura?": "At what level is the fracture?",
    "¿Cómo es el maléolo lateral?": "What is the lateral malleolus like?",
    "¿Cómo es el trazo del peroné?": "What is the fibular fracture trace pattern?",
}

# Result lines: phrase substitutions, applied in order, for lines with no i18n match.
RESULT_PHRASES = [
    (r"\bsubtipo no clasificable\b", "subtype not classifiable"),
    (r"\bno clasificable\b", "not classifiable"),
    (r"\bclasificable\b", "classifiable"),
    (r"\bsubtipo\b", "subtype"),
    (r"\btipo\b", "type"),
]

SPANISH = re.compile(
    r"[áéíóúñ¿¡]|maleol|sindesm|\b(de|del|la|el|los|las|es|con|sin|y|o|tiene|nivel|fractura|tipo|subtipo"
    r"|clasificable|trazo|perone|fragmento|baja|alta|oblicu[ao]|espiroide[ao]|transvers[ao]|mortaja"
    r"|conminuta|diafisaria|superficie|tac|si)\b",
    re.I,
)

# Helvetica advance widths (1/1000 em) for printable ASCII; label text is 12px Helvetica.
HELVETICA = dict(zip(
    " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~",
    [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278] + [556] * 10
    + [278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556,
       833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
       333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333,
       500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584],
))
FONT_PX = 12
LINE_PX = FONT_PX * 1.2
PAD = 6  # breathing room between text and outline


def canon(label):
    """Key that ignores spacing and case (same as parse_drawio_test_cases.canon)."""
    return re.sub(r"\s+", "", label).lower()


def strip_accents(ch):
    return {"á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ñ": "n", "¿": "?", "¡": "!"}.get(ch.lower(), ch)


def text_px(s):
    return sum(HELVETICA.get(strip_accents(c), 556) for c in s) * FONT_PX / 1000


def wrap(line, width):
    """Greedy wrap at spaces and after hyphens, as the browser lays out the label."""
    words = re.findall(r"[^ -]+-?|-", line.replace("\xa0", " "))
    rows, row = [], ""
    for w in words:
        trial = row + w if not row or row.endswith("-") else row + " " + w
        if row and text_px(trial) > width:
            rows.append(row)
            row = w
        else:
            row = trial
    return rows + [row]


def label_lines(value):
    """Plain text lines of a draw.io HTML label; drops markup, including inline colours."""
    text = re.sub(r"<br\s*/?>|</?div>", "\n", value or "")
    text = html.unescape(re.sub(r"<[^>]+>", "", text)).replace("\xa0", " ")
    return [re.sub(r"\s+", " ", ln).strip() for ln in text.split("\n") if ln.strip()]


def i18n_map():
    """canon(Spanish UI string) -> English, from the form and result strings both locales share."""
    es, en = (json.load(open(I18N.format(lang), encoding="utf-8")) for lang in ("es", "en"))
    out = {}

    def walk(a, b):
        for k, v in a.items():
            if isinstance(v, dict):
                walk(v, b[k])
            else:
                out.setdefault(canon(v), b[k])

    for path in (("form", "questions"), ("form", "options"), ("form", "labels"), ("results", "fractureDescriptions")):
        a, b = es, en
        for p in path:
            a, b = a[p], b[p]
        walk(a, b)
    return out


def translate(line, table):
    key = canon(ALIASES.get(line, line))
    if key in table:
        return table[key]
    if line in EXTRA_EN:
        return EXTRA_EN[line]
    for pat, rep in RESULT_PHRASES:
        line = re.sub(pat, rep, line)
    return line


def set_style(style, **kv):
    parts = [p for p in style.split(";") if p and p.split("=")[0] not in kv]
    return ";".join(parts + ["{}={}".format(k, v) for k, v in kv.items()]) + ";"


def light_dark(pair):
    return "light-dark({},{})".format(*pair)


def fitted_size(kind, lines, w, h, lid):
    """Smallest (w, h) at least the current size whose outline holds the wrapped text, or None if it fits."""
    def box(width):
        rows = [r for ln in lines for r in wrap(ln, width - 2)]
        return max(text_px(r) for r in rows), len(rows) * LINE_PX

    tw, th = box(w)
    if kind == "rhombus":
        # A centred box fits a diamond when tw/W + th/H <= 1; widen until the text sits well inside.
        if tw / w + th / h <= 1:
            return None
        best = None
        for nw in range(int(w), int(w * 2) + 1, 8):
            tw, th = box(nw)
            room = 1 - (tw + 2 * PAD) / nw
            if room <= 0.25:
                continue
            nh = max(h, math.ceil((th + 2 * PAD) / room))
            if best is None or nw * nh < best[0] * best[1]:
                best = (nw, nh)
        if best is None:
            sys.exit("no diamond up to twice the width holds: " + " / ".join(lines))
        return best
    usable = h - (2.3 * lid if kind == "cylinder" else 2)
    if th <= usable:
        return None
    return w, math.ceil(th + 2 * PAD + h - usable)


def overlaps(a, b):
    return a[0] < b[0] + b[2] and b[0] < a[0] + a[2] and a[1] < b[1] + b[3] and b[1] < a[1] + a[3]


def build(lang, tree, table, tmp):
    root = tree.getroot()
    cells = {c.get("id"): c for c in root.iter("mxCell")}
    children = {}
    for c in cells.values():
        if c.get("edge") == "1" and c.get("source") and c.get("target"):
            children.setdefault(c.get("source"), []).append(c.get("target"))

    def geo(c):
        g = c.find("mxGeometry")
        return [float(g.get(k, 0)) for k in ("x", "y", "width", "height")]

    def set_geo(c, box):
        g = c.find("mxGeometry")
        for k, v in zip(("x", "y", "width", "height"), box):
            g.set(k, str(round(v, 2)))

    vertices = [c for c in cells.values() if c.get("vertex") == "1"]
    before = {c.get("id"): geo(c) for c in vertices}
    stats = {"labels": 0, "translated": 0, "colours": 0, "resized": [], "shifted": [], "spanish": []}

    for c in vertices:
        style, value = c.get("style", ""), c.get("value", "")
        fill = re.search(r"fillColor=(#\w+)", style).group(1).lower()
        _, bg, line = KINDS[fill]
        c.set("style", set_style(style, fillColor=light_dark(bg), strokeColor=light_dark(line), fontColor=light_dark(FOREGROUND)))
        stats["colours"] += bool(re.search(r"color\s*:", value))
        lines = label_lines(value)
        if lines == ["bli"]:  # the source's start node carries a placeholder label
            lines = [START[lang]]
        stats["labels"] += bool(lines)
        if lang == "en":
            out = [translate(ln, table) for ln in lines]
            stats["translated"] += out != lines
            stats["spanish"] += [(c.get("id"), ln) for ln in out if SPANISH.search(ln)]
            lines = out
        c.set("value", "<br>".join(html.escape(ln, quote=False) for ln in lines))

        shape = style.split(";")[0]
        kind = "rhombus" if shape == "rhombus" else "cylinder" if shape == "shape=cylinder3" else "rect"
        lid = float(re.search(r"\bsize=([\d.]+)", style).group(1)) if kind == "cylinder" else 0
        x, y, w, h = geo(c)
        size = lines and fitted_size(kind, lines, w, h, lid)
        if size:
            nw, nh = size
            # Results are leaves: grow down. Others grow about their centre so both edges keep their gap.
            ny = y if kind == "cylinder" else y - (nh - h) / 2
            set_geo(c, (x - (nw - w) / 2, ny, nw, nh))
            stats["resized"].append(c.get("id"))

    # A grown shape that now overlaps a neighbour pushes that neighbour and its branch down.
    for _ in range(50):
        boxes = {c.get("id"): geo(c) for c in vertices}
        clash = next(((a, b) for a in stats["resized"] for b in boxes
                      if a != b and overlaps(boxes[a], boxes[b]) and not overlaps(before[a], before[b])), None)
        if not clash:
            break
        a, b = clash
        lower, upper = (b, a) if boxes[b][1] >= boxes[a][1] else (a, b)
        dy = boxes[upper][1] + boxes[upper][3] + 20 - boxes[lower][1]
        todo, seen = [lower], set()
        while todo:
            n = todo.pop()
            if n in seen or n not in boxes:
                continue
            seen.add(n)
            bx = geo(cells[n])
            set_geo(cells[n], (bx[0], bx[1] + dy, bx[2], bx[3]))
            todo += children.get(n, [])
        stats["shifted"].append((lower, len(seen), dy))
    else:
        sys.exit("{}: overlaps did not settle".format(lang))

    path = os.path.join(tmp, "flow.{}.drawio".format(lang))
    tree.write(path, encoding="utf-8", xml_declaration=False)
    return path, stats


def export(src, out, lang):
    subprocess.run(["drawio", "--export", "--format", "svg", "--embed-svg-fonts", "false", "--output", out, src],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    with open(out, encoding="utf-8") as f:
        svg = f.read()
    # draw.io names the SVG root with a random id; pin it so rebuilds are byte-identical.
    svg = re.sub(r"ge-svg-[\w-]+", "ge-svg-flow-" + lang, svg)
    with open(out, "w", encoding="utf-8") as f:
        f.write(svg)


def main():
    table = i18n_map()
    with tempfile.TemporaryDirectory() as tmp:
        for lang in ("es", "en"):
            path, s = build(lang, ET.parse(SOURCE), table, tmp)
            if s["spanish"]:
                for cid, ln in s["spanish"]:
                    print("  untranslated {}: {}".format(cid, ln))
                sys.exit("en: {} label lines still Spanish".format(len(s["spanish"])))
            out = OUTPUT.format(lang)
            export(path, out, lang)
            print("{}: {} labels, {} translated, {} inline colours removed, {} shapes resized, {} branches shifted -> {}".format(
                lang, s["labels"], s["translated"], s["colours"], len(s["resized"]), len(s["shifted"]), out))
            for cid, n, dy in s["shifted"]:
                print("  shifted {} and {} descendants down {:.0f}px".format(cid, n - 1, dy))


if __name__ == "__main__":
    main()
