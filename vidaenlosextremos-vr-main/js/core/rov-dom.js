// rov-dom.js
// Mapeo de elementos del DOM a referencias de JavaScript
// Se ejecuta inmediatamente porque los scripts están al final del body.

ROV.refs = {
    // Sistema
    debug: document.getElementById('debug-console'),

    // Escena 3D
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
    resetBtn: document.getElementById('reset-pos'),
    gyroToggle: document.getElementById('gyro-toggle'),

    // Luces
    rovOmni: document.getElementById('rov-omni'),
    rovPoint: document.getElementById('rov-point'),

    // Grupos
    hidableElements: document.querySelectorAll('.hidable')
};


















