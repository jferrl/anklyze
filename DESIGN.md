---
name: Anklyze
description: Ankle fracture classification in four systems, and inter-rater reliability studies.
colors:
  primary: "oklch(0.31 0.095 262)"
  primary-foreground: "oklch(0.985 0.003 255)"
  field-navy: "oklch(0.27 0.09 262)"
  ring: "oklch(0.55 0.16 262)"
  background: "oklch(0.985 0.003 255)"
  foreground: "oklch(0.22 0.045 262)"
  card: "oklch(1 0 0)"
  secondary: "oklch(0.955 0.008 258)"
  muted: "oklch(0.962 0.006 258)"
  muted-foreground: "oklch(0.47 0.03 262)"
  accent: "oklch(0.94 0.018 262)"
  accent-foreground: "oklch(0.25 0.07 262)"
  border: "oklch(0.89 0.012 262)"
  input: "oklch(0.82 0.018 262)"
  sidebar: "oklch(0.968 0.007 258)"
  success: "oklch(0.5 0.12 155)"
  warning: "oklch(0.52 0.15 45)"
  destructive: "oklch(0.53 0.2 27)"
  sys-lh: "oklch(0.62 0.13 75)"
  sys-dw: "oklch(0.55 0.1 185)"
  sys-ao: "oklch(0.5 0.17 262)"
  sys-bt: "oklch(0.52 0.17 345)"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(2.25rem, 4.6vw, 4.25rem)"
    fontWeight: 750
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 80"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 750
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 80"
  code:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 750
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 80"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
    fontFeature: "'ss01'"
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
rounded:
  none: "0px"
  sm: "2px"
  md: "4px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
    height: "36px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
    height: "36px"
  button-ghost:
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
    height: "36px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "4px 12px"
    height: "36px"
  badge-status:
    textColor: "{colors.foreground}"
    rounded: "{rounded.none}"
    padding: "2px 6px"
    typography: "{typography.label}"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.md}"
    padding: "24px"
  stat-cell:
    backgroundColor: "{colors.card}"
    padding: "16px"
  selection-row:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    padding: "12px 16px"
  selection-row-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
---

# Design System: Anklyze

## Overview

**Creative North Star: "The Classification Chart"**

Anklyze looks like a printed clinical reference chart: navy ink on white paper, every group of facts held in a box drawn with a 1px rule, and the classification codes set large and heavy where the eye lands first. Depth comes from rules and tonal fills, never from shadows, gradients, glow or glass. The interface is dense and quiet so the radiograph and the result carry the page.

There is one typeface, Archivo, self-hosted as a variable font. Its narrow, heavy cut is the display voice for headlines and classification codes; its normal width carries everything else. Copy is sentence case throughout. Colour is reserved: navy is the only accent, and four identity hues mark the four classification systems and nothing else.

Results and reliability figures are printed for papers and case notes, so print is a supported medium: chrome drops out and the page prints black on white.

**Key Characteristics:**
- Navy ink on near-white; a solid navy field is the only saturated surface.
- 1px rules group content; ruled grids instead of floating cards.
- Flat at rest; state shows as a tonal fill or a 2px rule, not a lift.
- One typeface in two voices: narrow heavy display, normal-width body.
- Small radii (0 to 4px); square swatches and badges.
- Exact numbers in tabular figures, with their method stated beside them.

## Colors

A cool navy monochrome with four reserved identity hues and three status colours. Values are defined for light and dark themes in `frontend/src/index.css`; the frontmatter lists the light theme, the sidecar carries dark.

### Primary
- **Chart Navy** (primary): primary buttons, the current-step rule, the selected radio dot, text selection and caret, the logo fill.
- **Field Navy** (field-navy): the solid full-bleed band of the landing hero, the login aside and the not-found page. It stays navy in dark mode (darkened, not inverted).
- **Focus Blue** (ring): focus rings only, solid and 3px wide, so the ring keeps 3:1 against Paper and Sheet in both themes.

### Tertiary: system identity
- **Lauge-Hansen Ochre** (sys-lh), **Danis-Weber Teal** (sys-dw), **AO/OTA Blue** (sys-ao), **Bartonicek Magenta** (sys-bt): one per classification system, shown as a small square swatch (8 to 10px) beside the system name, and as chart series 1 to 4.

