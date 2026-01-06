VIDA EN LOS EXTREMOS: ROV Mission Control

VIDA EN LOS EXTREMOS es un visualizador interactivo 3D basado en web diseñado para explorar hábitats marinos profundos. 

Este proyecto permite navegar modelos de fotogrametría de alta resolución recolectados durante la campaña científica FKt251206 Bravo a bordo del R/V Falkor (too).

La interfaz emula el sistema de telemetría y control de un ROV real, integrando datos de profundidad, rumbo y condiciones ambientales en una experiencia optimizada para dispositivos móviles.

🌊 Ambientes Explorables
 * S0883 - The Whale Fall.
 * S0890 - Clam Beds. Próximamente.
 * S0892 - Giant Corals. Próximamente.

🚀 Características Técnicas
 * Motor: Desarrollado con A-Frame para garantizar compatibilidad con WebVR y dispositivos móviles.
 * Interfaz de Usuario (HUD): Inspirada en la consola de operaciones del Schmidt Ocean Institute (SOI), con telemetría dinámica en tiempo real.

  * Créditos y Reconocimientos
Este proyecto es el resultado de la colaboración y el esfuerzo científico durante la campaña FKt251206 Bravo (2025-2026).
 * Institución: Schmidt Ocean Institute (SOI) por facilitar la plataforma de investigación R/V Falkor (too) y el ROV SuBastian.
 * Modelos 3D y Fotogrametría: Ben Erwin.
 * Dirección Científica: María Emilia Bravo.
 * Desarrollo: Lisandro Scarrone, estudiante de Ciencias Biológicas (UBA).

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


