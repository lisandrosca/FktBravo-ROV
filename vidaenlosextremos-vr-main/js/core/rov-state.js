// rov-state.js
// Estado mutable de la aplicación
ROV.state = {
    activeAction: null,    // Para controles táctiles de movimiento
    currentLevelIndex: 5,  // Nivel de velocidad actual (inicia en 1.0)
    hudMode: 0,            // 0: Todo | 1: Telemetría | 2: Nada
    debounce: {
        hud: false,
        reset: false,
        menu: false,
        speed: false
    },
    isLogbookOpen: false,
    gamifiedMode: false,
    // Estado para el rastreo del dedo (Touch Look)
    touchLook: {
        dragging: false,
        lastX: 0,
        lastY: 0
    }
};
