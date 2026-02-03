export const flowchartES = `flowchart TB
    A(["Flujo Danis-Weber AO/OTA"]) --> B{"¿Qué maléolos tiene fracturados?"}
    B --> C["Maléolo posterior"]
    B --> D["Maléolo medial"]
    B --> n1["Maléolo lateral"]
    B --> n2["Maléolos medial y posterior"]
    B --> n3["Maléolos lateral y posterior"]
    B --> n4["Maléolos lateral y medial"]
    B --> n5["Maléolos medial, lateral y posterior"]

    %% Rama maléolo posterior
    C --> n218{"¿Tiene TAC?"}
    n218 --> n219["Sí"]
    n218 --> n220["No"]
    n220 --> n221["Unimaleolar maléolo posterior<br/>AO 44 B3<br/>Lauge-Hansen no clasificable"]
    n219 --> n6{"¿Qué tipo de fractura es?"}
    n6 --> n7["Fragmento extraincisural"]
    n6 --> n8["Fragmento posterolateral"]
    n6 --> n9["Fragmento posteromedial y posterolateral"]
    n6 --> n10["Gran fragmento triangular posterolateral"]
    n7 --> n11["Unimaleolar maléolo posterior<br/>AO 44 B3<br/>Lauge-Hansen no clasificable<br/>Bartonicek 1"]
    n8 --> n12["Unimaleolar maléolo posterior<br/>AO 44 B3<br/>Lauge-Hansen no clasificable<br/>Bartonicek 2"]
    n9 --> n13["Unimaleolar maléolo posterior<br/>AO 44 B3<br/>Lauge-Hansen no clasificable<br/>Bartonicek 3"]
    n10 --> n14["Unimaleolar maléolo posterior<br/>AO 44 B3<br/>Lauge-Hansen no clasificable<br/>Bartonicek 4"]

    %% Rama maléolo medial
    D --> n15{"¿Qué morfología tiene?"}
    n15 --> n16["Oblicuo"]
    n15 --> n17["Transverso"]
    n16 --> n18["Unimaleolar maléolo medial<br/>AO 44 A1<br/>Lauge-Hansen SA"]
    n17 --> n19["Unimaleolar maléolo medial<br/>AO 44 A1<br/>Lauge-Hansen no clasificable<br/>(podría ser PA/SER/PER)"]

    %% Rama maléolo lateral
    n1 --> n20{"¿A qué nivel está la fractura?"}
    n20 --> n21["Infrasindesmal"]
    n20 --> n22["Transindesmal"]
    n20 --> n23["Suprasindesmal"]

    n21 --> n27["Unimaleolar maléolo lateral<br/>AO 44 A1<br/>Lauge-Hansen SA<br/>Weber A"]

    n22 --> n29{"¿De qué morfología es la fractura?"}
    n29 --> n30["Espiroidea (Baja anterior, alta posterior)"]
    n29 --> n31["Transversa/Oblicua (Baja medial, alta lateral)/Conminuta"]
    n30 --> n32["Unimaleolar maléolo lateral<br/>AO 44 B1<br/>Lauge-Hansen SER<br/>Weber B"]
    n31 --> n33["Unimaleolar maléolo lateral<br/>AO 44 B1<br/>Lauge-Hansen PA<br/>Weber B"]

    n23 --> n34{"¿De qué tipo?"}
    n34 --> n35["Diafisaria Simple"]
    n34 --> n36["Multifragmentaria"]
    n34 --> n37["Proximal"]

    %% Suprasindesmal con trazo del peroné (Simple)
    n35 --> n286{"¿Cómo es el trazo del peroné?"}
    n286 --> n287["Corto/transverso/conminuto"]
    n286 --> n288["Oblicuo largo/espiroideo"]
    n287 --> n289["Unimaleolar maléolo lateral<br/>AO 44 C1<br/>Lauge-Hansen PA<br/>Weber C"]
    n288 --> n39["Unimaleolar maléolo lateral<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C"]

    %% Suprasindesmal con trazo del peroné (Multifragmentaria)
    n36 --> n290{"¿Cómo es el trazo del peroné?"}
    n290 --> n291["Corto/transverso/conminuto"]
    n290 --> n292["Oblicuo largo/espiroideo"]
    n291 --> n293["Unimaleolar maléolo lateral<br/>AO 44 C2<br/>Lauge-Hansen PA<br/>Weber C"]
    n292 --> n40["Unimaleolar maléolo lateral<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C"]

    n37 --> n41["Unimaleolar maléolo lateral<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C"]

    %% Rama Medial + Posterior
    n2 --> n264{"¿Tiene TAC?"}
    n264 --> n265["Sí"]
    n264 --> n266["No"]
    n266 --> n272["Bimaleolar (Medial + Posterior)<br/>AO 44 B3<br/>Lauge-Hansen no clasificable (SER/PA)"]
    n265 --> n267{"¿Qué tipo de fractura es el maléolo posterior?"}
    n267 --> n268["Fragmento extraincisural"]
    n267 --> n269["Fragmento posterolateral"]
    n267 --> n270["Posteromedial y posterolateral"]
    n267 --> n271["Gran fragmento triangular posterolateral"]
    n268 --> n273["Bimaleolar (Medial + Posterior)<br/>AO 44 B3<br/>Lauge-Hansen no clasificable (SER/PA)<br/>Bartonicek 1"]
    n269 --> n274["Bimaleolar (Medial + Posterior)<br/>AO 44 B3<br/>Lauge-Hansen no clasificable (SER/PA)<br/>Bartonicek 2"]
    n270 --> n275["Bimaleolar (Medial + Posterior)<br/>AO 44 B3<br/>Lauge-Hansen no clasificable (SER/PA)<br/>Bartonicek 3"]
    n271 --> n276["Bimaleolar (Medial + Posterior)<br/>AO 44 B3<br/>Lauge-Hansen no clasificable (SER/PA)<br/>Bartonicek 4"]

    %% Rama Lateral + Posterior
    n3 --> n43{"¿A qué nivel está la fractura de peroné?"}
    n43 --> n44["Infrasindesmal"]
    n43 --> n45["Transindesmal"]
    n43 --> n46["Suprasindesmal"]

    n44 --> n66["No posible: El mecanismo SA no arranca el maléolo posterior.<br/>Mecanismo PA son transindesmales o suprasindesmales."]

    n45 --> n48{"¿De qué morfología es la fractura?"}
    n48 --> n52["Espiroidea (Baja anterior, alta posterior)"]
    n48 --> n53["Transversa/Oblicua (Baja medial, alta lateral)/Conminuta"]

    %% Transindesmal espiroidea - CT scan
    n52 --> n223{"¿Tiene TAC?"}
    n223 --> n224["Sí"]
    n223 --> n225["No"]
    n225 --> n226["Bimaleolar (lateral + posterior)<br/>AO 44 B3<br/>Lauge-Hansen SER<br/>Weber B"]
    n224 --> n67{"¿Qué tipo es el maléolo posterior?"}

    %% Transindesmal oblicua - CT scan
    n53 --> n227{"¿Tiene TAC?"}
    n227 --> n228["Sí"]
    n227 --> n344["No"]
    n344 --> n229["Bimaleolar (lateral + posterior)<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B"]
    n228 --> n76{"¿Qué tipo es el maléolo posterior?"}

    n46 --> n49{"¿De qué tipo?"}
    n49 --> n54["Diafisaria Simple"]
    n49 --> n55["Multifragmentaria"]
    n49 --> n56["Proximal"]

    %% Suprasindesmal Simple - trazo peroné
    n54 --> n307{"¿Cómo es el trazo del peroné?"}
    n307 --> n308["Corto/transverso/conminuto"]
    n307 --> n309["Oblicuo largo/espiroideo"]
    n309 --> n230{"¿Tiene TAC?"}
    n308 --> n303{"¿Tiene TAC?"}

    %% Suprasindesmal Multifragmentaria - trazo peroné
    n55 --> n310{"¿Cómo es el trazo del peroné?"}
    n310 --> n311["Corto/transverso/conminuto"]
    n310 --> n312["Oblicuo largo/espiroideo"]
    n312 --> n233{"¿Tiene TAC?"}
    n311 --> n313{"¿Tiene TAC?"}

    n56 --> n237{"¿Tiene TAC?"}

    %% Transindesmal + Espiroidea fragmentos posteriores (SER Weber B)
    n67 --> n68["Fragmento extraincisural"]
    n67 --> n69["Fragmento posterolateral"]
    n67 --> n70["Posteromedial y posterolateral"]
    n67 --> n71["Gran fragmento triangular posterolateral"]
    n68 --> n72["Bimaleolar (lateral + posterior)<br/>AO 44 B3<br/>Lauge-Hansen SER<br/>Weber B<br/>Bartonicek 1"]
    n69 --> n73["Bimaleolar (lateral + posterior)<br/>AO 44 B3<br/>Lauge-Hansen SER<br/>Weber B<br/>Bartonicek 2"]
    n70 --> n74["Bimaleolar (lateral + posterior)<br/>AO 44 B3<br/>Lauge-Hansen SER<br/>Weber B<br/>Bartonicek 3"]
    n71 --> n75["Bimaleolar (lateral + posterior)<br/>AO 44 B3<br/>Lauge-Hansen SER<br/>Weber B<br/>Bartonicek 4"]

    %% Transindesmal + Oblicua fragmentos posteriores (PA Weber B)
    n76 --> n77["Fragmento extraincisural"]
    n76 --> n78["Fragmento posterolateral"]
    n76 --> n79["Posteromedial y posterolateral"]
    n76 --> n80["Gran fragmento triangular posterolateral"]
    n77 --> n81["Bimaleolar (lateral + posterior)<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B<br/>Bartonicek 1"]
    n78 --> n82["Bimaleolar (lateral + posterior)<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B<br/>Bartonicek 2"]
    n79 --> n83["Bimaleolar (lateral + posterior)<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B<br/>Bartonicek 3"]
    n80 --> n84["Bimaleolar (lateral + posterior)<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B<br/>Bartonicek 4"]

    %% Suprasindesmal Simple PER (trazo largo) - CT scan
    n230 --> n231["Sí"]
    n230 --> n285["No"]
    n285 --> n232["Bimaleolar (lateral + posterior)<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C"]
    n231 --> n85{"¿Qué tipo es el maléolo posterior?"}

    %% Suprasindesmal Simple PA (trazo corto) - CT scan
    n303 --> n304["Sí"]
    n303 --> n305["No"]
    n305 --> n306["Bimaleolar (lateral + posterior)<br/>AO 44 C1<br/>Lauge-Hansen PA<br/>Weber C"]
    n304 --> n294{"¿Qué tipo es el maléolo posterior?"}

    %% Suprasindesmal Multifrag PER (trazo largo) - CT scan
    n233 --> n234["Sí"]
    n233 --> n235["No"]
    n235 --> n236["Bimaleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C"]
    n234 --> n94{"¿Qué tipo es el maléolo posterior?"}

    %% Suprasindesmal Multifrag PA (trazo corto) - CT scan
    n313 --> n314["Sí"]
    n313 --> n315["No"]
    n315 --> n316["Bimaleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PA<br/>Weber C"]
    n314 --> n325{"¿Qué tipo es el maléolo posterior?"}

    %% Suprasindesmal Proximal - CT scan
    n237 --> n238["Sí"]
    n237 --> n239["No"]
    n239 --> n240["Bimaleolar (lateral + posterior)<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C"]
    n238 --> n103{"¿Qué tipo es el maléolo posterior?"}

    %% Suprasindesmal Diafisaria Simple PER fragmentos posteriores
    n85 --> n86["Fragmento extraincisural"]
    n85 --> n87["Fragmento posterolateral"]
    n85 --> n88["Posteromedial y posterolateral"]
    n85 --> n89["Gran fragmento triangular posterolateral"]
    n86 --> n90["Bimaleolar (lateral + posterior)<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 1"]
    n87 --> n91["Bimaleolar (lateral + posterior)<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 2"]
    n88 --> n92["Bimaleolar (lateral + posterior)<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 3"]
    n89 --> n93["Bimaleolar (lateral + posterior)<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 4"]

    %% Suprasindesmal Diafisaria Simple PA fragmentos posteriores
    n294 --> n295["Fragmento extraincisural"]
    n294 --> n296["Fragmento posterolateral"]
    n294 --> n297["Posteromedial y posterolateral"]
    n294 --> n298["Gran fragmento triangular posterolateral"]
    n295 --> n299["Bimaleolar (lateral + posterior)<br/>AO 44 C1<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 1"]
    n296 --> n300["Bimaleolar (lateral + posterior)<br/>AO 44 C1<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 2"]
    n297 --> n301["Bimaleolar (lateral + posterior)<br/>AO 44 C1<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 3"]
    n298 --> n302["Bimaleolar (lateral + posterior)<br/>AO 44 C1<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 4"]

    %% Suprasindesmal Multifragmentaria PER fragmentos posteriores
    n94 --> n95["Fragmento extraincisural"]
    n94 --> n96["Fragmento posterolateral"]
    n94 --> n97["Posteromedial y posterolateral"]
    n94 --> n98["Gran fragmento triangular posterolateral"]
    n95 --> n99["Bimaleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 1"]
    n96 --> n100["Bimaleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 2"]
    n97 --> n101["Bimaleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 3"]
    n98 --> n102["Bimaleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 4"]

    %% Suprasindesmal Multifragmentaria PA fragmentos posteriores
    n325 --> n326["Fragmento extraincisural"]
    n325 --> n329["Fragmento posterolateral"]
    n325 --> n330["Posteromedial y posterolateral"]
    n325 --> n331["Gran fragmento triangular posterolateral"]
    n326 --> n332["Bimaleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 1"]
    n329 --> n333["Bimaleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 2"]
    n330 --> n334["Bimaleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 3"]
    n331 --> n335["Bimaleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 4"]

    %% Suprasindesmal Proximal fragmentos posteriores (PER Weber C C3)
    n103 --> n104["Fragmento extraincisural"]
    n103 --> n105["Fragmento posterolateral"]
    n103 --> n106["Posteromedial y posterolateral"]
    n103 --> n107["Gran fragmento triangular posterolateral"]
    n104 --> n108["Bimaleolar (lateral + posterior)<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 1"]
    n105 --> n109["Bimaleolar (lateral + posterior)<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 2"]
    n106 --> n110["Bimaleolar (lateral + posterior)<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 3"]
    n107 --> n111["Bimaleolar (lateral + posterior)<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 4"]

    %% Rama Lateral + Medial
    n4 --> n112{"¿De qué morfología es la fractura del maléolo medial?"}
    n112 --> n113["Oblicuo/vertical"]
    n112 --> n114["Transverso"]

    n113 --> n115{"¿La fractura del peroné es infrasindesmal y transversa?"}
    n115 --> n116["Sí"]
    n115 --> n117["No"]
    n116 --> n118["Bimaleolar (lateral + medial)<br/>AO 44 A2<br/>Lauge-Hansen SA<br/>Weber A"]
    n114 --> n119{"¿A qué nivel está la fractura de peroné?"}
    n117 --> n119

    n119 --> n120["Alta (Suprasindesmal)"]
    n119 --> n121["Baja (Transindesmal / Infrasindesmal)"]

    n120 --> n122{"¿De qué tipo?"}
    n122 --> n123["Diafisaria Simple"]
    n122 --> n124["Multifragmentaria"]
    n122 --> n125["Proximal"]

    %% Suprasindesmal Simple - trazo peroné
    n123 --> n336{"¿Cómo es el trazo del peroné?"}
    n336 --> n337["Corto/transverso/conminuto"]
    n336 --> n338["Oblicuo largo/espiroideo"]
    n337 --> n339["Bimaleolar (lateral + medial)<br/>AO 44 C1<br/>Lauge-Hansen PA<br/>Weber C"]
    n338 --> n126["Bimaleolar (lateral + medial)<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C"]

    %% Suprasindesmal Multifragmentaria - trazo peroné
    n124 --> n340{"¿Cómo es el trazo del peroné?"}
    n340 --> n341["Corto/transverso/conminuto"]
    n340 --> n342["Oblicuo largo/espiroideo"]
    n341 --> n343["Bimaleolar (lateral + medial)<br/>AO 44 C2<br/>Lauge-Hansen PA<br/>Weber C"]
    n342 --> n127["Bimaleolar (lateral + medial)<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C"]

    n125 --> n128["Bimaleolar (lateral + medial)<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C"]

    n121 --> n129{"¿De qué morfología es la fractura del peroné?"}
    n129 --> n130["Transversa"]
    n129 --> n131["Oblicua (Baja medial, alta lateral)/Conminuta"]
    n129 --> n132["Espiroidea (Baja anterior, alta posterior)"]

    n130 --> n133{"¿A qué nivel está la fractura de peroné?"}
    n133 --> n134["Infrasindesmal"]
    n133 --> n135["Transindesmal"]
    n134 --> n136["Bimaleolar (lateral + medial)<br/>AO 44 A2<br/>Lauge-Hansen SA<br/>Weber A"]
    n135 --> n138["Bimaleolar (lateral + medial)<br/>AO 44 B2<br/>Lauge-Hansen PA<br/>Weber B"]
    n131 --> n139["Bimaleolar (lateral + medial)<br/>AO 44 B2<br/>Lauge-Hansen PA<br/>Weber B"]
    n132 --> n140["Bimaleolar (lateral + medial)<br/>AO 44 B2<br/>Lauge-Hansen SER<br/>Weber B"]

    %% Rama Trimaleolar
    n5 --> n141{"¿A qué nivel está la fractura del peroné?"}
    n141 --> n143["Alta (Suprasindesmal)"]
    n141 --> n152["Baja (Transindesmal / Infrasindesmal)"]

    n143 --> n145{"¿De qué tipo?"}
    n145 --> n146["Diafisaria Simple"]
    n145 --> n147["Multifragmentaria"]
    n145 --> n148["Proximal"]

    %% Trimaleolar Suprasindesmal Simple - trazo peroné
    n146 --> n345{"¿Cómo es el trazo del peroné?"}
    n345 --> n346["Corto/transverso/conminuto"]
    n345 --> n347["Oblicuo largo/espiroideo"]
    n347 --> n241{"¿Tiene TAC?"}
    n346 --> n348{"¿Tiene TAC?"}

    %% Trimaleolar Suprasindesmal Multifrag - trazo peroné
    n147 --> n363{"¿Cómo es el trazo del peroné?"}
    n363 --> n364["Corto/transverso/conminuto"]
    n363 --> n365["Oblicuo largo/espiroideo"]
    n365 --> n245{"¿Tiene TAC?"}
    n364 --> n366{"¿Tiene TAC?"}

    n148 --> n249{"¿Tiene TAC?"}

    %% Trimaleolar Simple PER (trazo largo) - CT scan
    n241 --> n242["Sí"]
    n241 --> n243["No"]
    n243 --> n244["Fractura trimaleolar<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C"]
    n242 --> n164{"¿Qué tipo es el maléolo posterior?"}

    %% Trimaleolar Simple PA (trazo corto) - CT scan
    n348 --> n349["Sí"]
    n348 --> n350["No"]
    n350 --> n352["Fractura trimaleolar<br/>AO 44 C1<br/>Lauge-Hansen PA<br/>Weber C"]
    n349 --> n351{"¿Qué tipo es el maléolo posterior?"}

    %% Trimaleolar Multifrag PER (trazo largo) - CT scan
    n245 --> n246["Sí"]
    n245 --> n247["No"]
    n247 --> n248["Fractura trimaleolar<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C"]
    n246 --> n173{"¿Qué tipo es el maléolo posterior?"}

    %% Trimaleolar Multifrag PA (trazo corto) - CT scan
    n366 --> n367["Sí"]
    n366 --> n368["No"]
    n368 --> n369["Fractura trimaleolar<br/>AO 44 C2<br/>Lauge-Hansen PA<br/>Weber C"]
    n367 --> n370{"¿Qué tipo es el maléolo posterior?"}

    %% Trimaleolar Proximal - CT scan
    n249 --> n250["Sí"]
    n249 --> n251["No"]
    n251 --> n252["Fractura trimaleolar<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C"]
    n250 --> n182{"¿Qué tipo es el maléolo posterior?"}

    %% Trimaleolar Simple PER fragmentos posteriores
    n164 --> n165["Fragmento extraincisural"]
    n164 --> n166["Fragmento posterolateral"]
    n164 --> n167["Posteromedial y posterolateral"]
    n164 --> n168["Gran fragmento triangular posterolateral"]
    n165 --> n169["Fractura trimaleolar<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 1"]
    n166 --> n170["Fractura trimaleolar<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 2"]
    n167 --> n171["Fractura trimaleolar<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 3"]
    n168 --> n172["Fractura trimaleolar<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 4"]

    %% Trimaleolar Simple PA fragmentos posteriores
    n351 --> n353["Fragmento extraincisural"]
    n351 --> n354["Fragmento posterolateral"]
    n351 --> n355["Posteromedial y posterolateral"]
    n351 --> n356["Gran fragmento triangular posterolateral"]
    n353 --> n357["Fractura trimaleolar<br/>AO 44 C1<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 1"]
    n354 --> n358["Fractura trimaleolar<br/>AO 44 C1<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 2"]
    n355 --> n359["Fractura trimaleolar<br/>AO 44 C1<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 3"]
    n356 --> n362["Fractura trimaleolar<br/>AO 44 C1<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 4"]

    %% Trimaleolar Multifrag PER fragmentos posteriores
    n173 --> n174["Fragmento extraincisural"]
    n173 --> n175["Fragmento posterolateral"]
    n173 --> n176["Posteromedial y posterolateral"]
    n173 --> n177["Gran fragmento triangular posterolateral"]
    n174 --> n178["Fractura trimaleolar<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 1"]
    n175 --> n179["Fractura trimaleolar<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 2"]
    n176 --> n180["Fractura trimaleolar<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 3"]
    n177 --> n181["Fractura trimaleolar<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 4"]

    %% Trimaleolar Multifrag PA fragmentos posteriores
    n370 --> n371["Fragmento extraincisural"]
    n370 --> n372["Fragmento posterolateral"]
    n370 --> n373["Posteromedial y posterolateral"]
    n370 --> n374["Gran fragmento triangular posterolateral"]
    n371 --> n375["Fractura trimaleolar<br/>AO 44 C2<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 1"]
    n372 --> n376["Fractura trimaleolar<br/>AO 44 C2<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 2"]
    n373 --> n377["Fractura trimaleolar<br/>AO 44 C2<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 3"]
    n374 --> n378["Fractura trimaleolar<br/>AO 44 C2<br/>Lauge-Hansen PA<br/>Weber C<br/>Bartonicek 4"]

    %% Trimaleolar Proximal fragmentos posteriores
    n182 --> n183["Fragmento extraincisural"]
    n182 --> n184["Fragmento posterolateral"]
    n182 --> n185["Posteromedial y posterolateral"]
    n182 --> n186["Gran fragmento triangular posterolateral"]
    n183 --> n187["Fractura trimaleolar<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 1"]
    n184 --> n188["Fractura trimaleolar<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 2"]
    n185 --> n189["Fractura trimaleolar<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 3"]
    n186 --> n190["Fractura trimaleolar<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 4"]

    n152 --> n153{"¿De qué morfología es la fractura del peroné?"}
    n153 --> n154["Transversa"]
    n153 --> n155["Oblicua (Baja medial, alta lateral)/Conminuta"]
    n153 --> n156["Espiroidea (Baja anterior, alta posterior)"]

    n154 --> n157{"¿A qué nivel está la fractura de peroné?"}
    n157 --> n158["Infrasindesmal"]
    n157 --> n159["Transindesmal"]
    n158 --> n160["No posible: mecanismo excepcional"]

    %% Trimaleolar transversa transindesmal - CT scan
    n159 --> n253{"¿Tiene TAC?"}
    n253 --> n254["Sí"]
    n253 --> n255["No"]
    n255 --> n256["Fractura trimaleolar<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B"]
    n254 --> n191{"¿Qué tipo es el maléolo posterior?"}

    %% Trimaleolar oblicua - CT scan
    n155 --> n253b{"¿Tiene TAC?"}
    n253b --> n254b["Sí"]
    n253b --> n255b["No"]
    n255b --> n162["Fractura trimaleolar<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B"]
    n254b --> n191b{"¿Qué tipo es el maléolo posterior?"}

    %% Trimaleolar espiroidea - CT scan
    n156 --> n260{"¿Tiene TAC?"}
    n260 --> n261["Sí"]
    n260 --> n262["No"]
    n262 --> n263["Fractura trimaleolar<br/>AO 44 B3<br/>Lauge-Hansen SER<br/>Weber B"]
    n261 --> n201{"¿Qué tipo es el maléolo posterior?"}

    %% Trimaleolar PA transversa fragmentos posteriores
    n191 --> n192["Fragmento extraincisural"]
    n191 --> n193["Fragmento posterolateral"]
    n191 --> n194["Posteromedial y posterolateral"]
    n191 --> n195["Gran fragmento triangular posterolateral"]
    n192 --> n196["Fractura trimaleolar<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B<br/>Bartonicek 1"]
    n193 --> n197["Fractura trimaleolar<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B<br/>Bartonicek 2"]
    n194 --> n198["Fractura trimaleolar<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B<br/>Bartonicek 3"]
    n195 --> n199["Fractura trimaleolar<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B<br/>Bartonicek 4"]

    %% Trimaleolar PA oblicua fragmentos posteriores
    n191b --> n192b["Fragmento extraincisural"]
    n191b --> n193b["Fragmento posterolateral"]
    n191b --> n194b["Posteromedial y posterolateral"]
    n191b --> n195b["Gran fragmento triangular posterolateral"]
    n192b --> n196b["Fractura trimaleolar<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B<br/>Bartonicek 1"]
    n193b --> n197b["Fractura trimaleolar<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B<br/>Bartonicek 2"]
    n194b --> n198b["Fractura trimaleolar<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B<br/>Bartonicek 3"]
    n195b --> n199b["Fractura trimaleolar<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B<br/>Bartonicek 4"]

    %% Trimaleolar SER fragmentos posteriores
    n201 --> n206["Fragmento extraincisural"]
    n201 --> n207["Fragmento posterolateral"]
    n201 --> n208["Posteromedial y posterolateral"]
    n201 --> n209["Gran fragmento triangular posterolateral"]
    n206 --> n214["Fractura trimaleolar<br/>AO 44 B3<br/>Lauge-Hansen SER<br/>Weber B<br/>Bartonicek 1"]
    n207 --> n215["Fractura trimaleolar<br/>AO 44 B3<br/>Lauge-Hansen SER<br/>Weber B<br/>Bartonicek 2"]
    n208 --> n216["Fractura trimaleolar<br/>AO 44 B3<br/>Lauge-Hansen SER<br/>Weber B<br/>Bartonicek 3"]
    n209 --> n217["Fractura trimaleolar<br/>AO 44 B3<br/>Lauge-Hansen SER<br/>Weber B<br/>Bartonicek 4"]

    %% Estilos para nodos resultado
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
