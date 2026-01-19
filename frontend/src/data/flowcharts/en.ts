export const flowchartEN = `flowchart TB
    A(["Danis-Weber AO/OTA Flow"]) --> B{"Which malleoli are fractured?"}
    B --> C["Posterior malleolus"]
    B --> D["Medial malleolus"]
    B --> n1["Lateral malleolus"]
    B --> n2["Medial and posterior malleoli"]
    B --> n3["Lateral and posterior malleoli"]
    B --> n4["Lateral and medial malleoli"]
    B --> n5["Medial, lateral and posterior malleoli"]

    %% Posterior malleolus branch
    C --> n6{"What type of fracture is it?"}
    n6 --> n7["Extra-incisural fragment"]
    n6 --> n8["Posterolateral fragment"]
    n6 --> n9["Posteromedial and posterolateral fragment"]
    n6 --> n10["Large posterolateral triangular fragment"]
    n7 --> n11["Unimalleolar posterior malleolus<br/>AO 44 B3<br/>Lauge-Hansen SER<br/>Bartonicek 1"]
    n8 --> n12["Unimalleolar posterior malleolus<br/>AO 44 B3<br/>Lauge-Hansen SER<br/>Bartonicek 2"]
    n9 --> n13["Unimalleolar posterior malleolus<br/>AO 44 B3<br/>Lauge-Hansen SER<br/>Bartonicek 3"]
    n10 --> n14["Unimalleolar posterior malleolus<br/>AO 44 B3<br/>Lauge-Hansen SER<br/>Bartonicek 4"]

    %% Medial malleolus branch
    D --> n15{"What morphology does it have?"}
    n15 --> n16["Oblique"]
    n15 --> n17["Transverse"]
    n16 --> n18["Unimalleolar medial malleolus<br/>AO 44 A1<br/>Lauge-Hansen SA"]
    n17 --> n19["Unimalleolar medial malleolus<br/>AO 44 A1<br/>Lauge-Hansen unclassifiable<br/>(could be PA/SER/PER)"]

    %% Lateral malleolus branch
    n1 --> n20{"At what level is the fracture?"}
    n20 --> n21["Infrasyndesmotic"]
    n20 --> n22["Transsyndesmotic"]
    n20 --> n23["Suprasyndesmotic"]

    n21 --> n24{"What is the fracture morphology?"}
    n24 --> n25["Transverse"]
    n24 --> n26["Oblique (Low medial, high lateral)"]
    n25 --> n27["Unimalleolar lateral malleolus<br/>AO 44 A1<br/>Lauge-Hansen SA<br/>Weber A"]
    n26 --> n28["Unimalleolar lateral malleolus<br/>AO 44 A1<br/>Lauge-Hansen PA<br/>Weber A"]

    n22 --> n29{"What is the fracture morphology?"}
    n29 --> n30["Spiral (Low anterior, high posterior)"]
    n29 --> n31["Oblique (Low medial, high lateral)"]
    n30 --> n32["Unimalleolar lateral malleolus<br/>AO 44 B1<br/>Lauge-Hansen SER<br/>Weber B"]
    n31 --> n33["Unimalleolar lateral malleolus<br/>AO 44 B1<br/>Lauge-Hansen PA<br/>Weber B"]

    n23 --> n34{"What type?"}
    n34 --> n35["Simple Diaphyseal"]
    n34 --> n36["Multifragmentary"]
    n34 --> n37["Proximal"]
    n35 --> n39["Unimalleolar lateral malleolus<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C"]
    n36 --> n40["Unimalleolar lateral malleolus<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C"]
    n37 --> n41["Unimalleolar lateral malleolus<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C"]

    %% Medial + Posterior branch
    n2 --> n42["Bimalleolar (Medial + Posterior)<br/>AO 44 B3<br/>Lauge-Hansen SER"]

    %% Lateral + Posterior branch
    n3 --> n43{"At what level is the fibula fracture?"}
    n43 --> n44["Infrasyndesmotic"]
    n43 --> n45["Transsyndesmotic"]
    n43 --> n46["Suprasyndesmotic"]

    n44 --> n47{"What is the fracture morphology?"}
    n47 --> n50["Transverse"]
    n47 --> n51["Oblique (Low medial, high lateral)"]
    n50 --> n66["Not possible: SA mechanism does not involve posterior malleolus"]
    n51 --> n57{"What type is the posterior malleolus?"}

    n45 --> n48{"What is the fracture morphology?"}
    n48 --> n52["Spiral (Low anterior, high posterior)"]
    n48 --> n53["Oblique (Low medial, high lateral)"]
    n52 --> n67{"What type is the posterior malleolus?"}
    n53 --> n76{"What type is the posterior malleolus?"}

    n46 --> n49{"What type?"}
    n49 --> n54["Simple Diaphyseal"]
    n49 --> n55["Multifragmentary"]
    n49 --> n56["Proximal"]
    n54 --> n85{"What type is the posterior malleolus?"}
    n55 --> n94{"What type is the posterior malleolus?"}
    n56 --> n103{"What type is the posterior malleolus?"}

    %% Infrasyndesmotic + Oblique posterior fragments (PA Weber A)
    n57 --> n58["Extra-incisural fragment"]
    n57 --> n59["Posterolateral fragment"]
    n57 --> n60["Posteromedial and posterolateral"]
    n57 --> n61["Large posterolateral triangular"]
    n58 --> n62["Bimalleolar (lateral + posterior)<br/>AO 44 A2<br/>Lauge-Hansen PA<br/>Weber A<br/>Bartonicek 1"]
    n59 --> n63["Bimalleolar (lateral + posterior)<br/>AO 44 A2<br/>Lauge-Hansen PA<br/>Weber A<br/>Bartonicek 2"]
    n60 --> n64["Bimalleolar (lateral + posterior)<br/>AO 44 A2<br/>Lauge-Hansen PA<br/>Weber A<br/>Bartonicek 3"]
    n61 --> n65["Bimalleolar (lateral + posterior)<br/>AO 44 A2<br/>Lauge-Hansen PA<br/>Weber A<br/>Bartonicek 4"]

    %% Transsyndesmotic + Spiral posterior fragments (SER Weber B)
    n67 --> n68["Extra-incisural fragment"]
    n67 --> n69["Posterolateral fragment"]
    n67 --> n70["Posteromedial and posterolateral"]
    n67 --> n71["Large posterolateral triangular"]
    n68 --> n72["Bimalleolar (lateral + posterior)<br/>AO 44 B3<br/>Lauge-Hansen SER<br/>Weber B<br/>Bartonicek 1"]
    n69 --> n73["Bimalleolar (lateral + posterior)<br/>AO 44 B3<br/>Lauge-Hansen SER<br/>Weber B<br/>Bartonicek 2"]
    n70 --> n74["Bimalleolar (lateral + posterior)<br/>AO 44 B3<br/>Lauge-Hansen SER<br/>Weber B<br/>Bartonicek 3"]
    n71 --> n75["Bimalleolar (lateral + posterior)<br/>AO 44 B3<br/>Lauge-Hansen SER<br/>Weber B<br/>Bartonicek 4"]

    %% Transsyndesmotic + Oblique posterior fragments (PA Weber B)
    n76 --> n77["Extra-incisural fragment"]
    n76 --> n78["Posterolateral fragment"]
    n76 --> n79["Posteromedial and posterolateral"]
    n76 --> n80["Large posterolateral triangular"]
    n77 --> n81["Bimalleolar (lateral + posterior)<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B<br/>Bartonicek 1"]
    n78 --> n82["Bimalleolar (lateral + posterior)<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B<br/>Bartonicek 2"]
    n79 --> n83["Bimalleolar (lateral + posterior)<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B<br/>Bartonicek 3"]
    n80 --> n84["Bimalleolar (lateral + posterior)<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B<br/>Bartonicek 4"]

    %% Suprasyndesmotic Simple Diaphyseal posterior fragments (PER Weber C C1)
    n85 --> n86["Extra-incisural fragment"]
    n85 --> n87["Posterolateral fragment"]
    n85 --> n88["Posteromedial and posterolateral"]
    n85 --> n89["Large posterolateral triangular"]
    n86 --> n90["Bimalleolar (lateral + posterior)<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 1"]
    n87 --> n91["Bimalleolar (lateral + posterior)<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 2"]
    n88 --> n92["Bimalleolar (lateral + posterior)<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 3"]
    n89 --> n93["Bimalleolar (lateral + posterior)<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 4"]

    %% Suprasyndesmotic Multifragmentary posterior fragments (PER Weber C C2)
    n94 --> n95["Extra-incisural fragment"]
    n94 --> n96["Posterolateral fragment"]
    n94 --> n97["Posteromedial and posterolateral"]
    n94 --> n98["Large posterolateral triangular"]
    n95 --> n99["Bimalleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 1"]
    n96 --> n100["Bimalleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 2"]
    n97 --> n101["Bimalleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 3"]
    n98 --> n102["Bimalleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 4"]

    %% Suprasyndesmotic Proximal posterior fragments (PER Weber C C3)
    n103 --> n104["Extra-incisural fragment"]
    n103 --> n105["Posterolateral fragment"]
    n103 --> n106["Posteromedial and posterolateral"]
    n103 --> n107["Large posterolateral triangular"]
    n104 --> n108["Bimalleolar (lateral + posterior)<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 1"]
    n105 --> n109["Bimalleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 2"]
    n106 --> n110["Bimalleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 3"]
    n107 --> n111["Bimalleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 4"]

    %% Lateral + Medial branch
    n4 --> n112{"What is the medial malleolus morphology?"}
    n112 --> n113["Oblique/vertical"]
    n112 --> n114["Transverse"]

    n113 --> n115{"Is fibula fracture infrasyndesmotic and transverse?"}
    n115 --> n116["Yes"]
    n115 --> n117["No"]
    n116 --> n118["Bimalleolar (lateral + medial)<br/>AO 44 A2<br/>Lauge-Hansen SA<br/>Weber A"]
    n114 --> n119{"At what level is the fibula fracture?"}
    n117 --> n119

    n119 --> n120["High"]
    n119 --> n121["Low (At tibial plafond or below)"]

    n120 --> n122{"What type?"}
    n122 --> n123["Simple Diaphyseal"]
    n122 --> n124["Multifragmentary"]
    n122 --> n125["Proximal"]
    n123 --> n126["Bimalleolar (lateral + medial)<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C"]
    n124 --> n127["Bimalleolar (lateral + medial)<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C"]
    n125 --> n128["Bimalleolar (lateral + medial)<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C"]

    n121 --> n129{"What is the fibula fracture morphology?"}
    n129 --> n130["Transverse"]
    n129 --> n131["Oblique (low medial, high lateral)"]
    n129 --> n132["Spiral (Low anterior, high posterior)"]

    n130 --> n133{"At what level is the fibula fracture?"}
    n133 --> n134["Infrasyndesmotic"]
    n133 --> n135["Transsyndesmotic"]
    n134 --> n136["Bimalleolar (lateral + medial)<br/>AO 44 A2<br/>Lauge-Hansen SA<br/>Weber A"]
    n135 --> n138["Bimalleolar (lateral + medial)<br/>AO 44 B2<br/>Lauge-Hansen PA<br/>Weber B"]
    n131 --> n139["Bimalleolar (lateral + medial)<br/>AO 44 B2<br/>Lauge-Hansen PA<br/>Weber B"]
    n132 --> n140["Bimalleolar (lateral + medial)<br/>AO 44 B2<br/>Lauge-Hansen SER<br/>Weber B"]

    %% Trimalleolar branch
    n5 --> n141{"At what level is the fibula fracture?"}
    n141 --> n143["High"]
    n141 --> n152["Low (At tibial plafond or below)"]

    n143 --> n145{"What type?"}
    n145 --> n146["Simple Diaphyseal"]
    n145 --> n147["Multifragmentary"]
    n145 --> n148["Proximal"]
    n146 --> n149["Trimalleolar fracture<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C"]
    n147 --> n150["Trimalleolar fracture<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C"]
    n148 --> n151["Trimalleolar fracture<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C"]

    n152 --> n153{"What is the fibula fracture morphology?"}
    n153 --> n154["Transverse"]
    n153 --> n155["Oblique (low medial, high lateral)"]
    n153 --> n156["Spiral (Low anterior, high posterior)"]

    n154 --> n157{"At what level is the fibula fracture?"}
    n157 --> n158["Infrasyndesmotic"]
    n157 --> n159["Transsyndesmotic"]
    n158 --> n160["Not possible: exceptional mechanism"]
    n159 --> n161["Trimalleolar fracture<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B"]
    n155 --> n162["Trimalleolar fracture<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B"]
    n156 --> n163["Trimalleolar fracture<br/>AO 44 B3<br/>Lauge-Hansen SER<br/>Weber B"]

    %% Styling for result nodes
    style n11 fill:#e8f5e9,stroke:#4caf50
    style n12 fill:#e8f5e9,stroke:#4caf50
    style n13 fill:#e8f5e9,stroke:#4caf50
    style n14 fill:#e8f5e9,stroke:#4caf50
    style n18 fill:#e8f5e9,stroke:#4caf50
    style n19 fill:#e8f5e9,stroke:#4caf50
    style n27 fill:#e8f5e9,stroke:#4caf50
    style n28 fill:#e8f5e9,stroke:#4caf50
    style n32 fill:#e8f5e9,stroke:#4caf50
    style n33 fill:#e8f5e9,stroke:#4caf50
    style n39 fill:#e8f5e9,stroke:#4caf50
    style n40 fill:#e8f5e9,stroke:#4caf50
    style n41 fill:#e8f5e9,stroke:#4caf50
    style n42 fill:#e8f5e9,stroke:#4caf50
    style n62 fill:#e8f5e9,stroke:#4caf50
    style n63 fill:#e8f5e9,stroke:#4caf50
    style n64 fill:#e8f5e9,stroke:#4caf50
    style n65 fill:#e8f5e9,stroke:#4caf50
    style n66 fill:#ffebee,stroke:#f44336
    style n72 fill:#e8f5e9,stroke:#4caf50
    style n73 fill:#e8f5e9,stroke:#4caf50
    style n74 fill:#e8f5e9,stroke:#4caf50
    style n75 fill:#e8f5e9,stroke:#4caf50
    style n81 fill:#e8f5e9,stroke:#4caf50
    style n82 fill:#e8f5e9,stroke:#4caf50
    style n83 fill:#e8f5e9,stroke:#4caf50
    style n84 fill:#e8f5e9,stroke:#4caf50
    style n90 fill:#e8f5e9,stroke:#4caf50
    style n91 fill:#e8f5e9,stroke:#4caf50
    style n92 fill:#e8f5e9,stroke:#4caf50
    style n93 fill:#e8f5e9,stroke:#4caf50
    style n99 fill:#e8f5e9,stroke:#4caf50
    style n100 fill:#e8f5e9,stroke:#4caf50
    style n101 fill:#e8f5e9,stroke:#4caf50
    style n102 fill:#e8f5e9,stroke:#4caf50
    style n108 fill:#e8f5e9,stroke:#4caf50
    style n109 fill:#e8f5e9,stroke:#4caf50
    style n110 fill:#e8f5e9,stroke:#4caf50
    style n111 fill:#e8f5e9,stroke:#4caf50
    style n118 fill:#e8f5e9,stroke:#4caf50
    style n126 fill:#e8f5e9,stroke:#4caf50
    style n127 fill:#e8f5e9,stroke:#4caf50
    style n128 fill:#e8f5e9,stroke:#4caf50
    style n136 fill:#e8f5e9,stroke:#4caf50
    style n138 fill:#e8f5e9,stroke:#4caf50
    style n139 fill:#e8f5e9,stroke:#4caf50
    style n140 fill:#e8f5e9,stroke:#4caf50
    style n149 fill:#e8f5e9,stroke:#4caf50
    style n150 fill:#e8f5e9,stroke:#4caf50
    style n151 fill:#e8f5e9,stroke:#4caf50
    style n160 fill:#ffebee,stroke:#f44336
    style n161 fill:#e8f5e9,stroke:#4caf50
    style n162 fill:#e8f5e9,stroke:#4caf50
    style n163 fill:#e8f5e9,stroke:#4caf50
`;