### Status
- **Success Green** (success): the status dot for published cases and active studies.
- **Warning Rust** (warning): flags only, e.g. agreement under 60% and a Bartonicek result that needs CT. A normal value stays foreground ink.
- **Destructive Red** (destructive): delete actions and the impossible-combination alert.

### Neutral
- **Paper** (background) and **Sheet** (card): page and boxed surfaces; boxes are pure white on a slightly cool page.
- **Ink** (foreground): all body and heading text.
- **Pencil** (muted-foreground): labels, descriptions, secondary cells.
- **Wash** (muted, secondary) and **Selected Wash** (accent): tonal fills for method notes, the studies band, hover and selected rows.
- **Rule** (border) and **Field Rule** (input): 1px rules for boxes and dividers, and the stronger stroke on inputs and outline buttons.

### Named Rules
**The Identity Colour Rule.** The four system hues identify a classification system and are used for nothing else: no status, no decoration, no emphasis.

**The One Field Rule.** Field Navy is the only saturated surface, used as one full-bleed band on a public page. App pages stay on Paper.

**The Flag, Not Paint Rule.** Status colour marks an exception (a low value, a missing CT) or a lifecycle dot. Ordinary values are never coloured.

## Typography

**Display Font:** Archivo at 80% width, weight 750 (with ui-sans-serif, system-ui fallback)
**Body Font:** Archivo at normal width (same stack)

**Character:** One family in two voices. The narrow heavy cut reads like the code printed on a reference chart; the normal cut is plain and legible at small sizes. Body text enables stylistic set `ss01`.

### Hierarchy
- **Display** (750, clamp(2.25rem, 4.6vw, 4.25rem), 1, -0.02em, 80% width): the hero headline on the landing, login and not-found pages.
- **Headline** (750, 1.875 to 3rem, 1, display voice): landing section headings.
- **Code** (750, 1.5 to 2.25rem, display voice, tabular figures): classification codes in result cells, kappa values and gauge readouts. Not-classifiable results drop one step and turn Pencil.
- **Title** (600, 1.5rem, tight tracking): the PageHeader h1 on every app page. Section titles step down to 600 at 1.125rem or 1rem.
- **Body** (400, 0.875rem): the app's working size. Landing prose uses 1rem to 1.125rem with relaxed leading, capped at 52 to 65ch.
- **Label** (400 to 500, 0.75 to 0.875rem, Pencil): stat labels, table heads, badge text. Sentence case, no tracking.
- **Citation** (system monospace, 0.875rem): the copyable citation on the landing page only, in a ruled box.

### Named Rules
**The Two Voices Rule.** Display voice is for headlines and codes only; everything else is normal-width Archivo. Monospace is limited to text meant to be copied verbatim.

**The Exact Figure Rule.** Tables and anything marked `data-numeric` use tabular figures. Percentages print with one decimal.

## Layout

App pages sit beside the sidebar in a `max-w-7xl` (80rem) column; public pages use a `max-w-6xl` (72rem) column with 16px gutters, 24px from `sm`. Landing sections use a 12-column grid from `lg` (heading 4 or 5 columns, content 7 or 8) and 64px to 96px vertical padding. Spacing follows Tailwind's 4px base; the common steps are 4, 8, 16, 24 and 64px.

Every app page opens with a PageHeader closed by a bottom rule, then content. Case screens put images first. Lists are ruled tables or `divide-y` stacks inside one bordered box. Prose is capped at 65 to 90ch. Dates are formatted with `Intl.DateTimeFormat` in the interface language (day, short month, year).

Motion is state change only: content swaps fade in over 180ms on `cubic-bezier(0.16, 1, 0.3, 1)`, except content swapped by the system tabs, which changes in place because tab switching is frequent and keyboard-driven; bars grow from the left over 250ms, once on first mount; colour transitions take 150ms. Reduced motion cuts all of it.

## Elevation & Depth

Flat. Surfaces at rest have no shadow; hierarchy comes from 1px rules, the white Sheet on cool Paper, and tonal washes. Floating layers that the platform lifts off the page (popovers, the chart tooltip) are the only places a shadow appears.

