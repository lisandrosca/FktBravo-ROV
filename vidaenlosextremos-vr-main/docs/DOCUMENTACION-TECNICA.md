# 📘 Documentación Técnica: Simulador ROV (FktBravo)

**Versión del Documento:** 1.0  
**Arquitectura:** Modular / Vanilla JS + A-Frame  
**Última Actualización:** 20 de Enero 2026

---

## 0. Visión General de la Arquitectura

El proyecto ha migrado de una estructura monolítica a una **Arquitectura Modular por Capas**. El objetivo es desacoplar los datos, la lógica, la entrada del usuario y el renderizado.

El sistema se divide en 4 módulos lógicos:

1.  **CORE (`js/core/`):** La base del sistema. Inicialización, configuración estática, estado mutable y referencias al DOM.
2.  **SYSTEMS (`js/systems/`):** La lógica de negocio. Física, herramientas (luces, HUD) y manipulación de modelos 3D.
3.  **INPUT (`js/input/`):** La capa de abstracción de control. Unifica Teclado, Touch y Gamepad.
4.  **APP (Raíz `js/`):** El orquestador (`main`) y la inyección de datos (`loader`).

---

## 1. Módulo Core (El Núcleo)

**Ubicación:** `js/core/`

Este módulo es el cimiento de la aplicación. Debe cargarse antes que cualquier otra cosa en el HTML. Su responsabilidad es preparar el entorno global `ROV` y cachear elementos para evitar costosas búsquedas en el DOM durante el bucle de juego.

### 1.1. Inicialización (`rov-init.js`)
Es el punto de entrada ("Bootstrap"). Su única función es asegurar que el espacio de nombres (Namespace) global `window.ROV` exista y tenga sus sub-contenedores listos.

* **Prevención de Errores:** Utiliza `window.ROV = window.ROV || {}` para no sobrescribir si se cargara dos veces por error.
* **Estructura del Namespace:**
    * `refs`: Almacenará elementos HTML.
    * `config`: Almacenará constantes.
    * `state`: Almacenará variables cambiantes.
    * `physics`: Almacenará funciones de movimiento.
    * `actions`: Almacenará funciones de herramientas (luces, UI).
    * `modelHandler`: Almacenará la lógica de carga 3D.

### 1.2. Configuración Estática (`rov-settings.js`)
Define las "reglas del juego" que no cambian durante la ejecución. Actúa como archivo de calibración.

**Parámetros Clave:**
* `speedLevels`: Array `[0.1 ... 3.0]`. Define los multiplicadores de velocidad disponibles. El ROV no tiene aceleración analógica lineal, sino "marchas" o niveles de potencia.
* `baseDepth`: Valor por defecto (`0`). *Nota: Este valor suele ser sobrescrito por `loader.js` al leer el JSON de la misión específica.*
* `deadzone` (0.15): El umbral mínimo para que un stick analógico (Gamepad) registre movimiento. Evita "drift" fantasma.
* `baseMoveSpeed` (0.04): Velocidad base en metros/frame. *Nota: Este valor es dinámico; el `model-handler` lo recalcula según el tamaño del modelo 3D cargado.*

### 1.3. Estado Mutable (`rov-state.js`)
Representa la "memoria" del ROV en tiempo real. Si algo cambia mientras usas la app, vive aquí.

**Variables Críticas:**
* `activeAction`: (String/Null) Usado por el sistema Touch. Si el usuario mantiene presionado un botón en pantalla, aquí se guarda el ID de ese botón (ej: `'move-up'`). El Main Loop lee esto para aplicar movimiento continuo.
* `currentLevelIndex`: Índice del array `speedLevels`. Empieza en 5 (velocidad 1.0).
* `lightsOn`: Booleano para el estado de los focos.
* `hudMode`: Entero (0, 1, 2) que controla qué tanta interfaz se muestra (Ciclo: Todo -> Solo Datos -> Nada).
* `debounce`: Objeto de banderas para evitar que una pulsación de botón se registre 60 veces por segundo. Funciona como un "enfriamiento" (cooldown) de inputs.
* `touchLook`: Objeto específico para la lógica de "arrastrar dedo para mirar". Almacena vectores delta (`lastX`, `lastY`) para calcular la rotación.

