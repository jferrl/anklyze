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
    C --> n6{"¿Qué tipo de fractura es?"}
    n6 --> n7["Fragmento extraincisural"]
    n6 --> n8["Fragmento posterolateral"]
    n6 --> n9["Fragmento posteromedial y posterolateral"]
    n6 --> n10["Gran fragmento triangular posterolateral"]
    n7 --> n11["Unimaleolar maléolo posterior<br/>AO 44 B3<br/>Lauge-Hansen SER<br/>Bartonicek 1"]
    n8 --> n12["Unimaleolar maléolo posterior<br/>AO 44 B3<br/>Lauge-Hansen SER<br/>Bartonicek 2"]
    n9 --> n13["Unimaleolar maléolo posterior<br/>AO 44 B3<br/>Lauge-Hansen SER<br/>Bartonicek 3"]
    n10 --> n14["Unimaleolar maléolo posterior<br/>AO 44 B3<br/>Lauge-Hansen SER<br/>Bartonicek 4"]

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

    n21 --> n24{"¿De qué morfología es la fractura?"}
    n24 --> n25["Transversa"]
    n24 --> n26["Oblicua (Baja medial, alta lateral)"]
    n25 --> n27["Unimaleolar maléolo lateral<br/>AO 44 A1<br/>Lauge-Hansen SA<br/>Weber A"]
    n26 --> n28["Unimaleolar maléolo lateral<br/>AO 44 A1<br/>Lauge-Hansen PA<br/>Weber A"]

    n22 --> n29{"¿De qué morfología es la fractura?"}
    n29 --> n30["Espiroidea (Baja anterior, alta posterior)"]
    n29 --> n31["Oblicua (Baja medial, alta lateral)"]
    n30 --> n32["Unimaleolar maléolo lateral<br/>AO 44 B1<br/>Lauge-Hansen SER<br/>Weber B"]
    n31 --> n33["Unimaleolar maléolo lateral<br/>AO 44 B1<br/>Lauge-Hansen PA<br/>Weber B"]

    n23 --> n34{"¿De qué tipo?"}
    n34 --> n35["Diafisaria Simple"]
    n34 --> n36["Multifragmentaria"]
    n34 --> n37["Proximal"]
    n35 --> n39["Unimaleolar maléolo lateral<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C"]
    n36 --> n40["Unimaleolar maléolo lateral<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C"]
    n37 --> n41["Unimaleolar maléolo lateral<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C"]

    %% Rama Medial + Posterior
    n2 --> n42["Bimaleolar (Medial + Posterior)<br/>AO 44 B3<br/>Lauge-Hansen SER"]

    %% Rama Lateral + Posterior
    n3 --> n43{"¿A qué nivel está la fractura de peroné?"}
    n43 --> n44["Infrasindesmal"]
    n43 --> n45["Transindesmal"]
    n43 --> n46["Suprasindesmal"]

    n44 --> n47{"¿De qué morfología es la fractura?"}
    n47 --> n50["Transversa"]
    n47 --> n51["Oblicua (Baja medial, alta lateral)"]
    n50 --> n66["No posible: mecanismo SA no involucra maléolo posterior"]
    n51 --> n57{"¿Qué tipo es el maléolo posterior?"}

    n45 --> n48{"¿De qué morfología es la fractura?"}
    n48 --> n52["Espiroidea (Baja anterior, alta posterior)"]
    n48 --> n53["Oblicua (Baja medial, alta lateral)"]
    n52 --> n67{"¿Qué tipo es el maléolo posterior?"}
    n53 --> n76{"¿Qué tipo es el maléolo posterior?"}

    n46 --> n49{"¿De qué tipo?"}
    n49 --> n54["Diafisaria Simple"]
    n49 --> n55["Multifragmentaria"]
    n49 --> n56["Proximal"]
    n54 --> n85{"¿Qué tipo es el maléolo posterior?"}
    n55 --> n94{"¿Qué tipo es el maléolo posterior?"}
    n56 --> n103{"¿Qué tipo es el maléolo posterior?"}

    %% Infrasindesmal + Oblicua fragmentos posteriores (PA Weber A)
    n57 --> n58["Fragmento extraincisural"]
    n57 --> n59["Fragmento posterolateral"]
    n57 --> n60["Posteromedial y posterolateral"]
    n57 --> n61["Gran fragmento triangular posterolateral"]
    n58 --> n62["Bimaleolar (lateral + posterior)<br/>AO 44 A2<br/>Lauge-Hansen PA<br/>Weber A<br/>Bartonicek 1"]
    n59 --> n63["Bimaleolar (lateral + posterior)<br/>AO 44 A2<br/>Lauge-Hansen PA<br/>Weber A<br/>Bartonicek 2"]
    n60 --> n64["Bimaleolar (lateral + posterior)<br/>AO 44 A2<br/>Lauge-Hansen PA<br/>Weber A<br/>Bartonicek 3"]
    n61 --> n65["Bimaleolar (lateral + posterior)<br/>AO 44 A2<br/>Lauge-Hansen PA<br/>Weber A<br/>Bartonicek 4"]

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

    %% Suprasindesmal Diafisaria Simple fragmentos posteriores (PER Weber C C1)
    n85 --> n86["Fragmento extraincisural"]
    n85 --> n87["Fragmento posterolateral"]
    n85 --> n88["Posteromedial y posterolateral"]
    n85 --> n89["Gran fragmento triangular posterolateral"]
    n86 --> n90["Bimaleolar (lateral + posterior)<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 1"]
    n87 --> n91["Bimaleolar (lateral + posterior)<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 2"]
    n88 --> n92["Bimaleolar (lateral + posterior)<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 3"]
    n89 --> n93["Bimaleolar (lateral + posterior)<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 4"]

    %% Suprasindesmal Multifragmentaria fragmentos posteriores (PER Weber C C2)
    n94 --> n95["Fragmento extraincisural"]
    n94 --> n96["Fragmento posterolateral"]
    n94 --> n97["Posteromedial y posterolateral"]
    n94 --> n98["Gran fragmento triangular posterolateral"]
    n95 --> n99["Bimaleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 1"]
    n96 --> n100["Bimaleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 2"]
    n97 --> n101["Bimaleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 3"]
    n98 --> n102["Bimaleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 4"]

    %% Suprasindesmal Proximal fragmentos posteriores (PER Weber C C3)
    n103 --> n104["Fragmento extraincisural"]
    n103 --> n105["Fragmento posterolateral"]
    n103 --> n106["Posteromedial y posterolateral"]
    n103 --> n107["Gran fragmento triangular posterolateral"]
    n104 --> n108["Bimaleolar (lateral + posterior)<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 1"]
    n105 --> n109["Bimaleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 2"]
    n106 --> n110["Bimaleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 3"]
    n107 --> n111["Bimaleolar (lateral + posterior)<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C<br/>Bartonicek 4"]

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

    n119 --> n120["Alta"]
    n119 --> n121["Baja (A nivel de pilón tibial o inferior)"]

    n120 --> n122{"¿De qué tipo?"}
    n122 --> n123["Diafisaria Simple"]
    n122 --> n124["Multifragmentaria"]
    n122 --> n125["Proximal"]
    n123 --> n126["Bimaleolar (lateral + medial)<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C"]
    n124 --> n127["Bimaleolar (lateral + medial)<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C"]
    n125 --> n128["Bimaleolar (lateral + medial)<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C"]

    n121 --> n129{"¿De qué morfología es la fractura del peroné?"}
    n129 --> n130["Transversa"]
    n129 --> n131["Oblicua (baja medial, alta lateral)"]
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
    n141 --> n143["Alta"]
    n141 --> n152["Baja (A nivel de pilón tibial o inferior)"]

    n143 --> n145{"¿De qué tipo?"}
    n145 --> n146["Diafisaria Simple"]
    n145 --> n147["Multifragmentaria"]
    n145 --> n148["Proximal"]
    n146 --> n149["Fractura trimaleolar<br/>AO 44 C1<br/>Lauge-Hansen PER<br/>Weber C"]
    n147 --> n150["Fractura trimaleolar<br/>AO 44 C2<br/>Lauge-Hansen PER<br/>Weber C"]
    n148 --> n151["Fractura trimaleolar<br/>AO 44 C3<br/>Lauge-Hansen PER<br/>Weber C"]

    n152 --> n153{"¿De qué morfología es la fractura del peroné?"}
    n153 --> n154["Transversa"]
    n153 --> n155["Oblicua (baja medial, alta lateral)"]
    n153 --> n156["Espiroidea (Baja anterior, alta posterior)"]

    n154 --> n157{"¿A qué nivel está la fractura de peroné?"}
    n157 --> n158["Infrasindesmal"]
    n157 --> n159["Transindesmal"]
    n158 --> n160["No posible: mecanismo excepcional"]
    n159 --> n161["Fractura trimaleolar<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B"]
    n155 --> n162["Fractura trimaleolar<br/>AO 44 B3<br/>Lauge-Hansen PA<br/>Weber B"]
    n156 --> n163["Fractura trimaleolar<br/>AO 44 B3<br/>Lauge-Hansen SER<br/>Weber B"]

    %% Estilos para nodos resultado
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
