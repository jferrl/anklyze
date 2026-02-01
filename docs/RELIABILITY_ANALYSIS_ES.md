# Guía de Análisis de Fiabilidad de Anklyze

> Una guía completa para entender la evaluación de fiabilidad del algoritmo de clasificación de fracturas de tobillo, escrita para no estadísticos.

## Tabla de Contenidos

1. [¿Qué es la Fiabilidad y Por Qué Importa?](#1-qué-es-la-fiabilidad-y-por-qué-importa)
2. [El Algoritmo de Clasificación](#2-el-algoritmo-de-clasificación)
3. [Conceptos Estadísticos Explicados](#3-conceptos-estadísticos-explicados)
4. [Análisis de la Implementación Actual](#4-análisis-de-la-implementación-actual)
5. [Puntos Débiles Identificados](#5-puntos-débiles-identificados)
6. [Recomendaciones](#6-recomendaciones)
7. [Protocolo de Validación del Algoritmo](#7-protocolo-de-validación-del-algoritmo)
8. [Glosario](#8-glosario)

---

## 1. ¿Qué es la Fiabilidad y Por Qué Importa?

### La Visión General

Imagina que creas una receta para galletas con chips de chocolate. Quieres saber:
- Si **tú** haces las galletas dos veces, ¿saben igual? (consistencia)
- Si **tu amigo** sigue la misma receta, ¿sus galletas saben igual que las tuyas? (reproducibilidad)

En clasificación médica, la fiabilidad responde preguntas similares:
- Si el **mismo médico** clasifica la misma fractura dos veces, ¿obtiene el mismo resultado?
- Si **diferentes médicos** clasifican la misma fractura, ¿están de acuerdo?

### Por Qué Esto Importa para Anklyze

Anklyze ayuda a clasificar fracturas de tobillo usando un algoritmo de árbol de decisión. Antes de que esta herramienta pueda ser confiable en entornos clínicos, necesitamos probar:

1. **El algoritmo es correcto** → Clasifica fracturas según estándares médicos establecidos
2. **El algoritmo es fiable** → Diferentes usuarios obtienen los mismos resultados para el mismo caso
3. **El algoritmo coincide con expertos** → Los resultados se alinean con lo que médicos experimentados concluirían

### El Rol de la Función de Encuestas

La función de encuesta (estudio) nos permite:
- Mostrar las mismas imágenes de rayos X a múltiples médicos
- Recopilar sus clasificaciones
- Comparar resultados para encontrar patrones de acuerdo/desacuerdo
- Comparar resultados contra un "estándar de oro" (la respuesta correcta)

---

## 2. El Algoritmo de Clasificación

### Cómo Funciona

El algoritmo es como un diagrama de flujo que hace preguntas y sigue ramas según las respuestas:

```
INICIO: ¿Qué huesos están fracturados?
       │
       ├─► Solo posterior ──────────► Mecanismo SER, AO/OTA B3
       │
       ├─► Solo medial ─────────────► ¿Cuál es la forma de la fractura?
       │                                    │
       │                                    ├─► Oblicua → Mecanismo SA
       │                                    └─► Transversa → Ambiguo (podría ser PA, SER o PER)
       │
       ├─► Solo lateral ────────────► ¿Dónde está en el peroné?
       │                                    │
       │                                    ├─► Bajo sindesmosis (infrasindesmal) → Weber A, SA
       │                                    ├─► En sindesmosis (transindesmal) → Weber B, luego verificar forma...
       │                                    └─► Sobre sindesmosis (suprasindesmal) → Weber C, luego verificar tipo...
       │
       └─► ... (continúa para las 7 combinaciones)
```

### Los Cuatro Sistemas de Clasificación

El algoritmo produce clasificaciones en cuatro sistemas diferentes:

| Sistema | Qué Mide | Categorías |
|---------|----------|------------|
| **Danis-Weber** | Dónde está roto el peroné en relación a la articulación del tobillo | A (abajo), B (en), C (arriba) |
| **Lauge-Hansen** | Cómo ocurrió la lesión (mecanismo) | SA, SER, PA, PER |
| **AO/OTA** | Código alfanumérico completo | 44-A1, 44-A2, 44-B1, 44-B2, 44-B3, 44-C1, 44-C2, 44-C3 |
| **Bartonicek** | Tipo de fragmento del maléolo posterior (requiere TAC) | Tipo 1, 2, 3, 4 |

### Fortalezas Actuales del Algoritmo

✅ Cubre las 7 combinaciones posibles de maléolos
✅ Identifica combinaciones anatómicamente "imposibles"
✅ Marca casos ambiguos donde múltiples mecanismos son posibles
✅ Tiene cobertura extensa de pruebas (~1000 líneas de tests)
✅ Soporta inglés y español

---

## 3. Conceptos Estadísticos Explicados

### 3.1 Acuerdo vs. Fiabilidad

#### Acuerdo Simple (Porcentaje de Acuerdo)

**Qué es:** El porcentaje de veces que dos o más personas dieron la misma respuesta.

**Ejemplo:**
```
Doctor A:  Weber A  |  Weber B  |  Weber B  |  Weber C  |  Weber B
Doctor B:  Weber A  |  Weber B  |  Weber A  |  Weber C  |  Weber B
           ────────────────────────────────────────────────────────
¿Coinciden?   ✅          ✅          ❌          ✅          ✅

Acuerdo = 4 coincidencias / 5 casos = 80%
```

**El Problema:** ¡Este número puede ser engañoso! Si el 90% de las fracturas de tobillo son Weber B, dos médicos podrían coincidir el 81% del tiempo solo adivinando siempre "Weber B" – ¡incluso sin mirar la radiografía!

---

### 3.2 Kappa de Cohen (κ) - Para 2 Evaluadores

**Qué es:** Una estadística que mide el acuerdo *más allá de lo que esperarías por azar*.

**La Intuición:**

Imagina dos estudiantes haciendo un examen de opción múltiple adivinando al azar. Si hay 3 opciones (A, B, C), coincidirían aproximadamente el 33% del tiempo por pura suerte. Kappa pregunta: "¿Cuánto mejor que el azar lo hicieron?"

**La Fórmula (simplificada):**

```
Kappa = (Acuerdo Observado - Esperado por Azar) / (Acuerdo Perfecto - Esperado por Azar)
```

O más simple:
```
Kappa = (Lo que obtuvimos - Lo que la suerte nos daría) / (Lo que la perfección nos daría - Lo que la suerte nos daría)
```

**Ejemplo con números:**

```
Dos médicos clasificaron 100 fracturas:

                    Doctor B
                    Weber A    Weber B    Weber C    Total
Doctor A  Weber A      20         5          0        25
          Weber B       3        55          2        60
          Weber C       0         2         13        15
          Total        23        62         15       100

Acuerdo Observado = (20 + 55 + 13) / 100 = 88%

Esperado por Azar:
- P(ambos dicen A) = (25/100) × (23/100) = 5.75%
- P(ambos dicen B) = (60/100) × (62/100) = 37.2%
- P(ambos dicen C) = (15/100) × (15/100) = 2.25%
- Total esperado = 5.75% + 37.2% + 2.25% = 45.2%

Kappa = (0.88 - 0.452) / (1 - 0.452) = 0.428 / 0.548 = 0.78
```

**Interpretación de Kappa (escala de Landis & Koch):**

| Valor Kappa | Interpretación | Qué Significa |
|-------------|----------------|---------------|
| < 0 | Pobre | Peor que el azar (desacuerdo) |
| 0.00 - 0.20 | Leve | Apenas mejor que adivinar |
| 0.21 - 0.40 | Aceptable | Algo de acuerdo, pero no genial |
| 0.41 - 0.60 | Moderado | Acuerdo razonable |
| 0.61 - 0.80 | Sustancial | Buen acuerdo |
| 0.81 - 1.00 | Casi Perfecto | Excelente acuerdo |

**Limitación:** Kappa de Cohen solo funciona para exactamente 2 evaluadores. ¿Qué pasa si tienes 5 médicos?

---

### 3.3 Kappa de Fleiss - Para Múltiples Evaluadores

**Qué es:** Una extensión del Kappa de Cohen para 3 o más evaluadores.

**La Configuración:**

En lugar de comparar pares, el Kappa de Fleiss mira cuántos evaluadores coincidieron en cada caso.

**Ejemplo:**

```
5 médicos clasificaron 4 fracturas:

Caso    Weber A    Weber B    Weber C    (5 médicos por caso)
──────────────────────────────────────────
  1        5          0          0       ← Acuerdo perfecto (todos dijeron A)
  2        0          4          1       ← Buen acuerdo (4/5 dijeron B)
  3        2          2          1       ← Acuerdo pobre (divididos)
  4        1          3          1       ← Acuerdo moderado (3/5 dijeron B)
```

**La Idea del Cálculo:**

1. Para cada caso, calcular cuánto acuerdo hay
2. Promediar a través de todos los casos
3. Comparar con lo que esperarías por azar
4. Aplicar la misma fórmula que el Kappa de Cohen

**Por Qué Es Importante:** En estudios de fiabilidad, típicamente quieres múltiples expertos (no solo 2) evaluando casos.

---

### 3.4 Coeficiente de Correlación Intraclase (ICC)

**Qué es:** Una medida de cuán similares son las calificaciones dentro de la misma "clase" (grupo de evaluadores evaluando lo mismo).

**Piénsalo así:**

El ICC pregunta: "De toda la variación en las calificaciones, ¿cuánta es porque los casos son realmente diferentes, vs. cuánta es porque los evaluadores no están de acuerdo?"

```
Variación Total = Variación Entre Casos + Variación Entre Evaluadores + Error Aleatorio
                  ──────────────────────────────────────────────────────────────────────
                  (lo que queremos medir)       (desacuerdo)            (ruido)
```

**Valores de ICC:**
- **ICC = 1.0**: Toda la variación es de diferencias reales entre casos (fiabilidad perfecta)
- **ICC = 0.5**: La mitad de la variación es de diferencias reales, la mitad de desacuerdo entre evaluadores
- **ICC = 0.0**: Toda la variación es de desacuerdo entre evaluadores (sin fiabilidad)

**¿Por Qué ICC vs. Kappa?**

| Usa Kappa Cuando... | Usa ICC Cuando... |
|---------------------|-------------------|
| Las categorías son distintas (Weber A, B, C) | Las calificaciones están en una escala (1-10) |
| El orden no importa (A no es "mejor" que C) | El orden importa (un 7 es mayor que un 5) |
| Tienes datos nominales | Tienes datos ordinales o continuos |

**Para Anklyze:** Kappa es apropiado para Danis-Weber y Lauge-Hansen (categorías nominales), pero ICC podría ser mejor para analizar subtipos de AO/OTA si se tratan como ordinales.

---

### 3.5 Intervalos de Confianza

**Qué es:** Un rango que probablemente contiene el valor "verdadero".

**El Problema:**

Si calculas Kappa = 0.78, eso está basado en tu muestra. Si diferentes médicos hubieran participado, podrías obtener Kappa = 0.72 o 0.84. Entonces, ¿qué tan seguro estás de que la fiabilidad "verdadera" está alrededor de 0.78?

**La Solución:**

Un intervalo de confianza (IC) del 95% te da un rango. Por ejemplo:
- Kappa = 0.78, IC 95% [0.65, 0.91]

Esto significa: "Estamos 95% seguros de que el Kappa verdadero está en algún lugar entre 0.65 y 0.91."

**Por Qué Importa:**

```
Resultado A: Kappa = 0.78, IC 95% [0.65, 0.91]
             └── Confiados de que es al menos acuerdo "sustancial"

Resultado B: Kappa = 0.78, IC 95% [0.35, 0.95]
             └── Podría estar en cualquier lugar desde "aceptable" hasta "casi perfecto" – ¡no es útil!
```

El ancho del IC depende del tamaño de la muestra. Más respuestas = IC más estrecho = más certeza.

---

### 3.6 Kappa Ponderado

**Qué es:** Una versión de Kappa que considera "qué tan equivocado" es un desacuerdo.

**El Problema con el Kappa Regular:**

El Kappa regular trata todos los desacuerdos igual:
- Doctor A dice "Weber A", Doctor B dice "Weber B" → 1 desacuerdo
- Doctor A dice "Weber A", Doctor B dice "Weber C" → 1 desacuerdo

Pero clínicamente, confundir A con B (categorías adyacentes) podría ser menos serio que confundir A con C (extremos opuestos).

**Solución del Kappa Ponderado:**

Asignar pesos a los desacuerdos:

```
                    Doctor B
                    Weber A    Weber B    Weber C
Doctor A  Weber A      0         0.5        1.0
          Weber B     0.5        0          0.5
          Weber C     1.0        0.5        0

0 = acuerdo (sin penalización)
0.5 = desacuerdo parcial (media penalización)
1.0 = desacuerdo completo (penalización total)
```

**Para Anklyze:** Esto podría ser útil para clasificaciones AO/OTA donde 44-B1 y 44-B2 están "más cerca" que 44-B1 y 44-C3.

---

### 3.7 Sensibilidad y Especificidad

**Qué son:** Medidas de qué tan buena es una prueba para detectar cosas.

**Aplicado a Clasificación:**

Cuando comparamos respuestas de usuarios con un estándar de oro:

```
                        Estándar de Oro
                        Weber A          No Weber A
Usuario Dijo  Weber A   Verdadero Pos.   Falso Positivo
              No A      Falso Negativo   Verdadero Neg.
```

**Sensibilidad** (Tasa de Verdaderos Positivos):
- De todos los casos que SON Weber A, ¿qué porcentaje identificamos correctamente?
- Fórmula: Verdaderos Positivos / (Verdaderos Positivos + Falsos Negativos)
- "Si realmente es Weber A, ¿qué tan probable es que lo detectemos?"

**Especificidad** (Tasa de Verdaderos Negativos):
- De todos los casos que NO SON Weber A, ¿qué porcentaje descartamos correctamente?
- Fórmula: Verdaderos Negativos / (Verdaderos Negativos + Falsos Positivos)
- "Si no es Weber A, ¿qué tan probable es que digamos correctamente que no lo es?"

**Ejemplo:**

```
100 casos: 30 son Weber A (estándar de oro), 70 no son Weber A

Los usuarios clasificaron:
- 25 de los 30 casos Weber A correctamente (Verdaderos Positivos)
- 5 de los 30 casos Weber A como otra cosa (Falsos Negativos)
- 65 de los 70 casos no-Weber A correctamente (Verdaderos Negativos)
- 5 de los 70 casos no-Weber A como Weber A (Falsos Positivos)

Sensibilidad = 25 / (25 + 5) = 83.3%  "Detecta el 83% de los casos Weber A"
Especificidad = 65 / (65 + 5) = 92.9%  "Descarta correctamente el 93% de los casos no-Weber A"
```

---

### 3.8 Matriz de Confusión

**Qué es:** Una tabla que muestra cómo se comparan las clasificaciones entre predichas y reales (o entre dos evaluadores).

**Ejemplo:**

```
Estándar de Oro vs. Respuestas de Usuarios para Lauge-Hansen:

                    Predicho por Usuarios
              SA      SER     PA      PER     Total
Real    SA    45       3       2       0        50
Están-  SER    2      78       5       5        90
dar de  PA     1       4      35       0        40
Oro     PER    0       3       1      16        20
        ───────────────────────────────────────────
        Total 48      88      43      21       200
```

**Leyendo la Matriz:**

- Diagonal (45, 78, 35, 16) = clasificaciones correctas
- Fuera de diagonal = errores
- Totales de fila = conteos reales según estándar de oro
- Totales de columna = conteos predichos por usuarios

**Qué Revela:**

- SER tiene más confusión (algunos confundidos con PA y PER)
- SA raramente se confunde con PER (anatómicamente son muy diferentes)
- Los usuarios tienden a sobre-predecir SER (88 predichos vs. 90 reales)

---

## 4. Análisis de la Implementación Actual

### 4.1 Qué Calcula Anklyze Actualmente

| Métrica | Implementado | Ubicación |
|---------|--------------|-----------|
| Porcentaje de Acuerdo | ✅ Sí | `statistics.go:132-153` |
| Kappa de Cohen | ✅ Sí | `statistics.go:23-66` |
| Kappa de Fleiss | ✅ Sí | `statistics.go:72-130` |
| Matriz de Confusión | ✅ Sí | `statistics.go:157-171` |
| Conteos por Categoría | ✅ Sí | `statistics.go:174-182` |
| Precisión vs Estándar de Oro | ✅ Sí | `statistics.go:342-418` |
| Intervalos de Confianza | ❌ No | - |
| Kappa Ponderado | ❌ No | - |
| ICC | ❌ No | - |
| Sensibilidad/Especificidad | ❌ No | - |

### 4.2 Cómo Funciona la Función de Encuestas

```
┌─────────────────┐
│  Admin crea     │
│    Estudio      │
│  (sube rayos X, │
│   establece     │
│   estándar de   │
│   oro)          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Estudio Publicado│
│                 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌─────────────────┐
│ Usuario 1 ve    │      │ Usuario 2 ve    │
│ rayos X y       │      │ rayos X y       │
│ clasifica       │      │ clasifica       │
└────────┬────────┘      └────────┬────────┘
         │                        │
         └──────────┬─────────────┘
                    │
                    ▼
         ┌─────────────────┐
         │   Respuestas    │
         │   Recopiladas   │
         │                 │
         │ - Clasificación │
         │ - Tiempo        │
         │ - Metadata      │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │   Analíticas    │
         │                 │
         │ - Distribución  │
         │ - Scores Kappa  │
         │ - Precisión     │
         │ - Exportar CSV  │
         └─────────────────┘
```

---

## 5. Puntos Débiles Identificados

### 5.1 Problemas en los Cálculos Estadísticos

#### Problema 1: Kappa de Cohen Solo Usa la Primera Respuesta

**Ubicación:** `backend/internal/service/statistics.go` líneas 307-311

**Qué sucede:**
```go
ratings := [][2]string{
    {uniqueUsers[raters[0]][0], uniqueUsers[raters[1]][0]},  // ← Solo [0]
}
```

**El Problema:**

Si `AllowMultipleResponses` está habilitado y los usuarios envían múltiples respuestas, solo se usa la primera respuesta de cada usuario para el cálculo de Kappa.

**Impacto:**
- Las respuestas adicionales se ignoran en los cálculos de fiabilidad
- Puede no reflejar la respuesta final/mejor del usuario
- Se desperdician datos recopilados

**Debería ser:**
- Usar la respuesta más reciente, O
- Usar todas las respuestas con ponderación apropiada, O
- Documentar claramente este comportamiento

---

#### ~~Problema 2: Diseño de Sujeto Único en Kappa de Fleiss~~ ✅ RESUELTO

**Estado:** Completamente resuelto en febrero de 2026

**Solución:** Implementada la funcionalidad **StudyCohort** que agrupa múltiples estudios (casos) para el cálculo correcto del Kappa de Fleiss.

**Cómo funciona:**

1. El administrador crea una cohorte y añade múltiples estudios (casos)
2. Los evaluadores se pre-asignan a la cohorte
3. Los evaluadores completan todos los casos de la cohorte
4. El sistema calcula el Kappa de Fleiss a través de todos los casos y evaluadores

**Para estudios de caso único (compatibilidad hacia atrás):**

- Devuelve `null` para el valor de `fleiss_kappa`
- Proporciona una nota explicativa vía el campo `fleiss_kappa_note`
- El frontend muestra la nota en una alerta informativa

**Respuesta API de Cohorte:**

```json
{
  "fleiss_kappa": {
    "kappa": 0.72,
    "interpretation": "substantial",
    "num_raters": 5,
    "num_subjects": 10,
    "num_categories": 3,
    "confidence_interval": {
      "lower": 0.58,
      "upper": 0.86,
      "level": 0.95
    }
  }
}
```

**Archivos Clave:**

- `backend/internal/domain/cohort.go` - Modelos de dominio
- `backend/internal/repository/postgres/cohort.go` - Implementación del repositorio
- `backend/internal/api/cohort_handlers.go` - Endpoints API
- `frontend/src/pages/admin/CohortReliabilityPage.tsx` - Dashboard de fiabilidad

---

#### ~~Problema 3: Sin Intervalos de Confianza~~ ✅ RESUELTO

**El Problema:**

Cuando se muestra Kappa = 0.72, no hay indicación de qué tan confiable es este número.

**Impacto:**
- No se puede determinar si el resultado es estadísticamente significativo
- No se pueden comparar resultados entre estudios correctamente
- Las estadísticas de calidad de publicación requieren ICs

**Lo que se necesita:**

```
Muestra actual:    "Kappa: 0.72"
Debería mostrar:   "Kappa: 0.72 (IC 95%: 0.58 - 0.86)"
```

---

#### Problema 4: Sin Kappa Ponderado para Datos Ordinales

**El Problema:**

Los códigos AO/OTA tienen un orden natural (44-A1 < 44-A2 < 44-B1 < ...). El Kappa regular trata una confusión entre 44-A1 y 44-A2 igual que entre 44-A1 y 44-C3.

**Impacto:**
- Penaliza excesivamente los "casi aciertos"
- No refleja la realidad clínica donde algunos desacuerdos importan más

---

### 5.2 Limitaciones del Diseño del Estudio

#### ~~Problema 5: Un Solo Caso Por Estudio~~ ✅ RESUELTO

**Estado:** Resuelto en febrero de 2026

**Problema Original:** Cada estudio contenía un único conjunto de imágenes representando un caso, haciendo imposible el análisis de fiabilidad apropiado.

**Solución:** Implementada la funcionalidad **StudyCohort**:

```text
StudyCohort
├── Metadatos (título, descripción, estado)
├── Caso 1 (Estudio) ─── Imágenes + Estándar de Oro
├── Caso 2 (Estudio) ─── Imágenes + Estándar de Oro
├── Caso 3 (Estudio) ─── Imágenes + Estándar de Oro
└── ... (casos ilimitados)
```

**Características:**

- Agrupar múltiples estudios en una cohorte
- Reordenamiento de casos con arrastrar y soltar
- Métricas de acuerdo por caso
- Identificar "casos difíciles" con bajo acuerdo
- Cálculo correcto del Kappa de Fleiss a través de todos los casos

**Endpoints API:**

- `POST /api/admin/cohorts` - Crear cohorte
- `POST /api/admin/cohorts/:id/cases` - Añadir caso a cohorte
- `GET /api/admin/cohorts/:id/reliability` - Obtener métricas de fiabilidad

---

#### ~~Problema 6: Sin Gestión de Cohorte de Evaluadores~~ ✅ RESUELTO

**Estado:** Resuelto en febrero de 2026

**Problema Original:** No había forma de definir "estos 10 médicos deben evaluar todos estos 20 casos."

**Solución:** Implementadas asignaciones de **CohortUser** con control de acceso:

```go
type CohortUser struct {
    CohortID       uuid.UUID  // Qué cohorte
    UserID         uuid.UUID  // Qué usuario
    UserEmail      string     // Para mostrar
    CasesCompleted int        // Seguimiento de progreso
    LastResponseAt *time.Time // Seguimiento de actividad
}
```

**Características:**

- Pre-asignar evaluadores específicos a cohortes
- **Control de acceso obligatorio**: Solo evaluadores asignados pueden responder a estudios de cohorte
- Seguimiento de progreso por evaluador (casos completados / total de casos)
- Actualizaciones automáticas de progreso cuando se envían respuestas
- Identificar evaluadores completos vs. incompletos para el Kappa de Fleiss

**Modelo de Acceso Híbrido:**

- **Estudios independientes**: Abiertos a todos los usuarios autenticados
- **Estudios de cohorte**: Restringidos solo a evaluadores asignados

**Respuesta de Error para Acceso No Autorizado:**

```json
{
  "error": "you are not assigned to this cohort study",
  "code": "NOT_COHORT_MEMBER"
}
```

---

#### Problema 7: Sin Versionado del Algoritmo

**El Problema:**

Si el algoritmo de clasificación se actualiza, no hay registro de qué versión produjo qué resultados.

**Escenario:**
1. Enero: Ejecutar estudio con Algoritmo v1.0, obtener Kappa = 0.75
2. Marzo: Actualizar algoritmo para corregir caso límite
3. Junio: Ejecutar nuevo estudio, obtener Kappa = 0.82
4. Pregunta: ¿La mejora se debe a la corrección del algoritmo o a diferentes usuarios/casos?

**Impacto:**
- No se pueden rastrear mejoras del algoritmo a lo largo del tiempo
- No se pueden reprocesar datos históricos con el nuevo algoritmo
- Difícil validar cambios en el algoritmo

---

### 5.3 Brechas en las Funciones de Análisis

#### Problema 8: Sin Análisis de Divergencia del Árbol de Decisión

**El Problema:**

Cuando los usuarios no están de acuerdo con el estándar de oro, sabemos QUÉ respondieron, pero no DÓNDE en el árbol de decisión divergieron.

**Ejemplo:**

```
Estándar de Oro: Weber B, SER, 44-B2
Respuesta del Usuario: Weber B, PA, 44-B2

El usuario acertó Danis-Weber y AO/OTA, pero falló Lauge-Hansen.
¿DÓNDE se equivocó?

La ruta del cuestionario:
1. ¿Qué maléolos? → Lateral + Medial ✓
2. ¿Nivel del peroné? → Transindesmal ✓
3. ¿Morfología lateral? → Dijeron "Oblicua" (debería ser "Espiral") ✗
                         ↓
                    De aquí viene PA en lugar de SER
```

**Impacto:**
- No se puede identificar qué preguntas causan más errores
- No se puede mejorar la redacción del cuestionario para preguntas confusas
- No se puede proporcionar entrenamiento dirigido

---

#### Problema 9: Sin Estratificación por Experiencia en Analíticas

**El Problema:**

Aunque se recopilan datos de experiencia (años de experiencia, especialidad, nivel de formación), las analíticas no desglosan resultados por nivel de experiencia.

**Lo que queremos saber:**
- ¿Los médicos de plantilla están más de acuerdo que los residentes?
- ¿La experiencia se correlaciona con la precisión respecto al estándar de oro?
- ¿Qué especialidades tienen mayor acuerdo?

**Impacto:**
- No se puede validar el algoritmo contra "consenso de expertos"
- No se puede identificar si el entrenamiento mejora la fiabilidad
- Faltan insights para publicación

---

#### Problema 10: Sin Análisis Basado en Tiempo

**El Problema:**

Se recopila el tiempo de respuesta pero no se analiza.

**Preguntas que podríamos responder:**
- ¿Las respuestas más rápidas se correlacionan con la precisión?
- ¿Hay un tiempo "óptimo" para una evaluación cuidadosa?
- ¿Los expertos clasifican más rápido?

**Impacto:**
- Faltan indicadores de calidad
- No se pueden detectar respuestas "apresuradas"
- No se puede optimizar el tiempo de evaluación recomendado

---

### 5.4 Problemas de Calidad de Datos

#### Problema 11: Sin Validación de Respuestas

**El Problema:**

Los usuarios pueden enviar respuestas sin contestar todas las preguntas requeridas (si el cuestionario permite completado parcial).

**Impacto:**
- Datos de clasificación incompletos
- Valores NULL en analíticas
- Potencial para respuestas inválidas

---

#### Problema 12: Manejo Limitado de Combinaciones Imposibles

**El Problema:**

El algoritmo identifica correctamente las combinaciones imposibles, pero la encuesta no rastrea cuándo los usuarios SELECCIONAN combinaciones imposibles.

**Por qué importa:**

Si muchos usuarios seleccionan combinaciones imposibles, indica:
- El cuestionario es confuso
- Las imágenes son ambiguas
- Los usuarios necesitan más entrenamiento

**Impacto:**
- No se pueden identificar patrones problemáticos de usuarios
- No se puede mejorar el diseño del cuestionario

---

## 6. Recomendaciones

### 6.1 Matriz de Prioridades

#### Completado ✅

| Problema | Estado | Notas |
| -------- | ------ | ----- |
| Corregir manejo de múltiples respuestas en Kappa de Cohen | ✅ Hecho | Ahora usa la respuesta más reciente |
| Corregir cálculo de Kappa de Fleiss | ✅ Hecho | Devuelve null para caso único, cálculo completo para cohortes |
| Agregar intervalos de confianza | ✅ Hecho | IC 95% para Kappa de Cohen y Fleiss |
| Agregar Kappa ponderado | ✅ Hecho | Pesos lineales para AO/OTA |
| Agregar sensibilidad/especificidad | ✅ Hecho | Métricas diagnósticas por categoría |
| Implementar soporte de estudios multi-caso (StudyCohort) | ✅ Hecho | Gestión completa de cohortes con dashboard de fiabilidad |
| Agregar gestión de cohorte de evaluadores | ✅ Hecho | Evaluadores pre-asignados con control de acceso obligatorio |
| Seguimiento de progreso de evaluadores | ✅ Hecho | Seguimiento automático de casos completados por evaluador |

#### Trabajo Pendiente

| Prioridad | Problema | Esfuerzo | Impacto |
| --------- | -------- | -------- | ------- |
| 🟡 Media | Agregar versionado del algoritmo | Medio | Medio - Importante a largo plazo |
| 🟡 Media | Agregar estratificación por expertise en análisis | Medio | Medio - Valioso para publicaciones |
| 🟢 Baja | Agregar cálculo de ICC | Medio | Medio - Métrica alternativa |
| 🟢 Baja | Agregar análisis de divergencia | Alto | Medio - Insights valiosos |
| 🟢 Baja | Agregar análisis basado en tiempo | Bajo | Bajo - Indicadores de calidad |

### 6.2 Diseño de Estudio Recomendado

Para un estudio de fiabilidad apropiado, considera este flujo de trabajo:

```
┌─────────────────────────────────────────────────────────────┐
│                    COHORTE DE ESTUDIO                       │
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐      ┌─────────┐   │
│  │ Caso 1  │  │ Caso 2  │  │ Caso 3  │ ...  │ Caso 30 │   │
│  │ Rayos X │  │ Rayos X │  │ Rayos X │      │ Rayos X │   │
│  │ Est. Oro│  │ Est. Oro│  │ Est. Oro│      │ Est. Oro│   │
│  └────┬────┘  └────┬────┘  └────┬────┘      └────┬────┘   │
│       │            │            │                 │        │
│       └────────────┴────────────┴────────┬───────┘        │
│                                          │                 │
│                                          ▼                 │
│  ┌──────────────────────────────────────────────────────┐ │
│  │              PANEL DE EVALUADORES (Fijo)              │ │
│  │                                                       │ │
│  │  Dr. García   Dr. López    Dr. Lee    Dr. Martínez   │ │
│  │  (Plantilla)  (Plantilla)  (Residente) (Fellow)      │ │
│  │                                                       │ │
│  │  Cada evaluador evalúa TODOS los 30 casos            │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  ANÁLISIS:                                                  │
│  - Kappa de Fleiss a través de todos los evaluadores y casos│
│  - Acuerdo por caso (¿qué casos son más difíciles?)        │
│  - Consistencia por evaluador (¿qué evaluadores son atípicos?)│
│  - Estratificación por experiencia                         │
│  - Intervalos de confianza apropiados                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Nuevas Funciones Sugeridas

#### Estudio Multi-Caso (Cohorte de Estudio)

```
Cohorte de Estudio
├── Caso 1 (Estudio)
│   ├── Imágenes
│   └── Estándar de Oro
├── Caso 2 (Estudio)
│   ├── Imágenes
│   └── Estándar de Oro
└── ... (hasta N casos)

Grupo de Evaluadores
├── Evaluadores asignados (deben completar todos los casos)
└── Seguimiento de progreso por evaluador
```

#### Seguimiento de Versión del Algoritmo

```
Resultado de Clasificación
├── Datos de clasificación
├── Versión del algoritmo: "1.2.3"
├── Hash del algoritmo: "abc123..."
└── Marca de tiempo
```

#### Panel de Analíticas Mejorado

```text
Informe de Fiabilidad
├── Resumen
│   ├── Kappa de Fleiss (con IC)
│   ├── Precisión General
│   └── Evaluación del Tamaño de Muestra
├── Análisis por Sistema
│   ├── Danis-Weber (Kappa, Matriz de Confusión, Sens/Esp)
│   ├── Lauge-Hansen (Kappa, Matriz de Confusión, Sens/Esp)
│   ├── AO/OTA (Kappa Ponderado, Matriz de Confusión)
│   └── Bartonicek (Kappa, Matriz de Confusión)
├── Análisis de Evaluadores
│   ├── Precisión individual
│   ├── Consistencia a lo largo del tiempo
│   └── Correlación con experiencia
└── Análisis de Casos
    ├── Casos con más desacuerdo
    ├── Frecuencia de selección imposible
    └── Distribución de tiempo
```

---

## 7. Protocolo de Validación del Algoritmo

La implementación actual está lista para estudios formales de validación del algoritmo. Esta sección describe cómo realizar un estudio de validación.

### 7.1 Qué Se Puede Validar

| Aspecto | Método | Métrica |
| ------- | ------ | ------- |
| **Fiabilidad inter-evaluador** | Múltiples médicos clasifican los mismos casos | Kappa de Fleiss |
| **Precisión vs estándar de oro** | Comparar clasificaciones de usuarios con consenso experto | Tasa de coincidencia % |
| **Claridad del cuestionario** | Identificar casos con alto desacuerdo | Acuerdo por caso |
| **Fiabilidad por sistema** | Kappa separado para cada sistema de clasificación | Kappa por sistema |

### 7.2 Flujo de Trabajo del Estudio de Validación

```text
1. PREPARACIÓN
   ├── Seleccionar 30+ casos representativos de rayos X
   │   ├── Incluir variedad: Weber A/B/C, diferentes mecanismos
   │   ├── Mezcla de casos claros y desafiantes
   │   └── Múltiples vistas (AP, lateral, mortaja) cuando estén disponibles
   ├── Determinación del Estándar de Oro
   │   ├── 2-3 expertos senior clasifican independientemente cada caso
   │   ├── Resolver desacuerdos mediante discusión de consenso
   │   └── Documentar justificación para cada estándar de oro
   └── Preparar imágenes digitales de alta calidad

2. CONFIGURACIÓN EN ANKLYZE
   ├── Crear estudios individuales (uno por caso)
   │   ├── Subir imágenes de rayos X
   │   ├── Establecer clasificación de referencia (estándar de oro)
   │   └── Mantener como borrador inicialmente
   ├── Crear cohorte de validación
   │   └── Título: "Estudio de Validación del Algoritmo [Año]"
   ├── Añadir todos los estudios a la cohorte (reordenar según necesidad)
   ├── Asignar evaluadores
   │   ├── Mínimo: 4 evaluadores
   │   ├── Recomendado: 6+ evaluadores
   │   └── Mezcla de niveles de experiencia (adjuntos, fellows, residentes)
   └── Activar cohorte cuando esté lista

3. RECOLECCIÓN DE DATOS
   ├── Los evaluadores acceden a los estudios publicados
   ├── Cada evaluador clasifica TODOS los casos independientemente
   ├── El sistema rastrea el progreso automáticamente
   ├── Sin límite de tiempo, pero registrar tiempo por caso
   └── Esperar hasta que todos los evaluadores asignados completen todos los casos

4. ANÁLISIS
   ├── Acceder al Dashboard de Fiabilidad de Cohorte
   ├── Revisar métricas:
   │   ├── Kappa de Fleiss por sistema (con IC 95%)
   │   ├── Tasa de coincidencia con estándar de oro general
   │   ├── Desglose de acuerdo por caso
   │   └── Identificación de casos difíciles
   └── Exportar CSV para análisis estadístico externo (SPSS, R, etc.)
```

### 7.3 Recomendaciones de Tamaño de Muestra

Para validación lista para publicación:

| Parámetro | Mínimo | Recomendado | Notas |
| --------- | ------ | ----------- | ----- |
| **Casos** | 30 | 50+ | Incluir variedad de tipos de fractura |
| **Evaluadores** | 4 | 6+ | Mezcla de niveles de experiencia |
| **Completitud** | 100% | 100% | Todos los evaluadores deben completar TODOS los casos |

### 7.4 Interpretación de Resultados

#### Guía de Interpretación de Kappa

| Kappa de Fleiss | Interpretación | Acción |
| --------------- | -------------- | ------ |
| κ > 0.80 | Casi perfecto | Algoritmo validado ✅ |
| 0.61 - 0.80 | Sustancial | Buena fiabilidad, revisar casos atípicos |
| 0.41 - 0.60 | Moderado | Investigar patrones de confusión |
| 0.21 - 0.40 | Aceptable | El cuestionario puede necesitar revisión |
| < 0.21 | Leve/Pobre | Problemas significativos a abordar |

#### Análisis de Patrones de Resultados

**Alto Kappa + Alta Coincidencia**
- *Significado:* Algoritmo y cuestionario funcionan bien
- *Acción:* Listo para uso clínico ✅

**Alto Kappa + Baja Coincidencia**
- *Significado:* Evaluadores coinciden pero en respuestas incorrectas
- *Acción:* Problema de formación o imágenes ambiguas

**Bajo Kappa + Alta Coincidencia**
- *Significado:* Variación aleatoria se cancela
- *Acción:* Evaluadores poco fiables, mejorar instrucciones

**Bajo Kappa + Baja Coincidencia**
- *Significado:* Cuestionario confuso o imágenes inadecuadas
- *Acción:* Revisar preguntas, mejorar calidad de imagen

### 7.5 Resultados Listos para Publicación

El sistema proporciona datos adecuados para publicación académica:

1. **Métricas Estadísticas**
   - Kappa de Fleiss con intervalos de confianza del 95%
   - Porcentaje de acuerdo (general y por sistema)
   - Sensibilidad/Especificidad por categoría de clasificación
   - VPP, VPN, puntuaciones F1

2. **Datos Exportables**
   - Exportación CSV de todas las respuestas
   - Métricas por caso para tablas
   - Matrices de confusión para cada sistema de clasificación

3. **Visualizaciones**
   - Visualizaciones de medidores Kappa
   - Gráficos de distribución de acuerdo
   - Identificación de casos difíciles

### 7.6 Lista de Verificación de Validación

Antes de concluir un estudio de validación, verificar:

- [ ] Todos los evaluadores asignados completaron TODOS los casos (100% requerido para Kappa de Fleiss)
- [ ] El estándar de oro fue establecido por consenso de expertos independientes
- [ ] La muestra incluye variedad representativa de tipos de fractura
- [ ] Al menos 30 casos evaluados
- [ ] Al menos 4 evaluadores participaron
- [ ] Kappa de Fleiss calculado para cada sistema de clasificación
- [ ] Intervalos de confianza reportados
- [ ] Casos difíciles revisados y documentados
- [ ] Datos CSV exportados para verificación independiente

---

## 8. Glosario

| Término | Definición |
|---------|------------|
| **Acuerdo** | El grado en que dos o más evaluadores dan la misma clasificación |
| **AO/OTA** | Arbeitsgemeinschaft für Osteosynthesefragen / Orthopaedic Trauma Association - un sistema de clasificación de fracturas completo |
| **Bartonicek** | Sistema de clasificación específicamente para fracturas del maléolo posterior |
| **Kappa de Cohen** | Una estadística que mide el acuerdo entre dos evaluadores, ajustado por azar |
| **Intervalo de Confianza** | Un rango de valores que probablemente contiene el verdadero parámetro poblacional |
| **Matriz de Confusión** | Una tabla que muestra la relación entre clasificaciones reales y predichas |
| **Danis-Weber** | Clasificación basada en la ubicación de la fractura del peroné relativa a la sindesmosis |
| **Kappa de Fleiss** | Extensión del Kappa de Cohen para tres o más evaluadores |
| **Estándar de Oro** | La respuesta "correcta", típicamente determinada por consenso de expertos o confirmación quirúrgica |
| **ICC** | Coeficiente de Correlación Intraclase - mide la consistencia de las calificaciones |
| **Fiabilidad Inter-evaluador** | Consistencia de calificaciones entre diferentes evaluadores |
| **Fiabilidad Intra-evaluador** | Consistencia de calificaciones del mismo evaluador a lo largo del tiempo |
| **Kappa** | Una medida estadística de acuerdo inter-evaluador ajustada por azar |
| **Lauge-Hansen** | Clasificación basada en el mecanismo de lesión (posición del pie y dirección de la fuerza) |
| **Datos Nominales** | Categorías sin orden inherente (ej. Weber A, B, C) |
| **Datos Ordinales** | Categorías con un orden natural (ej. 1º, 2º, 3º) |
| **Evaluador** | Una persona que proporciona clasificaciones (médico, usuario) |
| **Sensibilidad** | Capacidad de identificar correctamente casos positivos |
| **Especificidad** | Capacidad de identificar correctamente casos negativos |
| **Estudio/Encuesta** | En Anklyze, un caso con imágenes que los usuarios clasifican |
| **StudyCohort** | Un grupo de múltiples estudios (casos) con evaluadores asignados para análisis de fiabilidad apropiado |
| **Sujeto** | En estudios de fiabilidad, el ítem siendo evaluado (un caso/paciente) |
| **Kappa Ponderado** | Kappa que considera el grado de desacuerdo |

---

## Información del Documento

- **Creado:** 2026-02-01
- **Última Actualización:** 2026-02-02
- **Propósito:** Documentar puntos débiles de la evaluación de fiabilidad y explicar conceptos estadísticos
- **Audiencia:** Equipo de desarrollo de Anklyze y partes interesadas
- **Estado:** Funcionalidades principales implementadas (ver Matriz de Prioridades en sección 6.1)

### Registro de Cambios

| Fecha | Cambios |
| ----- | ------- |
| 2026-02-01 | Documento de análisis inicial |
| 2026-02-01 | Implementado: Corrección de Kappa de Cohen (usa respuesta más reciente), nota de Kappa de Fleiss para caso único, Intervalos de Confianza, Kappa Ponderado para AO/OTA, métricas de Sensibilidad/Especificidad/VPP/VPN/F1, actualizaciones de visualización en frontend |
| 2026-02-02 | **Actualización Mayor - Implementación de StudyCohort:** Soporte completo de estudios multi-caso con gestión de cohortes, asignación de evaluadores con control de acceso obligatorio, seguimiento de progreso, métricas de acuerdo por caso, identificación de casos difíciles y dashboard de fiabilidad de cohorte. Kappa de Fleiss ahora completamente funcional para estudios de cohorte. |

---

*Este documento fue creado para apoyar la validación y mejora del sistema de clasificación de fracturas de tobillo Anklyze.*