### 1.4. Mapeo del DOM (`rov-dom.js`)
**Problema que resuelve:** Buscar elementos con `document.getElementById` es una operación lenta. Hacerlo 60 veces por segundo en el bucle principal destruiría el rendimiento en móviles.
**Solución:** Este script se ejecuta una sola vez al cargar la página, busca todos los elementos necesarios y los guarda en `ROV.refs`.

**Categorías Mapeadas:**
* **Escena 3D:** Referencias directas a entidades de A-Frame (`rig`, `camera`, `pivot`). Es vital para aplicar `setAttribute` en la física.
* **UI Dinámica:** Elementos de texto que cambian rápido (`depthText`, `headText`, `coordsBlock`).
* **Controles:** Botones interactivos (`hudToggle`, `gyroToggle`, `resetBtn`).
* **Grupos:** `hidableElements` es una `NodeList` que permite ocultar toda la interfaz de golpe iterando sobre ella.

---


## 2. Módulo Systems (Lógica de Negocio)

**Ubicación:** `js/systems/`

Este módulo contiene la lógica "dura" del simulador. Son funciones puras o gestores que no dependen directamente de si el usuario está usando un teclado o un joystick, sino que ejecutan las órdenes finales.

### 2.1. Motor Físico (`rov-physics.js`)
Encargado de calcular y aplicar el movimiento vectorial al ROV dentro del espacio 3D.

**Función Principal: `applyMove(surge, sway, heave, isTurbo)`**
Esta función traduce intenciones de movimiento (ej: "ir adelante") en nuevas coordenadas XYZ.
1.  **Cálculo de Velocidad:**
    * Toma la `baseMoveSpeed` (definida por el tamaño del modelo).
    * La multiplica por el nivel de velocidad actual (marchas).
    * Aplica un factor de corrección por Zoom (si el usuario hizo zoom-in, el ROV se mueve más lento para precisión).
2.  **Matemática Vectorial:**
    * Calcula el ángulo total de dirección (`Yaw`) sumando la rotación del Rig (cuerpo del ROV) y la Cámara.
    * Descompone el vector de movimiento usando Trigonometría (Seno y Coseno) para saber cuánto avanzar en X y cuánto en Z.
    * *Nota:* A-Frame usa un sistema de mano derecha donde `-Z` es "adelante".
3.  **Aplicación:**
    * Actualiza el atributo `position` de la entidad `camera-rig`.

### 2.2. Gestor de Acciones (`rov-actions.js`)
Actúa como una "central de comandos" para acciones discretas (On/Off). Desacopla la entrada de la ejecución; no importa si el usuario presionó la tecla 'L' o el botón táctil 'Luz', ambos llaman a la misma función aquí.

**Funciones Clave:**
* `toggleLights()`: Alterna el estado `lightsOn` y ajusta la intensidad de los focos (`Spot` y `Point`) en tiempo real.
* `cycleHUD()`: Máquina de estados finita (0 -> 1 -> 2 -> 0) que controla la visibilidad de las capas de la interfaz (Todo, Solo Datos, Cine).
* `resetPosition()`: "Botón de pánico". Teletransporta el ROV a `0, 1.6, 0` y resetea rotaciones. Útil si el usuario se pierde en el mapa.
* `changeSpeed(direction)`: Sube o baja el índice del array de velocidades con protección de límites (no permite subir más allá del máximo).

### 2.3. Manipulador de Modelos (`rov-model-handler.js`)
Este script resuelve problemas comunes al importar modelos 3D que no tienen texturas incrustadas o escalas normalizadas. Se ejecuta automáticamente al terminar de cargar el `.gltf`.

**Procesos que realiza:**
1.  **Inyección de Texturas (Texture Patching):**
    * Recorre (traverse) todas las mallas del modelo.
    * Busca nodos cuyo nombre coincida con el patrón `material(\d+)`.
    * Intenta cargar manualmente una textura `.jpeg` desde la carpeta `/textures/` relativa al modelo.
    * *Limitación:* Actualmente diseñado para el flujo de trabajo de texturas "Baked Diffuse" (no soporta PBR complejo ni PNGs automáticamente).
