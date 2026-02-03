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
    C --> n218{"Do you have a CT scan?"}
    n218 --> n219["Yes"]
    n218 --> n220["No"]
    n220 --> n221["Unimalleolar posterior malleolus<br/>AO 44 B3<br/>Lauge-Hansen unclassifiable"]
    n219 --> n6{"What type of fracture is it?"}
    n6 --> n7["Extra-incisural fragment"]
    n6 --> n8["Posterolateral fragment"]
    n6 --> n9["Posteromedial and posterolateral fragment"]
    n6 --> n10["Large posterolateral triangular fragment"]
    n7 --> n11["Unimalleolar posterior malleolus<br/>AO 44 B3<br/>Lauge-Hansen unclassifiable<br/>Bartonicek 1"]
    n8 --> n12["Unimalleolar posterior malleolus<br/>AO 44 B3<br/>Lauge-Hansen unclassifiable<br/>Bartonicek 2"]
    n9 --> n13["Unimalleolar posterior malleolus<br/>AO 44 B3<br/>Lauge-Hansen unclassifiable<br/>Bartonicek 3"]
    n10 --> n14["Unimalleolar posterior malleolus<br/>AO 44 B3<br/>Lauge-Hansen unclassifiable<br/>Bartonicek 4"]

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

    n21 --> n27["Unimalleolar lateral malleolus<br/>AO 44 A1<br/>Lauge-Hansen SA<br/>Weber A"]

    n22 --> n29{"What is the fracture morphology?"}
    n29 --> n30["Spiral (Low anterior, high posterior)"]
    n29 --> n31["Oblique (Low medial, high lateral)/Comminuted"]
    n30 --> n32["Unimalleolar lateral malleolus<br/>AO 44 B1<br/>Lauge-Hansen SER<br/>Weber B"]
    n31 --> n33["Unimalleolar lateral malleolus<br/>AO 44 B1<br/>Lauge-Hansen PA<br/>Weber B"]

    n23 --> n34{"What type?"}
    n34 --> n35["Simple Diaphyseal"]
    n34 --> n36["Multifragmentary"]
    n34 --> n37["Proximal"]

    %% Suprasyndesmotic with fibula trace pattern (Simple)
    n35 --> n286{"What is the fibula fracture pattern?"}
    n286 --> n287["Short/transverse/comminuted"]
    n286 --> n288["Long oblique/spiral"]
    n287 --> n289["Unimalleolar lateral malleolus<br/>AO 44 C1<br/>Lauge-Hansen PA<br/>Weber C"]
    n288 --> n39["Unimalleolar lateral malleolus<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C"]

    %% Suprasyndesmotic with fibula trace pattern (Multifragmentary)
    n36 --> n290{"What is the fibula fracture pattern?"}
    n290 --> n291["Short/transverse/comminuted"]
    n290 --> n292["Long oblique/spiral"]
    n291 --> n293["Unimalleolar lateral malleolus<br/>AO 44 C2<br/>Lauge-Hansen PA<br/>Weber C"]
    n292 --> n40["Unimalleolar lateral malleolus<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C"]

    n37 --> n41["Unimalleolar lateral malleolus<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C"]

    %% Medial + Posterior branch
    n2 --> n264{"Do you have a CT scan?"}
    n264 --> n265["Yes"]
    n264 --> n266["No"]
    n266 --> n272["Bimalleolar (Medial + Posterior)<br/>AO 44 B3<br/>Lauge-Hansen unclassifiable (SER/PA)"]
    n265 --> n267{"What type is the posterior malleolus fracture?"}
    n267 --> n268["Extra-incisural fragment"]
    n267 --> n269["Posterolateral fragment"]
    n267 --> n270["Posteromedial and posterolateral"]
    n267 --> n271["Large posterolateral triangular fragment"]
    n268 --> n273["Bimalleolar (Medial + Posterior)<br/>AO 44 B3<br/>Lauge-Hansen unclassifiable (SER/PA)<br/>Bartonicek 1"]
    n269 --> n274["Bimalleolar (Medial + Posterior)<br/>AO 44 B3<br/>Lauge-Hansen unclassifiable (SER/PA)<br/>Bartonicek 2"]
    n270 --> n275["Bimalleolar (Medial + Posterior)<br/>AO 44 B3<br/>Lauge-Hansen unclassifiable (SER/PA)<br/>Bartonicek 3"]
    n271 --> n276["Bimalleolar (Medial + Posterior)<br/>AO 44 B3<br/>Lauge-Hansen unclassifiable (SER/PA)<br/>Bartonicek 4"]

    %% Lateral + Posterior branch
    n3 --> n43{"At what level is the fibula fracture?"}
    n43 --> n44["Infrasyndesmotic"]
    n43 --> n45["Transsyndesmotic"]
    n43 --> n46["Suprasyndesmotic"]

    n44 --> n66["Not possible: SA mechanism does not involve posterior malleolus.<br/>PA mechanism is transsyndesmotic or suprasyndesmotic."]

    n45 --> n48{"What is the fracture morphology?"}
    n48 --> n52["Spiral (Low anterior, high posterior)"]
    n48 --> n53["Oblique (Low medial, high lateral)/Comminuted"]

    %% Transsyndesmotic spiral - CT scan
    n52 --> n223{"Do you have a CT scan?"}
    n223 --> n224["Yes"]
    n223 --> n225["No"]
    n225 --> n226["Bimalleolar (lateral + posterior)<br/>AO 44 B3<br/>Lauge-Hansen SER<br/>Weber B"]
    n224 --> n67{"What type is the posterior malleolus?"}

    %% Transsyndesmotic oblique - CT scan
    n53 --> n227{"Do you have a CT scan?"}
    n227 --> n228["Yes"]
    n227 --> n344["No"]
    n344 --> n229["Bimalleolar (lateral + posterior)<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B"]
    n228 --> n76{"What type is the posterior malleolus?"}

    n46 --> n49{"What type?"}
    n49 --> n54["Simple Diaphyseal"]
    n49 --> n55["Multifragmentary"]
    n49 --> n56["Proximal"]

    %% Suprasyndesmotic Simple - fibula pattern
    n54 --> n307{"What is the fibula fracture pattern?"}
    n307 --> n308["Short/transverse/comminuted"]
    n307 --> n309["Long oblique/spiral"]
    n309 --> n230{"Do you have a CT scan?"}
    n308 --> n303{"Do you have a CT scan?"}

    %% Suprasyndesmotic Multifragmentary - fibula pattern
    n55 --> n310{"What is the fibula fracture pattern?"}
    n310 --> n311["Short/transverse/comminuted"]
    n310 --> n312["Long oblique/spiral"]
    n312 --> n233{"Do you have a CT scan?"}
    n311 --> n313{"Do you have a CT scan?"}

    n56 --> n237{"Do you have a CT scan?"}

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

    %% Suprasyndesmotic Simple PER (long pattern) - CT scan
    n230 --> n231["Yes"]
    n230 --> n285["No"]
    n285 --> n232["Bimalleolar (lateral + posterior)<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C"]
    n231 --> n85{"What type is the posterior malleolus?"}

    %% Suprasyndesmotic Simple PA (short pattern) - CT scan
    n303 --> n304["Yes"]
    n303 --> n305["No"]
    n305 --> n306["Bimalleolar (lateral + posterior)<br/>AO 44 C1<br/>Lauge-Hansen PA<br/>Weber C"]
    n304 --> n294{"What type is the posterior malleolus?"}

    %% Suprasyndesmotic Multifrag PER (long pattern) - CT scan
    n233 --> n234["Yes"]
    n233 --> n235["No"]
    n235 --> n236["Bimalleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C"]
    n234 --> n94{"What type is the posterior malleolus?"}

    %% Suprasyndesmotic Multifrag PA (short pattern) - CT scan
    n313 --> n314["Yes"]
    n313 --> n315["No"]
    n315 --> n316["Bimalleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PA<br/>Weber C"]
    n314 --> n325{"What type is the posterior malleolus?"}

    %% Suprasyndesmotic Proximal - CT scan
    n237 --> n238["Yes"]
    n237 --> n239["No"]
    n239 --> n240["Bimalleolar (lateral + posterior)<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C"]
    n238 --> n103{"What type is the posterior malleolus?"}

    %% Suprasyndesmotic Simple Diaphyseal PER posterior fragments
    n85 --> n86["Extra-incisural fragment"]
    n85 --> n87["Posterolateral fragment"]
    n85 --> n88["Posteromedial and posterolateral"]
    n85 --> n89["Large posterolateral triangular"]
    n86 --> n90["Bimalleolar (lateral + posterior)<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 1"]
    n87 --> n91["Bimalleolar (lateral + posterior)<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 2"]
    n88 --> n92["Bimalleolar (lateral + posterior)<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 3"]
    n89 --> n93["Bimalleolar (lateral + posterior)<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 4"]

    %% Suprasyndesmotic Simple Diaphyseal PA posterior fragments
    n294 --> n295["Extra-incisural fragment"]
    n294 --> n296["Posterolateral fragment"]
    n294 --> n297["Posteromedial and posterolateral"]
    n294 --> n298["Large posterolateral triangular"]
    n295 --> n299["Bimalleolar (lateral + posterior)<br/>AO 44 C1<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 1"]
    n296 --> n300["Bimalleolar (lateral + posterior)<br/>AO 44 C1<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 2"]
    n297 --> n301["Bimalleolar (lateral + posterior)<br/>AO 44 C1<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 3"]
    n298 --> n302["Bimalleolar (lateral + posterior)<br/>AO 44 C1<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 4"]

    %% Suprasyndesmotic Multifragmentary PER posterior fragments
    n94 --> n95["Extra-incisural fragment"]
    n94 --> n96["Posterolateral fragment"]
    n94 --> n97["Posteromedial and posterolateral"]
    n94 --> n98["Large posterolateral triangular"]
    n95 --> n99["Bimalleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 1"]
    n96 --> n100["Bimalleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 2"]
    n97 --> n101["Bimalleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 3"]
    n98 --> n102["Bimalleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 4"]

    %% Suprasyndesmotic Multifragmentary PA posterior fragments
    n325 --> n326["Extra-incisural fragment"]
    n325 --> n329["Posterolateral fragment"]
    n325 --> n330["Posteromedial and posterolateral"]
    n325 --> n331["Large posterolateral triangular"]
    n326 --> n332["Bimalleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 1"]
    n329 --> n333["Bimalleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 2"]
    n330 --> n334["Bimalleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 3"]
    n331 --> n335["Bimalleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 4"]

    %% Suprasyndesmotic Proximal posterior fragments (PER Weber C C3)
    n103 --> n104["Extra-incisural fragment"]
    n103 --> n105["Posterolateral fragment"]
    n103 --> n106["Posteromedial and posterolateral"]
    n103 --> n107["Large posterolateral triangular"]
    n104 --> n108["Bimalleolar (lateral + posterior)<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 1"]
    n105 --> n109["Bimalleolar (lateral + posterior)<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 2"]
    n106 --> n110["Bimalleolar (lateral + posterior)<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 3"]
    n107 --> n111["Bimalleolar (lateral + posterior)<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 4"]

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

    n119 --> n120["High (Suprasyndesmotic)"]
    n119 --> n121["Low (At tibial plafond or below)"]

    n120 --> n122{"What type?"}
    n122 --> n123["Simple Diaphyseal"]
    n122 --> n124["Multifragmentary"]
    n122 --> n125["Proximal"]

    %% Suprasyndesmotic Simple - fibula pattern
    n123 --> n336{"What is the fibula fracture pattern?"}
    n336 --> n337["Short/transverse/comminuted"]
    n336 --> n338["Long oblique/spiral"]
    n337 --> n339["Bimalleolar (lateral + medial)<br/>AO 44 C1<br/>Lauge-Hansen PA<br/>Weber C"]
    n338 --> n126["Bimalleolar (lateral + medial)<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C"]

    %% Suprasyndesmotic Multifragmentary - fibula pattern
    n124 --> n340{"What is the fibula fracture pattern?"}
    n340 --> n341["Short/transverse/comminuted"]
    n340 --> n342["Long oblique/spiral"]
    n341 --> n343["Bimalleolar (lateral + medial)<br/>AO 44 C2<br/>Lauge-Hansen PA<br/>Weber C"]
    n342 --> n127["Bimalleolar (lateral + medial)<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C"]

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
    n141 --> n143["High (Suprasyndesmotic)"]
    n141 --> n152["Low (At tibial plafond or below)"]

    n143 --> n145{"What type?"}
    n145 --> n146["Simple Diaphyseal"]
    n145 --> n147["Multifragmentary"]
    n145 --> n148["Proximal"]

    %% Trimalleolar Suprasyndesmotic Simple - fibula pattern
    n146 --> n345{"What is the fibula fracture pattern?"}
    n345 --> n346["Short/transverse/comminuted"]
    n345 --> n347["Long oblique/spiral"]
    n347 --> n241{"Do you have a CT scan?"}
    n346 --> n348{"Do you have a CT scan?"}

    %% Trimalleolar Suprasyndesmotic Multifrag - fibula pattern
    n147 --> n363{"What is the fibula fracture pattern?"}
    n363 --> n364["Short/transverse/comminuted"]
    n363 --> n365["Long oblique/spiral"]
    n365 --> n245{"Do you have a CT scan?"}
    n364 --> n366{"Do you have a CT scan?"}

    n148 --> n249{"Do you have a CT scan?"}

    %% Trimalleolar Simple PER (long pattern) - CT scan
    n241 --> n242["Yes"]
    n241 --> n243["No"]
    n243 --> n244["Trimalleolar fracture<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C"]
    n242 --> n164{"What type is the posterior malleolus?"}

    %% Trimalleolar Simple PA (short pattern) - CT scan
    n348 --> n349["Yes"]
    n348 --> n350["No"]
    n350 --> n352["Trimalleolar fracture<br/>AO 44 C1<br/>Lauge-Hansen PA<br/>Weber C"]
    n349 --> n351{"What type is the posterior malleolus?"}

    %% Trimalleolar Multifrag PER (long pattern) - CT scan
    n245 --> n246["Yes"]
    n245 --> n247["No"]
    n247 --> n248["Trimalleolar fracture<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C"]
    n246 --> n173{"What type is the posterior malleolus?"}

    %% Trimalleolar Multifrag PA (short pattern) - CT scan
    n366 --> n367["Yes"]
    n366 --> n368["No"]
    n368 --> n369["Trimalleolar fracture<br/>AO 44 C2<br/>Lauge-Hansen PA<br/>Weber C"]
    n367 --> n370{"What type is the posterior malleolus?"}

    %% Trimalleolar Proximal - CT scan
    n249 --> n250["Yes"]
    n249 --> n251["No"]
    n251 --> n252["Trimalleolar fracture<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C"]
    n250 --> n182{"What type is the posterior malleolus?"}

    %% Trimalleolar Simple PER posterior fragments
    n164 --> n165["Extra-incisural fragment"]
    n164 --> n166["Posterolateral fragment"]
    n164 --> n167["Posteromedial and posterolateral"]
    n164 --> n168["Large posterolateral triangular"]
    n165 --> n169["Trimalleolar fracture<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 1"]
    n166 --> n170["Trimalleolar fracture<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 2"]
    n167 --> n171["Trimalleolar fracture<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 3"]
    n168 --> n172["Trimalleolar fracture<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 4"]

    %% Trimalleolar Simple PA posterior fragments
    n351 --> n353["Extra-incisural fragment"]
    n351 --> n354["Posterolateral fragment"]
    n351 --> n355["Posteromedial and posterolateral"]
    n351 --> n356["Large posterolateral triangular"]
    n353 --> n357["Trimalleolar fracture<br/>AO 44 C1<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 1"]
    n354 --> n358["Trimalleolar fracture<br/>AO 44 C1<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 2"]
    n355 --> n359["Trimalleolar fracture<br/>AO 44 C1<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 3"]
    n356 --> n362["Trimalleolar fracture<br/>AO 44 C1<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 4"]

    %% Trimalleolar Multifrag PER posterior fragments
    n173 --> n174["Extra-incisural fragment"]
    n173 --> n175["Posterolateral fragment"]
    n173 --> n176["Posteromedial and posterolateral"]
    n173 --> n177["Large posterolateral triangular"]
    n174 --> n178["Trimalleolar fracture<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 1"]
    n175 --> n179["Trimalleolar fracture<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 2"]
    n176 --> n180["Trimalleolar fracture<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 3"]
    n177 --> n181["Trimalleolar fracture<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 4"]

    %% Trimalleolar Multifrag PA posterior fragments
    n370 --> n371["Extra-incisural fragment"]
    n370 --> n372["Posterolateral fragment"]
    n370 --> n373["Posteromedial and posterolateral"]
    n370 --> n374["Large posterolateral triangular"]
    n371 --> n375["Trimalleolar fracture<br/>AO 44 C2<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 1"]
    n372 --> n376["Trimalleolar fracture<br/>AO 44 C2<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 2"]
    n373 --> n377["Trimalleolar fracture<br/>AO 44 C2<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 3"]
    n374 --> n378["Trimalleolar fracture<br/>AO 44 C2<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 4"]

    %% Trimalleolar Proximal posterior fragments
    n182 --> n183["Extra-incisural fragment"]
    n182 --> n184["Posterolateral fragment"]
    n182 --> n185["Posteromedial and posterolateral"]
    n182 --> n186["Large posterolateral triangular"]
    n183 --> n187["Trimalleolar fracture<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 1"]
    n184 --> n188["Trimalleolar fracture<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 2"]
    n185 --> n189["Trimalleolar fracture<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 3"]
    n186 --> n190["Trimalleolar fracture<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 4"]

    n152 --> n153{"What is the fibula fracture morphology?"}
    n153 --> n154["Transverse"]
    n153 --> n155["Oblique (low medial, high lateral)"]
    n153 --> n156["Spiral (Low anterior, high posterior)"]

    n154 --> n157{"At what level is the fibula fracture?"}
    n157 --> n158["Infrasyndesmotic"]
    n157 --> n159["Transsyndesmotic"]
    n158 --> n160["Not possible: exceptional mechanism"]

    %% Trimalleolar transverse transsyndesmotic - CT scan
    n159 --> n253{"Do you have a CT scan?"}
    n253 --> n254["Yes"]
    n253 --> n255["No"]
    n255 --> n256["Trimalleolar fracture<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B"]
    n254 --> n191{"What type is the posterior malleolus?"}

    %% Trimalleolar oblique - CT scan
    n155 --> n253b{"Do you have a CT scan?"}
    n253b --> n254b["Yes"]
    n253b --> n255b["No"]
    n255b --> n162["Trimalleolar fracture<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B"]
    n254b --> n191b{"What type is the posterior malleolus?"}

    %% Trimalleolar spiral - CT scan
    n156 --> n260{"Do you have a CT scan?"}
    n260 --> n261["Yes"]
    n260 --> n262["No"]
    n262 --> n263["Trimalleolar fracture<br/>AO 44 B3<br/>Lauge-Hansen SER<br/>Weber B"]
    n261 --> n201{"What type is the posterior malleolus?"}

    %% Trimalleolar PA transverse posterior fragments
    n191 --> n192["Extra-incisural fragment"]
    n191 --> n193["Posterolateral fragment"]
    n191 --> n194["Posteromedial and posterolateral"]
    n191 --> n195["Large posterolateral triangular"]
    n192 --> n196["Trimalleolar fracture<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B<br/>Bartonicek 1"]
    n193 --> n197["Trimalleolar fracture<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B<br/>Bartonicek 2"]
    n194 --> n198["Trimalleolar fracture<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B<br/>Bartonicek 3"]
    n195 --> n199["Trimalleolar fracture<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B<br/>Bartonicek 4"]

    %% Trimalleolar PA oblique posterior fragments
    n191b --> n192b["Extra-incisural fragment"]
    n191b --> n193b["Posterolateral fragment"]
    n191b --> n194b["Posteromedial and posterolateral"]
    n191b --> n195b["Large posterolateral triangular"]
    n192b --> n196b["Trimalleolar fracture<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B<br/>Bartonicek 1"]
    n193b --> n197b["Trimalleolar fracture<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B<br/>Bartonicek 2"]
    n194b --> n198b["Trimalleolar fracture<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B<br/>Bartonicek 3"]
    n195b --> n199b["Trimalleolar fracture<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B<br/>Bartonicek 4"]

    %% Trimalleolar SER posterior fragments
    n201 --> n206["Extra-incisural fragment"]
    n201 --> n207["Posterolateral fragment"]
    n201 --> n208["Posteromedial and posterolateral"]
    n201 --> n209["Large posterolateral triangular"]
    n206 --> n214["Trimalleolar fracture<br/>AO 44 B3<br/>Lauge-Hansen SER<br/>Weber B<br/>Bartonicek 1"]
    n207 --> n215["Trimalleolar fracture<br/>AO 44 B3<br/>Lauge-Hansen SER<br/>Weber B<br/>Bartonicek 2"]
    n208 --> n216["Trimalleolar fracture<br/>AO 44 B3<br/>Lauge-Hansen SER<br/>Weber B<br/>Bartonicek 3"]
    n209 --> n217["Trimalleolar fracture<br/>AO 44 B3<br/>Lauge-Hansen SER<br/>Weber B<br/>Bartonicek 4"]

    %% Styling for result nodes
    style n11 fill:#e8f5e9,stroke:#4caf50
    style n12 fill:#e8f5e9,stroke:#4caf50
    style n13 fill:#e8f5e9,stroke:#4caf50
    style n14 fill:#e8f5e9,stroke:#4caf50
    style n18 fill:#e8f5e9,stroke:#4caf50
    style n19 fill:#e8f5e9,stroke:#4caf50
    style n27 fill:#e8f5e9,stroke:#4caf50
    style n32 fill:#e8f5e9,stroke:#4caf50
    style n33 fill:#e8f5e9,stroke:#4caf50
    style n39 fill:#e8f5e9,stroke:#4caf50
    style n40 fill:#e8f5e9,stroke:#4caf50
    style n41 fill:#e8f5e9,stroke:#4caf50
    style n221 fill:#e8f5e9,stroke:#4caf50
    style n272 fill:#e8f5e9,stroke:#4caf50
    style n273 fill:#e8f5e9,stroke:#4caf50
    style n274 fill:#e8f5e9,stroke:#4caf50
    style n275 fill:#e8f5e9,stroke:#4caf50
    style n276 fill:#e8f5e9,stroke:#4caf50
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
    style n160 fill:#ffebee,stroke:#f44336
    style n169 fill:#e8f5e9,stroke:#4caf50
    style n170 fill:#e8f5e9,stroke:#4caf50
    style n171 fill:#e8f5e9,stroke:#4caf50
    style n172 fill:#e8f5e9,stroke:#4caf50
    style n178 fill:#e8f5e9,stroke:#4caf50
    style n179 fill:#e8f5e9,stroke:#4caf50
    style n180 fill:#e8f5e9,stroke:#4caf50
    style n181 fill:#e8f5e9,stroke:#4caf50
    style n187 fill:#e8f5e9,stroke:#4caf50
    style n188 fill:#e8f5e9,stroke:#4caf50
    style n189 fill:#e8f5e9,stroke:#4caf50
    style n190 fill:#e8f5e9,stroke:#4caf50
    style n196 fill:#e8f5e9,stroke:#4caf50
    style n197 fill:#e8f5e9,stroke:#4caf50
    style n198 fill:#e8f5e9,stroke:#4caf50
    style n199 fill:#e8f5e9,stroke:#4caf50
    style n214 fill:#e8f5e9,stroke:#4caf50
    style n215 fill:#e8f5e9,stroke:#4caf50
    style n216 fill:#e8f5e9,stroke:#4caf50
    style n217 fill:#e8f5e9,stroke:#4caf50
    style n226 fill:#e8f5e9,stroke:#4caf50
    style n229 fill:#e8f5e9,stroke:#4caf50
    style n232 fill:#e8f5e9,stroke:#4caf50
    style n236 fill:#e8f5e9,stroke:#4caf50
    style n240 fill:#e8f5e9,stroke:#4caf50
    style n244 fill:#e8f5e9,stroke:#4caf50
    style n248 fill:#e8f5e9,stroke:#4caf50
    style n252 fill:#e8f5e9,stroke:#4caf50
    style n256 fill:#e8f5e9,stroke:#4caf50
    style n162 fill:#e8f5e9,stroke:#4caf50
    style n263 fill:#e8f5e9,stroke:#4caf50
    style n289 fill:#e8f5e9,stroke:#4caf50
    style n293 fill:#e8f5e9,stroke:#4caf50
    style n299 fill:#e8f5e9,stroke:#4caf50
    style n300 fill:#e8f5e9,stroke:#4caf50
    style n301 fill:#e8f5e9,stroke:#4caf50
    style n302 fill:#e8f5e9,stroke:#4caf50
    style n306 fill:#e8f5e9,stroke:#4caf50
    style n316 fill:#e8f5e9,stroke:#4caf50
    style n332 fill:#e8f5e9,stroke:#4caf50
    style n333 fill:#e8f5e9,stroke:#4caf50
    style n334 fill:#e8f5e9,stroke:#4caf50
    style n335 fill:#e8f5e9,stroke:#4caf50
    style n339 fill:#e8f5e9,stroke:#4caf50
    style n343 fill:#e8f5e9,stroke:#4caf50
    style n352 fill:#e8f5e9,stroke:#4caf50
    style n357 fill:#e8f5e9,stroke:#4caf50
    style n358 fill:#e8f5e9,stroke:#4caf50
    style n359 fill:#e8f5e9,stroke:#4caf50
    style n362 fill:#e8f5e9,stroke:#4caf50
    style n369 fill:#e8f5e9,stroke:#4caf50
    style n375 fill:#e8f5e9,stroke:#4caf50
    style n376 fill:#e8f5e9,stroke:#4caf50
    style n377 fill:#e8f5e9,stroke:#4caf50
    style n378 fill:#e8f5e9,stroke:#4caf50
    style n196b fill:#e8f5e9,stroke:#4caf50
    style n197b fill:#e8f5e9,stroke:#4caf50
    style n198b fill:#e8f5e9,stroke:#4caf50
    style n199b fill:#e8f5e9,stroke:#4caf50
`;
