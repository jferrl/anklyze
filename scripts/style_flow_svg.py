#!/usr/bin/env python3
"""Restyle the exported classification-flow SVG into the DESIGN.md palette.

draw.io exports its default fills (yellow questions, green answers, red results)
both as plain attributes and as light-dark() pairs. This maps each to the app's
tokens for the light and dark themes, leaving the draw.io source untouched.
Running it twice is a no-op. Usage: style_flow_svg.py <file.svg>
"""

import re
import sys

# Token values as the app renders them (sRGB of frontend/src/index.css), light then dark.
ACCENT = ((229, 236, 248), (32, 43, 63))
PRIMARY = ((20, 45, 96), (154, 192, 248))
CARD = ((255, 255, 255), (18, 23, 33))
INPUT = ((190, 196, 208), (58, 67, 83))
SECONDARY = ((237, 240, 246), (28, 35, 47))

# draw.io light colour -> (light, dark) token.
MAP = {
    (255, 242, 204): ACCENT,     # question fill
    (214, 182, 86): PRIMARY,     # question outline
    (213, 232, 212): CARD,       # answer fill
    (130, 179, 102): INPUT,      # answer outline
    (248, 206, 204): SECONDARY,  # result fill
    (184, 84, 80): PRIMARY,      # result outline
    (218, 232, 252): ACCENT,     # draw.io default blue fill
    (108, 142, 191): PRIMARY,    # draw.io default blue outline
}


def hexcode(rgb):
    return "#{:02x}{:02x}{:02x}".format(*rgb)


def restyle(svg):
    pair = re.compile(r"light-dark\(rgb\((\d+), (\d+), (\d+)\), rgb\(\d+, \d+, \d+\)\)")

    def swap_pair(m):
        light = tuple(int(x) for x in m.groups())
        if light not in MAP:
            return m.group(0)
        lt, dk = MAP[light]
        return "light-dark(rgb({}, {}, {}), rgb({}, {}, {}))".format(*lt, *dk)

    svg = pair.sub(swap_pair, svg)
    for light, (lt, _) in MAP.items():
        svg = re.sub(r'(fill|stroke)="{}"'.format(hexcode(light)), r'\1="{}"'.format(hexcode(lt)), svg, flags=re.I)
    return svg


def main():
    path = sys.argv[1]
    with open(path, encoding="utf-8") as f:
        before = f.read()
    after = restyle(before)
    with open(path, "w", encoding="utf-8") as f:
        f.write(after)
    print("restyled {}: {}".format(path, "changed" if after != before else "already styled"))


if __name__ == "__main__":
    main()
