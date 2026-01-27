package mcp

import (
	"context"

	"github.com/mark3labs/mcp-go/mcp"
)

// ============================================================================
// Classification Systems Overview
// ============================================================================

func classificationSystemsOverviewResource() mcp.Resource {
	return mcp.NewResource(
		"anklyze://systems/overview",
		"Classification Systems Overview",
		mcp.WithResourceDescription("Overview of all ankle fracture classification systems supported by Anklyze"),
		mcp.WithMIMEType("text/markdown"),
	)
}

func classificationSystemsOverviewHandler(ctx context.Context, request mcp.ReadResourceRequest) ([]mcp.ResourceContents, error) {
	content := `# Ankle Fracture Classification Systems

Anklyze supports four internationally recognized classification systems for ankle fractures:

## 1. Danis-Weber Classification
Based on the **level of the fibular fracture** relative to the ankle syndesmosis:
- **Weber A**: Below the syndesmosis (infrasyndesmal) - Usually stable
- **Weber B**: At the level of the syndesmosis (transsyndesmal) - Variable stability
- **Weber C**: Above the syndesmosis (suprasyndesmal) - Usually unstable

## 2. Lauge-Hansen Classification
Based on the **mechanism of injury** (foot position + force direction):
- **SA (Supination-Adduction)**: Transverse fibular fracture below syndesmosis
- **SER (Supination-External Rotation)**: Spiral fibular fracture at syndesmosis level (most common)
- **PER (Pronation-External Rotation)**: High fibular fracture with syndesmosis injury
- **PA (Pronation-Abduction)**: Oblique fibular fracture at/above syndesmosis

## 3. AO/OTA Classification
**Alphanumeric system** (bone segment 44 = ankle):
- **44-A**: Infrasyndesmal fractures (A1: isolated, A2: with medial)
- **44-B**: Transsyndesmal fractures (B1: isolated, B2: with medial, B3: with medial+posterior)
- **44-C**: Suprasyndesmal fractures (C1: simple, C2: multifragmentary, C3: proximal/Maisonneuve)

## 4. Bartonicek Classification
Specifically for **posterior malleolus fractures** (requires CT scan):
- **Type 1**: Extraincisural - small posterolateral fragment
- **Type 2**: Posterolateral - extends to incisura fibularis
- **Type 3**: Posteromedial + Posterolateral - two-part fracture
- **Type 4**: Large Posterolateral - large triangular fragment

## How to Use

1. Identify which malleoli are fractured (lateral, medial, posterior, or combinations)
2. Determine the fibular fracture level if lateral malleolus is involved
3. Note the fracture morphology (transverse, oblique, spiral)
4. If CT available and posterior malleolus involved, classify with Bartonicek

Use the ` + "`classify_fracture`" + ` tool to get classifications based on these parameters.
`

	return []mcp.ResourceContents{
		mcp.TextResourceContents{
			URI:      request.Params.URI,
			MIMEType: "text/markdown",
			Text:     content,
		},
	}, nil
}

// ============================================================================
// Danis-Weber Resource
// ============================================================================

func danisWeberResource() mcp.Resource {
	return mcp.NewResource(
		"anklyze://systems/danis-weber",
		"Danis-Weber Classification",
		mcp.WithResourceDescription("Detailed description of Danis-Weber ankle fracture classification"),
		mcp.WithMIMEType("text/markdown"),
	)
}

func danisWeberHandler(ctx context.Context, request mcp.ReadResourceRequest) ([]mcp.ResourceContents, error) {
	content := `# Danis-Weber Classification

## Overview
The Danis-Weber classification, developed by Robert Danis and Bernhard Weber, categorizes ankle fractures based on the level of the fibular fracture relative to the tibial plafond and syndesmosis.

## Classification Types

### Weber A (Infrasyndesmal)
- **Location**: Fibular fracture below the level of the ankle joint (syndesmosis)
- **Mechanism**: Usually supination-adduction injury
- **Syndesmosis**: Intact
- **Stability**: Usually stable
- **Treatment**: Often conservative unless displaced

### Weber B (Transsyndesmal)
- **Location**: Fibular fracture at the level of the syndesmosis
- **Mechanism**: Usually supination-external rotation
- **Syndesmosis**: May or may not be injured
- **Stability**: Variable - depends on medial structures and syndesmosis integrity
- **Treatment**: Requires assessment of syndesmosis; may need fixation

### Weber C (Suprasyndesmal)
- **Location**: Fibular fracture above the syndesmosis
- **Mechanism**: Usually pronation-external rotation or pronation-abduction
- **Syndesmosis**: Almost always injured
- **Stability**: Unstable
- **Treatment**: Usually requires surgical fixation with syndesmosis repair

## Clinical Significance
- Higher Weber classification generally correlates with greater instability
- Weber C fractures have the highest risk of syndesmosis injury
- Classification helps guide treatment decisions and predict outcomes

## Limitations
- Does not account for medial side injuries
- Does not describe fracture morphology
- May underestimate injury severity
`

	return []mcp.ResourceContents{
		mcp.TextResourceContents{
			URI:      request.Params.URI,
			MIMEType: "text/markdown",
			Text:     content,
		},
	}, nil
}