2.  **Auto-Escalado (Normalization):**
    * Mide la caja de rebote (Bounding Box) del modelo cargado.
    * Calcula un factor de escala para que el modelo siempre tenga un tamaño "manejable" (aprox. 20 metros virtuales), independientemente de si se exportó en milímetros o kilómetros.
    * Ajusta la velocidad base (`baseMoveSpeed`) logarítmicamente según el tamaño: mapas más grandes permiten movimiento más rápido.

 (Actualización)

2.4. Sistema de Waypoints (rov-waypoints.js)
Nueva funcionalidad (v1.1). Gestiona los puntos de interés interactivos distribuidos en el mapa.
Ciclo de Vida:
 * Init: Detecta la misión actual, carga el archivo data/waypoints.json y genera entidades 3D (A-Frame) en las coordenadas especificadas.
 * Renderizado Adaptativo:
   * Estado Lejos: Esfera pequeña, blanca y semitransparente ("Ghost").
   * Estado Cerca (< 3.5m): Se transforma en un octaedro (diamante) que rota sobre su eje, aumenta de opacidad y escala verticalmente.
 * Sincronización de UI:
   * Al entrar en el radio de activación, hace visible el botón SCAN (#btn-scan) y la etiqueta EXPLORE (#explore-label) en la interfaz.
   * Actualiza ROV.state.activeWaypoint con el ID del punto cercano.
Optimización: La verificación de distancia (update) se ejecuta dentro del bloque Throttled del Main Loop (1 de cada 10 frames) para no saturar la CPU calculando distancias euclidianas 60 veces por segundo.
2. En la Sección "2. Módulo Systems > 2.2. Gestor de Acciones",:
 * scanWaypoint(): Verifica si hay un waypoint activo en el estado. Si existe, dispara un feedback visual en el botón (flash blanco/negro) y registra la interacción en consola (preparado para futura apertura de modales/videos).
3. En la Sección "3. Módulo Input > 3.2. Controlador de Gamepad", actualizar:
A. Gamepad (API HTML5)
(...contenido existente...)
 * Botón Contextual (A / Cruz / Button 0): Implementa lógica condicional:
   * Si hay Waypoint cerca: Ejecuta scanWaypoint() (Interactuar).
   * Si NO hay Waypoint: Ejecuta cycleHUD() (Cambiar interfaz).
4. En la Sección "3. Módulo Input > 3.1. Teclado", actualizar:
 * Interacción: Se ha mapeado la tecla Enter para activar scanWaypoint().
5. En la Sección "4. Flujo de Aplicación > 4.3. Estructura de Datos", actualizar:
4.3. Estructura de Datos
A. Misiones (data/dives.json)
Se agregaron coordenadas de inicio para evitar el "hardcoding" en el código.
"nombre-mision": {
  "id": "S0883",
  "title": "The Whale Fall",
  "depth": 3895,
  "start_position": { "x": 0, "y": 2, "z": 10 }, 
  "start_rotation": { "x": 0, "y": 0, "z": 0 },
  "model_path": "..."
}

B. Puntos de Interés (data/waypoints.json) (NUEVO)
Define la ubicación y contenido de los puntos interactivos.
"nombre-mision": [
  {
    "id": "wp-unique-id",
    "position": { "x": 10, "y": -2, "z": 5 },
    "title": "Título del hallazgo",
    "icon": "video", 
    "content": { ... }
  }
]

Interfaz de Usuario (UI)
5. Arquitectura de Interfaz (CSS Grid)
Para garantizar la alineación perfecta de los controles en pantalla, se migró de un posicionamiento absoluto manual a un sistema de CSS Grid Layout.
Contenedor Derecho (.right-grid-layout):
Utiliza una grilla de 3x3 celdas para alinear los botones de Velocidad (SPD), Zoom (ZOM) y Vertical (VRT).
 * Fila Superior:
   * Celdas 1-2: Etiqueta "EXPLORE" (centrada).
   * Celda 3: Botón SCAN (contextual).
 * Fila Inferior: Botones de control estándar.
Comportamiento:
Los elementos contextuales (#btn-scan, #explore-label) utilizan opacity: 0 y pointer-events: none cuando están inactivos, pero mantienen su espacio reservado en la grilla (o colapsan controladamente) para evitar saltos bruscos en la disposición de los botones inferiores.


---


## 3. Módulo Input (Sistema de Entrada)

**Ubicación:** `js/input/`

Este módulo actúa como la interfaz entre el mundo físico (usuario) y el sistema digital. Su responsabilidad es capturar eventos crudos, normalizarlos y delegar la ejecución a `ROV.physics` (movimiento continuo) o `ROV.actions` (acciones discretas).

### 3.1. Controlador de Teclado (`rov-input-keyboard.js`)
Implementa un sistema híbrido de "Eventos + Polling" para garantizar una respuesta suave y sin retrasos.

**Estrategia de Captura:**
1.  **Registro de Estado (`keyState`):** Se usan listeners globales `keydown` y `keyup` para mantener un objeto de "teclas presionadas actualmente". Esto permite combinaciones diagonales (ej: W + A) sin bloqueo de teclas.
2.  **Loop de Ejecución (`ROV.updateKeyboard`):** Esta función es llamada por el Main Loop en cada frame. Verifica el objeto `keyState` y calcula los vectores de fuerza.

**Características Destacadas:**
* **Seguridad de Foco:** Detecta si el usuario está escribiendo en un `<input>` HTML para evitar que el ROV se mueva mientras se escribe texto.
* **Dual Heave (Ascenso/Descenso):** Soporta dos esquemas simultáneos para accesibilidad:
    * *Estándar Gamer:* `Espacio` (Subir) / `Shift` (Bajar).
    * *Estándar Simulador:* `E` (Subir) / `Q` (Bajar).
* **Acciones Discretas:** Las teclas como 'L' (Luces) o 'R' (Reset) se ejecutan directamente en el evento `keydown` (con protección `!e.repeat`) para evitar que la luz parpadee violentamente si se mantiene la tecla.

### 3.2. Controlador de Gamepad y Touch (`rov-controls.js`)
Este archivo gestiona tres tipos de entrada diferentes: Gamepad físico, Interfaz Táctil (UI) y Gestos de Arrastre (Touch Look).

#### A. Gamepad (API HTML5)
La función `updateGamepad()` se ejecuta en cada frame.
* **Movimiento (Sticks & Gatillos):**
    * *Axis 0/1 (Stick Izq):* Controla Surge y Sway.
    * *Botones 6/7 (Gatillos L2/R2):* Controlan el Heave (Vertical) analógico.
    * Aplica una *Deadzone* (Zona muerta) definida en la configuración para evitar movimientos fantasmas.
* **Lógica "Winner Takes All" (Cámara):**
    * Para la rotación con el Stick Derecho, el sistema evalúa qué eje tiene mayor intención (Horizontal vs Vertical).
    * Ignora el eje menor si la diferencia es significativa. Esto estabiliza la cámara, permitiendo paneos cinematográficos suaves sin desviaciones diagonales accidentales.
* **Debouncing:** Implementa un sistema de enfriamiento temporal para botones de acción (UI) para evitar múltiples disparos en un solo clic.

#### B. Interfaz de Usuario (Virtual Joystick)
Utiliza una IIFE (Función Inmediata) `initUIControls` para vincular los elementos del DOM.
* **Botones de Estado (`touchstart`/`mousedown`):** Al mantener presionado un botón (ej: flecha arriba), no se mueve el ROV directamente. En su lugar, se establece `ROV.state.activeAction = 'move-up'`. El `rov-main.js` leerá este estado y aplicará la física correspondiente.
* **Botones de Acción (`click`):** Vinculación directa a `ROV.actions` (ej: el botón de la bombilla llama a `toggleLights`).

#### C. Touch Look (Arrastre en pantalla)
La función `initTouchRotation()` permite mover la cámara arrastrando el dedo por cualquier parte vacía de la pantalla.
* Calcula el `delta` (diferencia) entre la posición del dedo en el frame anterior y el actual.
* Replica la lógica "Winner Takes All" del Gamepad para mantener la estabilidad visual.
* Utiliza un "Bias Horizontal" (handicap de 0.65) que hace que sea un poco más difícil mirar hacia arriba/abajo que hacia los lados, imitando la inercia de un ROV pesado bajo el agua.

---
## 4. Flujo de Aplicación (Orquestación y Datos)

**Ubicación:** Raíz `js/`, `data/` y `css/`

Este módulo conecta los sistemas lógicos (Core, Systems, Input) con la interfaz visual y los datos de la misión. Es el "Director de Orquesta".

### 4.1. Ingesta de Datos (`loader.js`)
Este script transforma una página estática HTML en una aplicación dinámica basada en datos. Se ejecuta en el evento `DOMContentLoaded`.

**Lógica de Enrutamiento Estático:**
En lugar de usar un servidor backend, el sistema deduce qué misión cargar basándose en el nombre del archivo HTML.
1.  **Detección:** `whale_fall.html` -> Se convierte en la clave `whale-fall`.
2.  **Fetch:** Solicita `../data/dives.json`.
3.  **Hidratación:** Busca la clave en el JSON y rellena los bloques de telemetría del DOM (`ui-title`, `ui-depth`, `ui-temp`, etc.).
4.  **Carga 3D:** Inyecta la URL del modelo (`model_path`) en el atributo `gltf-model` de la entidad A-Frame.

**Gestión del Giroscopio:**
Incluye la lógica específica para dispositivos móviles (especialmente iOS 13+), solicitando permisos de `DeviceOrientationEvent` mediante un clic de usuario (requisito de seguridad de los navegadores modernos).

### 4.2. El Bucle Principal (`rov-main.js`)
Contiene el **Game Loop** (Bucle de Juego) que corre a 60 cuadros por segundo (FPS) usando `requestAnimationFrame`.

**Ciclo de Vida:**
1.  **Init:** `initSystem()` configura la cámara y desactiva los controles táctiles nativos de A-Frame para usar nuestro sistema de "Touch Look" personalizado.
2.  **Model Event:** Escucha el evento `model-loaded`. Cuando el 3D está listo, llama a `ROV.modelHandler.setupModel()` (ver Sección 2.3) para corregir texturas y escalas automáticamente.
3.  **Update Loop (Tick):**
    * **Prioridad A (Física):** Se ejecuta en *cada frame*. Verifica Gamepad, Teclado (`ROV.updateKeyboard`) y Touch Virtual. Si hay input, llama a `ROV.physics.applyMove`.
    * **Prioridad B (UI):** Se ejecuta *1 de cada 10 frames* (Throttling).

**Optimización de Rendimiento (The Frame Counter):**
El acceso al DOM (Leer `getAttribute` o escribir `innerText`) es costoso computacionalmente.
* *Problema:* Actualizar las coordenadas XYZ en pantalla 60 veces por segundo causa "tirones" (stuttering) en móviles.
* *Solución:* Una variable `frameCounter` y un condicional `if (frameCounter % 10 !== 0) return;` aseguran que el texto solo se actualice 6 veces por segundo. Esto libera al procesador para dedicar el 90% de los recursos a la física y el renderizado 3D.

### 4.3. Estructura de Datos (`data/dives.json`)
Actúa como la base de datos local. Permite agregar nuevas misiones simplemente subiendo un modelo a la carpeta `assets` y agregando una entrada aquí, sin tocar código JavaScript.

**Esquema:**
```json
"nombre-mision": {
  "id": "Código de sitio (ej: S0883)",
  "title": "Nombre legible",
  "depth": Profundidad en metros (Display),
  "model_path": "Ruta relativa al archivo .gltf/.glb",
  "env_data": { ...temperatura, salinidad, etc... }
}