### Named Rules
**The Ruled Box Rule.** Group facts in a box drawn with a 1px rule; split it into cells with `gap-px` over a Rule-coloured background or with `divide-y`, not with separate floating cards.

## Shapes

Corners are nearly square. The base radius is 4px: boxes and cards use it, buttons and inputs use 2px, badges, keyboard hints and colour swatches are square. Round shapes are kept for radio indicators and status dots. The logo is a 4px-rounded navy square.

## Components

### Buttons
- **Shape:** 2px corners, 36px tall (32px small, 40px large).
- **Primary:** Chart Navy fill, Paper text, weight 500; hover drops to 90% opacity.
- **Outline:** Paper fill, Field Rule stroke; hover fills Selected Wash. Used for secondary and navigation actions (Previous, Clear search).
- **Ghost:** for header actions such as Sign in.
- **Text link:** Chart Navy, weight 500, underlined with a 4px offset; used for links to documents and the repository.
- **Destructive outline:** red text and a 40% red stroke, for delete in place.
- **Focus:** solid 3px Focus Blue ring.
- **On Field Navy:** a white button with navy text, 44px tall; the only inverse button.

### Badges
- **StatusBadge:** outline badge, square corners, 12px text, a 6px round dot (Field Rule for draft, Success for published and active, Pencil for closed). Use for every case and study lifecycle status, in tables and page titles alike.

### Cards / Containers
- **Corner Style:** 4px.
- **Background:** Sheet on Paper.
- **Shadow Strategy:** none (see Elevation).
- **Border:** 1px Rule.
- **Internal Padding:** 24px for cards, 16px for cells.

### Inputs / Fields
- **Style:** Sheet fill, Field Rule stroke, 2px corners, 36px tall.
- **Focus:** stroke turns Focus Blue with a solid 3px ring.
- **Error / Disabled:** red stroke and ring; disabled at 50% opacity.

### Navigation
- **App sidebar:** shadcn sidebar on the Sidebar wash; active item uses the sidebar accent fill.
- **Landing header:** a ruled 56px bar with muted text links that darken on hover.
- **SystemTabs:** a bordered segmented control; each tab carries its system swatch, the active tab fills Selected Wash. Use whenever a view switches between the four systems.
- **StepIndicator / StepFooter:** numbered steps over a rule, the current step underlined with a 2px navy rule; the footer row is Previous, "Step n of m", Next. Use in every multi-step editor.

### Signature components
- **PageHeader:** title, optional description and right-aligned actions, closed by a bottom rule. Every app page opens with it.
- **StatGroup / StatCard:** a ruled grid of 2 to 4 cells, each a label, an exact value in tabular figures, and one line of context. Use for summary figures at the top of dashboards and reports.
- **Result grid:** the four system cells in one ruled box, each with swatch, system name, the code in display voice and an optional detail line. Not classifiable is shown as a valid, muted result.
- **SelectionCard:** one option row with a round radio indicator and an optional keyboard hint; stack rows in one bordered `divide-y` box. The classifier's answer control.
- **MethodNote:** a muted box next to published figures stating how they were computed.
- **NoMatchState:** a single ruled row stating the search or filter that returned nothing, with a Clear search button. Distinct from an empty list.

## Do's and Don'ts

### Do:
- **Do** open every app page with PageHeader and group content in boxes drawn with a 1px rule.
- **Do** mark a classification system with its identity swatch and its proper name (Lauge-Hansen, Danis-Weber, AO/OTA, Bartonicek), which is never translated, in that display order.
- **Do** set classification codes and published figures in the display voice with tabular figures, and place a MethodNote beside reliability figures.
- **Do** show "not classifiable" as a muted result, never as an error.
- **Do** write sentence case, keep all strings in `frontend/src/i18n/{en,es}.json`, and address the reader as usted in Spanish ("Seleccione", "Introduzca", "Inicie sesión").
- **Do** ship every screen in both themes and keep print legible.

### Don't:
- **Don't** use shadows, gradients, glows or glass on resting surfaces.
- **Don't** use a system identity hue for status, emphasis or decoration.
- **Don't** colour a normal value; status colour flags exceptions only.
- **Don't** add a second display or text typeface, or use the display voice for body copy.
- **Don't** use uppercase eyebrows or letter-spaced labels.
- **Don't** animate entrances with slides or scales; content swaps fade.