// ============================================================================
// Lauge-Hansen Resource
// ============================================================================

func laugeHansenResource() mcp.Resource {
	return mcp.NewResource(
		"anklyze://systems/lauge-hansen",
		"Lauge-Hansen Classification",
		mcp.WithResourceDescription("Detailed description of Lauge-Hansen classification by injury mechanism"),
		mcp.WithMIMEType("text/markdown"),
	)
}

func laugeHansenHandler(ctx context.Context, request mcp.ReadResourceRequest) ([]mcp.ResourceContents, error) {
	content := `# Lauge-Hansen Classification

## Overview
Developed by Niels Lauge-Hansen through cadaveric studies, this classification describes ankle fractures based on:
1. **Position of the foot** at the time of injury (supination or pronation)
2. **Direction of the deforming force** (adduction, abduction, or external rotation)

## Classification Types

### SA (Supination-Adduction)
- **Foot Position**: Supinated (inverted)
- **Force Direction**: Adduction
- **Fibular Fracture**: Transverse, below syndesmosis
- **Weber Equivalent**: Weber A
- **Stages**:
  - Stage 1: Lateral ligament tear or transverse fibular fracture
  - Stage 2: Vertical medial malleolus fracture

### SER (Supination-External Rotation)
- **Foot Position**: Supinated
- **Force Direction**: External rotation
- **Fibular Fracture**: Spiral/oblique at syndesmosis level
- **Weber Equivalent**: Weber B
- **Stages**:
  - Stage 1: Anterior tibiofibular ligament tear
  - Stage 2: Spiral fibular fracture
  - Stage 3: Posterior malleolus fracture or PITFL tear
  - Stage 4: Medial malleolus fracture or deltoid tear
- **Most common type** (~40-75% of ankle fractures)

### PER (Pronation-External Rotation)
- **Foot Position**: Pronated (everted)
- **Force Direction**: External rotation
- **Fibular Fracture**: Spiral/oblique above syndesmosis
- **Weber Equivalent**: Weber C
- **Stages**:
  - Stage 1: Medial malleolus fracture or deltoid tear
  - Stage 2: Anterior tibiofibular ligament tear
  - Stage 3: High fibular fracture (spiral)
  - Stage 4: Posterior malleolus fracture or PITFL tear

### PA (Pronation-Abduction)
- **Foot Position**: Pronated
- **Force Direction**: Abduction
- **Fibular Fracture**: Oblique/transverse at or above syndesmosis (often comminuted)
- **Weber Equivalent**: Weber B or C
- **Stages**:
  - Stage 1: Medial malleolus fracture or deltoid tear
  - Stage 2: Anterior and posterior tibiofibular ligament tears
  - Stage 3: Short oblique fibular fracture at syndesmosis level

## Clinical Significance
- Helps predict associated injuries based on mechanism
- Guides understanding of fracture patterns and stability
- Useful for surgical planning

## Key Differentiators
- **SER vs PA at transsyndesmal level**: Fibular fracture morphology
  - SER: Spiral fracture (low anterior, high posterior)
  - PA: Short oblique fracture
- **PA vs PER at suprasyndesmal level**: Fibula trace pattern
  - PA: Parasyndesmotic short oblique/transverse
  - PER: Long oblique/spiral extending proximally
`

	return []mcp.ResourceContents{
		mcp.TextResourceContents{
			URI:      request.Params.URI,
			MIMEType: "text/markdown",
			Text:     content,
		},
	}, nil
}

// ============================================================================
// AO/OTA Resource
// ============================================================================

func aootaResource() mcp.Resource {
	return mcp.NewResource(
		"anklyze://systems/ao-ota",
		"AO/OTA Classification",
		mcp.WithResourceDescription("AO Foundation/OTA ankle fracture classification (44-A/B/C)"),
		mcp.WithMIMEType("text/markdown"),
	)
}

