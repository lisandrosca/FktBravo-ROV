
# VIDA EN LOS EXTREMOS: ROV Mission Control

**Visualizador interactivo 3D y simulador de ROV para la exploración de hábitats marinos profundos.**

Este proyecto permite navegar modelos de fotogrametría de alta resolución recolectados durante la campaña científica **FKt251206** a bordo del R/V Falkor (too). La interfaz emula el sistema de telemetría y control de un ROV (Remotely Operated Vehicle) real, integrando datos de profundidad, rumbo y condiciones ambientales en una experiencia optimizada tanto para escritorio como para dispositivos móviles.

---

## 🌊 Ambientes Explorables

El simulador carga dinámicamente los datos de inmersión basados en registros reales:

* **S0883 - The Whale Fall:** Caída de ballena a 3895m de profundidad.
* **S0889 - Clam Bed:** Banco de almejas *Vesicomyidae* (618m).
* **S0892 - Giant Corals:** Jardines de corales *Paragorgia sp.* (483m).

---

## 🚀 Características Técnicas

* **Arquitectura Modular:** Código en capas lógicas (Core, Systems, Input) para escalabilidad y mantenimiento.
* **Motor Gráfico:** Basado en **A-Frame (Three.js)**, garantizando compatibilidad con WebVR.
* **Física Vectorial:** Sistema de movimiento con inercia, cálculo de vectores de empuje y gestión de colisiones básica.
* **Soporte Multi-Input:** Control transparente mediante Pantalla Táctil, Teclado o Gamepad (Joystick) conectado por USB/Bluetooth.
* **Telemetría Dinámica:** HUD (Heads-Up Display) inspirado en el Schmidt Ocean Institute con actualización de datos en tiempo real optimizada para rendimiento (Throttling).
* **Texture Patching:** Sistema `model-handler` que inyecta texturas y corrige escalas de modelos GLTF/GLB al vuelo.

---

## 🎮 Manual de Operaciones (Controles)

El ROV se puede pilotar de tres formas distintas. El sistema detecta automáticamente la entrada activa.

### 1. Teclado (Escritorio)
| Acción | Teclas (Opción A) | Teclas (Opción B) |
| :--- | :--- | :--- |
| **Moverse (Plano)** | `W` `A` `S` `D` | - |
| **Ascender / Descender** | `Espacio` / `Shift` | `E` / `Q` |
| **Girar Cámara** | `Flechas Dirección` | Mouse Drag |
| **Velocidad** | `1` (Disminuir) | `2` (Aumentar) |
| **Luces** | `L` | - |
| **HUD (Interfaz)** | `H` | - |
| **Reset Posición** | `R` | - |
| **Pantalla Completa** | `F` | - |

### 2. Táctil (Móvil / Tablet)
* **Joystick Virtual:** Mantén presionado los botones en la zona inferior izquierda para moverte.
* **Touch Look:** Arrastra el dedo en cualquier zona vacía de la pantalla para girar la cámara.
* **Acciones:** Botones dedicados en pantalla para Zoom, Luces y HUD.
* **Giroscopio:** Icono disponible en móviles para controlar la cámara con el movimiento del dispositivo.

### 3. Gamepad (Xbox / PlayStation)
Conecta tu mando y presiona cualquier botón para activar.
* **Stick Izquierdo:** Desplazamiento horizontal.
* **Stick Derecho:** Cámara (Con estabilización "Winner Takes All").
* **Gatillos (L2/R2):** Ascender y Descender (Analógico).
* **Botones Faciales:** `A` (HUD), `Y` (Luces), `X` (Reset).

---

## 📂 Estructura del Proyecto

```text
VIDA-EN-LOS-EXTREMOS/
├── index.html                  # Menú principal de selección de misiones
├── habitats/                   # Visores (Entry points)
│   ├── whale_fall.html         
│   ├── clam_bed.html           
│   └── giant_corals.html       
├── js/                         # Lógica de la Aplicación
│   ├── core/                   # Inicialización y Estado
│   │   ├── rov-init.js
│   │   ├── rov-settings.js
│   │   ├── rov-state.js
│   │   └── rov-dom.js
│   ├── systems/                # Lógica de Negocio y Física
│   │   ├── rov-physics.js
│   │   ├── rov-actions.js
│   │   └── rov-model-handler.js
│   ├── input/                  # Controladores
│   │   ├── rov-controls.js
│   │   └── rov-input-keyboard.js
│   ├── loader.js               # Ingesta de datos y enrutamiento
│   └── rov-main.js             # Bucle principal (Game Loop)
├── data/
│   └── dives.json              # Base de datos de las misiones
├── css/
│   └── rov-styles.css          # Estilos de la interfaz HUD
├── assets/                     
│   ├── images/                 
│   └── models/                 # Modelos 3D (GLTF/GLB + Texturas)
└── README.md                   

🛠️ Instalación y Uso
Debido a las políticas de seguridad de los navegadores (CORS) para cargar modelos 3D y texturas locales, este proyecto requiere un servidor local.
 * Clona el repositorio.
 * Abre la terminal en la carpeta del proyecto.
 * Inicia un servidor simple (ejemplo con Python):
   python -m http.server

 * Abre tu navegador en http://localhost:8000.


🎓 Créditos y Reconocimientos
Este desarrollo es parte de las iniciativas de divulgación científica asociadas a la campaña FKt251206 Bravo (2025-2026).
 * Institución: Schmidt Ocean Institute (SOI) - R/V Falkor (too) & ROV SuBastian.
 * Datos y Modelos 3D: Ben Erwin.
 * Dirección Científica: María Emilia Bravo.
 * Desarrollo y Programación: Lisandro Scarrone, estudiante de Ciencias Biológicas (UBA).


> Nota: Este software es un prototipo educativo y una herramienta de apoyo para la visualización de datos del mar profundo argentino.
> 



















