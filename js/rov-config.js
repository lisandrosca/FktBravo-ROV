window.ROV = {
    // 1. Referencias al DOM (Se cargan al inicio)
    refs: {
        debug: document.getElementById('debug-console'),
        mapEntity: document.getElementById('map-entity'),
        rig: document.getElementById('camera-rig'),
        cam: document.getElementById('main-camera'),
        pivot: document.getElementById('cam-pivot'),
        
        // UI Textos
        depthText: document.getElementById('depth-val'),
        headText: document.getElementById('head-val'),
        speedValText: document.getElementById('speed-val'),
        
        // UI Bloques
        telemetryBlock: document.getElementById('telemetry-block'),
        controlsContainer: document.getElementById('controls-container'),
        dateBlock: document.getElementById('date-block'),
        coordsBlock: document.getElementById('coords-block'),
        
        // Botones UI
        hudToggle: document.getElementById('hud-toggle'),
        fsToggle: document.getElementById('fullscreen-toggle'),
        lightToggle: document.getElementById('light-toggle'),
        resetBtn: document.getElementById('reset-pos'),
        
        // Luces
        rovSpot: document.getElementById('rov-spot'),
        rovPoint: document.getElementById('rov-point'),
        
        // Grupos
        hidableElements: document.querySelectorAll('.hidable')
    },

    // 2. Configuración (Constantes)
    config: {
        speedLevels: [0.1, 0.2, 0.4, 0.6, 0.8, 1.0, 1.5, 2.0, 3.0],
        baseDepth: 3895.0,
        deadzone: 0.15,
        baseZoomSpeed: 0.8,
        // baseMoveSpeed se calculará dinámicamente al cargar el modelo
        baseMoveSpeed: 0.04,
        // NUEVO: Sensibilidad para la rotación táctil
        touchSensitivity: 0.15
    },

    // 3. Estado Mutable (Variables que cambian)
    state: {
        activeAction: null,    // Para controles táctiles de movimiento
        currentLevelIndex: 5,  // Nivel de velocidad actual
        lightsOn: true,
        hudMode: 0,            // 0: Todo | 1: Telemetría | 2: Nada
        debounce: { light: false, hud: false, reset: false, menu: false, speed: false },
        
        // NUEVO: Estado para el rastreo del dedo (Touch Look)
        touchLook: {
            dragging: false,
            lastX: 0,
            lastY: 0
        }
    },

    // 4. Métodos de Física Centralizada
    physics: {
        /**
         * Calcula y aplica el movimiento al RIG basado en inputs normalizados.
         * @param {number} surge - Movimiento adelante/atrás (-1 a 1)
         * @param {number} sway  - Movimiento lateral izquierda/derecha (-1 a 1)
         * @param {number} heave - Movimiento vertical arriba/abajo (-1 a 1)
         * @param {boolean} isTurbo - Si se aplica multiplicador extra (ej. stick analógico)
         */
        applyMove: function(surge, sway, heave, isTurbo = false) {
            const refs = ROV.refs;
            const conf = ROV.config;
            const state = ROV.state;

            if (!refs.rig || !refs.cam) return;

            // Datos actuales
            const rot = refs.cam.getAttribute('rotation'); // Rotación cámara
            const rigRot = refs.rig.getAttribute('rotation') || {x:0, y:0, z:0};
            const currentPos = refs.rig.getAttribute('position');
            const fov = refs.cam.getAttribute('camera').fov;

            // 1. Calcular Velocidad actual
            // Fórmula: Base * (Zoom/80) * NivelVelocidad * (Turbo si aplica)
            const speedMult = conf.speedLevels[state.currentLevelIndex];
            const turboMult = isTurbo ? 1.5 : 1.0;
            const currentSpeed = conf.baseMoveSpeed * (fov / 80) * speedMult * turboMult;

            // 2. Calcular Angulo Total (Rig + Cámara)
            const totalAngleY = (rigRot.y + rot.y) * (Math.PI / 180);

            // 3. Calcular desplazamientos
            // Surge (Adelante/Atrás)
            if (surge !== 0) {
                currentPos.x -= surge * Math.sin(totalAngleY) * currentSpeed;
                currentPos.z -= surge * Math.cos(totalAngleY) * currentSpeed;
            }

            // Sway (Strafe Lateral)
            if (sway !== 0) {
                currentPos.x += sway * Math.cos(totalAngleY) * currentSpeed;
                currentPos.z -= sway * Math.sin(totalAngleY) * currentSpeed;
            }

            // Heave (Vertical)
            if (heave !== 0) {
                // Ajuste leve: vertical suele ser un poco más lento (0.7 u 0.8)
                currentPos.y += heave * currentSpeed * 0.8;
            }

            // 4. Aplicar al DOM
            refs.rig.setAttribute('position', currentPos);
        },

        // Helper para UI de velocidad
        updateSpeedUI: function() {
            if (ROV.refs.speedValText) {
                ROV.refs.speedValText.innerText = ROV.config.speedLevels[ROV.state.currentLevelIndex].toFixed(1);
            }
        }
    }
};