func aootaHandler(ctx context.Context, request mcp.ReadResourceRequest) ([]mcp.ResourceContents, error) {
	content := `# AO/OTA Classification

## Overview
The AO (Arbeitsgemeinschaft fur Osteosynthesefragen) / OTA (Orthopaedic Trauma Association) classification provides a standardized alphanumeric system for describing fractures.

For ankle fractures, the bone segment is **44** (distal tibia/fibula).

## Classification Structure

### Type 44-A: Infrasyndesmal Fibular Fractures
Fracture below the syndesmosis, syndesmosis intact.

| Code | Description |
|------|-------------|
| 44-A1 | Isolated lateral malleolus (unifocal) |
| 44-A2 | With medial malleolus fracture (bifocal) |
| 44-A3 | With posterior malleolus fracture |

### Type 44-B: Transsyndesmal Fibular Fractures
Fracture at the level of the syndesmosis.

| Code | Description |
|------|-------------|
| 44-B1 | Isolated lateral malleolus |
| 44-B2 | With medial lesion (fracture or ligament) |
| 44-B3 | With medial and posterior malleolus |

### Type 44-C: Suprasyndesmal Fibular Fractures
Fracture above the syndesmosis, syndesmosis injured.

| Code | Description |
|------|-------------|
| 44-C1 | Simple diaphyseal fibular fracture |
| 44-C2 | Multifragmentary (comminuted) fibular fracture |
| 44-C3 | Proximal fibular fracture (Maisonneuve) |

## Subdivisions
Each group can be further subdivided:
- **.1** - Simple fracture pattern
- **.2** - Wedge fracture
- **.3** - Complex/multifragmentary

## Advantages
- Internationally standardized
- Comprehensive and systematic
- Facilitates research and communication
- Correlates with injury severity

## Clinical Use
- **A-type**: Usually stable, often conservative treatment
- **B-type**: Variable stability, assess syndesmosis
- **C-type**: Unstable, usually requires surgery
`

	return []mcp.ResourceContents{
		mcp.TextResourceContents{
			URI:      request.Params.URI,
			MIMEType: "text/markdown",
			Text:     content,
		},
	}, nil
}

// ============================================================================
// Bartonicek Resource
// ============================================================================

func bartonicekResource() mcp.Resource {
	return mcp.NewResource(
		"anklyze://systems/bartonicek",
		"Bartonicek Classification",
		mcp.WithResourceDescription("Bartonicek classification for posterior malleolus fractures (requires CT)"),
		mcp.WithMIMEType("text/markdown"),
	)
}

func bartonicekHandler(ctx context.Context, request mcp.ReadResourceRequest) ([]mcp.ResourceContents, error) {
	content := `# Bartonicek Classification

## Overview
The Bartonicek classification specifically addresses **posterior malleolus fractures** and is based on CT imaging. Standard radiographs often underestimate the size and significance of posterior malleolar fragments.

## Why CT is Essential
- Posterior malleolus fractures are 3D injuries
- X-rays may miss or underestimate fragment size
- CT reveals fracture line orientation and articular involvement
- Essential for surgical planning

## Classification Types

### Type 1: Extraincisural
- **Description**: Small posterolateral avulsion fragment
- **Location**: Does NOT extend to the fibular incisura (notch)
- **Size**: Usually small
- **Stability**: Generally stable
- **Treatment**: Often conservative; surgical if displaced >2mm

### Type 2: Posterolateral
- **Description**: Posterolateral fragment extending to the incisura
- **Location**: Involves the fibular incisura
- **Mechanism**: Most common in SER injuries
- **Stability**: May compromise tibiotalar and syndesmotic stability
- **Treatment**: Fix if >25% articular surface or >2mm step-off

### Type 3: Posteromedial + Posterolateral
- **Description**: Two-part posterior fracture
- **Components**: Both posteromedial and posterolateral fragments
- **Mechanism**: Complex rotational injuries
- **Stability**: Compromised posterior stability
- **Treatment**: Usually requires fixation of both fragments

### Type 4: Large Posterolateral
- **Description**: Large triangular posterolateral fragment
- **Size**: Involves significant articular surface
- **Significance**: Most severe type
- **Stability**: Significant joint instability
- **Treatment**: Requires surgical fixation

## Clinical Significance
- Fragment size affects joint stability and outcomes
- Larger fragments increase risk of post-traumatic arthritis
- Proper classification guides surgical approach
- Posterolateral approach often needed for Type 2-4

## Key Points
1. Always obtain CT for posterior malleolus fractures
2. Assess involvement of the fibular incisura
3. Measure articular surface involvement
4. Consider syndesmotic stability implications
`

	return []mcp.ResourceContents{
		mcp.TextResourceContents{
			URI:      request.Params.URI,
			MIMEType: "text/markdown",
			Text:     content,
		},
	}, nil
}

