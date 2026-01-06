VIDA EN LOS EXTREMOS: ROV Mission Control

VIDA EN LOS EXTREMOS es un visualizador interactivo 3D basado en web diseñado para explorar hábitats marinos profundos del Atlántico Sur. 

Este proyecto permite navegar modelos de fotogrametría de alta resolución recolectados durante la campaña científica FKt251206 Bravo a bordo del R/V Falkor (too).

La interfaz emula el sistema de telemetría y control de un ROV real, integrando datos de profundidad, rumbo y condiciones ambientales en una experiencia optimizada para dispositivos móviles.

🌊 Ambientes Explorables
 * S0883 - The Whale Fall: Un análisis de la sucesión biológica y el reciclaje de nutrientes a 3895 M de profundidad.
 * S0890 - Clam Beds: Comunidades quimiosintéticas de bivalvos (Vesicomyidae sp.) observadas a 690 M.
 * S0892 - Giant Corals: Estructuras de hábitat formadas por grandes corales de agua fría (Paragorgia sp.) a 420 M.

🚀 Características Técnicas
 * Motor: Desarrollado con A-Frame para garantizar compatibilidad con WebVR y dispositivos móviles sin necesidad de aplicaciones externas.
 * Interfaz de Usuario (HUD): Inspirada en la consola de operaciones del Schmidt Ocean Institute (SOI), con telemetría dinámica en tiempo real.
 * Sistema de Doble Imagen: Menú de selección con vistas de ambiente y detalles (close-ups) interactivos.
 * Control Táctico: Soporte para navegación táctil y preparado para integración con Gamepad Bluetooth.

🎓 Créditos y Reconocimientos
Este proyecto es el resultado de la colaboración y el esfuerzo científico durante la campaña FKt251206 Bravo (2025-2026).
 * Institución: Schmidt Ocean Institute (SOI) por facilitar la plataforma de investigación R/V Falkor (too) y el ROV SuBastian.
 * Modelos 3D y Fotogrametría: Ben Erwin.
 * Dirección Científica: María Emilia Bravo.
 * Desarrollo: Lisandro Scarrone, estudiante de Ciencias Biológicas (UBA) y comunicador científico.

📂 Estructura del Proyecto
```text
VIDA-EN-LOS-EXTREMOS/
├── index.html                  # Menú principal de selección de misiones
├── habitats/                   # Visores específicos de cada ambiente
│   ├── whale_fall.html         # Dive S0883
│   ├── clam_bed.html           # Dive S0889
│   └── giant_corals.html       # Dive S0892
├── assets/                     # Recursos multimedia y modelos
│   ├── images/                 # Miniaturas y close-ups para el menú
│   │   ├── whale_fall.jpg
│   │   ├── whale_fall_close.jpg
│   │   └── ...
│   └── models/                 # Modelos de fotogrametría (Ben Erwin)
│       ├── whale-fall/
│       │   ├── scene.gltf      # Modelo 3D de la ballena
│       │   └── textures/       # Mapas de color (materialX_diffuse.jpeg)
│       ├── clam-bed/
│       └── giant-corals/
└── README.md                   # Documentación del proyecto
```

Nota: Este software es un prototipo de divulgación científica y una herramienta de apoyo para la visualización de datos de ecología bentónica.


