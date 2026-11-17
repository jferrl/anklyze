---
version: 1
slug: "frontend-src-components-landingpage-tsx"
primary_target: "frontend/src/components/LandingPage.tsx"
related_targets: ["frontend/src/components/auth/LoginPage.tsx","frontend/src/components/layout/AppShell.tsx"]
---

# Surface brief: landing page (and the app shell that inherits its world)

Scope: `frontend/src/components/LandingPage.tsx` (Persuade). Login, the app shell and every authenticated screen inherit the same world in Operate mode: restrained, one family, flat ruled surfaces.

Audience and job: an orthopaedic surgeon or a study reviewer deciding in one viewport whether this is a serious instrument, then starting the classifier. Proof on hand is the decision tree itself; no testimonials, benchmarks or coverage figures may be claimed.

## Direction contract

THESIS: The page is a classification wall chart, not a software landing page. It refuses the centred headline, stat row and three icon cards.

OWN-WORLD: Deep navy ink on white, 1px rules, square 4px corners, no shadows or gradients. Archivo throughout; headlines and codes in its narrow heavy cut. One saturated navy field per page region. Four identity colours mark the four classification systems and nothing else.

STORY: The visitor sees a real path through the tree end in four codes, understands that one set of answers yields all four systems, and starts classifying.

FIRST VIEWPORT: Ruled nav on white. Below, a full-width navy field: left half, the headline in the narrow heavy cut at about 4.5rem with lede and the white "Start classifying" button; right half, a ruled five-step example path ending in a white four-cell result row with the codes large.

FORM: Classification Chart, the top-ranked grounded candidate; chosen by delegation after the user declined the bolder hand ("select the best approach for the kind of app that we are building"). seed:45dec78b153f8348.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Open decisions
- Signature interaction: none beyond the working classifier; the example path is static.
- No raster assets ship; the oversized `classification-flow.svg` (14 MB) is not used on the landing page.