// ============================================================================
// Decision Flowchart Resource
// ============================================================================

func decisionFlowchartResource() mcp.Resource {
	return mcp.NewResource(
		"anklyze://flowchart/decision-tree",
		"Classification Decision Tree",
		mcp.WithResourceDescription("Decision tree flowchart for ankle fracture classification"),
		mcp.WithMIMEType("text/markdown"),
	)
}

func decisionFlowchartHandler(ctx context.Context, request mcp.ReadResourceRequest) ([]mcp.ResourceContents, error) {
	content := `# Ankle Fracture Classification Decision Tree

## Step 1: Identify Involved Malleoli

Which malleoli are fractured?

` + "```" + `
                        +------------------+
                        | Ankle Fracture   |
                        +------------------+
                                |
        +-------+-------+-------+-------+-------+-------+
        |       |       |       |       |       |       |
    Posterior  Medial  Lateral  M+P    L+P    L+M    Tri
      Only     Only    Only                          maleolar
` + "```" + `

## Step 2: For Lateral Malleolus Involvement

Determine fibular fracture level:

` + "```" + `
    Lateral Malleolus Involved
            |
    +-------+-------+
    |       |       |
Infra-   Trans-   Supra-
syndesmal syndesmal syndesmal
    |       |       |
Weber A  Weber B  Weber C
44-A     44-B     44-C
` + "```" + `

## Step 3: Determine Lauge-Hansen Mechanism

Based on fibular level and morphology:

` + "```" + `
Infrasyndesmal + Transverse  -> SA (Supination-Adduction)
Transsyndesmal + Spiral      -> SER (Supination-External Rotation)
Transsyndesmal + Oblique     -> PA (Pronation-Abduction)
Suprasyndesmal + Long spiral -> PER (Pronation-External Rotation)
Suprasyndesmal + Short oblique -> PA (Pronation-Abduction)
` + "```" + `

## Step 4: Posterior Malleolus (if involved)

If posterior malleolus fractured and CT available:

` + "```" + `
    CT Scan Available?
        |
    +---+---+
    |       |
   Yes      No
    |        |
Bartonicek  Cannot
Type 1-4    classify
            Bartonicek
` + "```" + `

## Quick Reference Table

| Malleoli | Fibular Level | Morphology | Weber | Lauge-Hansen | AO/OTA |
|----------|---------------|------------|-------|--------------|--------|
| Lateral only | Infra | - | A | SA | 44-A1 |
| Lateral only | Trans | Spiral | B | SER | 44-B1 |
| Lateral only | Trans | Oblique | B | PA | 44-B1 |
| Lateral only | Supra | Long spiral | C | PER | 44-C |
| Lateral only | Supra | Short oblique | C | PA | 44-C |
| Medial only | - | Oblique | - | SA | 44-A1 |
| Medial only | - | Transverse | - | Ambiguous | 44-A1 |
| Posterior only | - | - | - | SER | 44-B3 |
| L+M | Infra | Transverse | A | SA | 44-A2 |
| L+M | Trans | Spiral | B | SER | 44-B2 |
| L+M | Trans | Oblique | B | PA | 44-B2 |
| L+P | Trans | Spiral | B | SER | 44-B3 |
| L+P | Trans | Oblique | B | PA | 44-B3 |
| Trimaleolar | Trans | Spiral | B | SER | 44-B3 |
| Trimaleolar | Supra | - | C | PER/PA | 44-C |

## Important Notes

1. **Impossible combinations**: Infrasyndesmal lateral + posterior (SA mechanism doesn't involve posterior malleolus)

2. **Ambiguous cases**: Some patterns can result from multiple mechanisms; clinical correlation required

3. **CT scan**: Essential for Bartonicek classification and accurate assessment of posterior malleolus
`

	return []mcp.ResourceContents{
		mcp.TextResourceContents{
			URI:      request.Params.URI,
			MIMEType: "text/markdown",
			Text:     content,
		},
	}, nil
}
