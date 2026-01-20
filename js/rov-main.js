// rov-main.js
// Orquestador principal. Bucle de render y manejo de eventos globales.

let frameCounter = 0; // Para optimizar actualizaciones de UI

// 1. Evento de carga de modelo (Delegamos al Handler)
ROV.refs.mapEntity.addEventListener('model-loaded', () => {
    const mesh = ROV.refs.mapEntity.getObject3D('mesh');
    if (ROV.modelHandler) {
        ROV.modelHandler.setupModel(mesh);
    }
    
    // Feedback visual en consola debug
    if(ROV.refs.debug) {
        ROV.refs.debug.innerText = "SYSTEM: ROV Online - Dive Active";
        setTimeout(() => { ROV.refs.debug.style.opacity = "0"; }, 5000);
    }
});

// 2. Inicialización del Sistema
function initSystem() {
    // Inicializar rotación táctil (si existe en controles)
    if(typeof initTouchRotation === 'function') {
        initTouchRotation();
        console.log("[Main] Touch Controls Ready");
    }

    // Configurar cámara (Desactivar conflictos nativos)
    if (ROV.refs.cam) {
        ROV.refs.cam.setAttribute('look-controls', {
            touchEnabled: false, 
            mouseEnabled: false,
            magicWindowTrackingEnabled: true 
        });
    }

    // Iniciar el loop
    updateLoop();
}

// 3. Bucle Principal (60 FPS)
function updateLoop() {
    requestAnimationFrame(updateLoop);

    const { cam, rig, headText, depthText, coordsBlock } = ROV.refs;
    const { activeAction } = ROV.state;

    // --- A. LÓGICA DE CONTROL (Prioridad Alta) ---
    
    // 1. Gamepad
    if(typeof updateGamepad === 'function') updateGamepad();

    if(ROV.updateKeyboard) 
ROV.updateKeyboard(); 

    // 2. Touch Virtual
    if (activeAction) {
        let fov = cam.getAttribute('camera').fov;
        let surge = 0, sway = 0, heave = 0;

        // Mapeo
        if (activeAction === 'move-up')    surge = 1;
        if (activeAction === 'move-down')  surge = -1;
        if (activeAction === 'move-left')  sway = -1;
        if (activeAction === 'move-right') sway = 1;
        if (activeAction === 'ascend')     heave = 1;
        if (activeAction === 'descend')    heave = -1;

        // Aplicar movimiento
        if (surge !== 0 || sway !== 0 || heave !== 0) {
            ROV.physics.applyMove(surge, sway, heave, false); 
        }

        // Zoom (Propiedad de cámara)
        const zoomSpd = ROV.config.baseZoomSpeed;
        if (activeAction === 'zoom-in') fov = Math.max(5, fov - (zoomSpd * (fov/80)));
        if (activeAction === 'zoom-out') fov = Math.min(150, fov + (zoomSpd * (fov/80)));
        
        // Optimización: Solo setear si cambió
        if (fov !== cam.getAttribute('camera').fov) {
            cam.setAttribute('camera', 'fov', fov);
        }
    }

    // --- B. LÓGICA DE UI (Prioridad Baja - Throttled) ---
    // Solo actualizamos textos 1 de cada 10 frames para mejorar rendimiento en móvil
    
    frameCounter++;
    if (frameCounter % 10 !== 0) return; // Saltamos actualización de UI

    // Lecturas lentas (getAttribute es lento)
    // Nota: En fase 3 optimizaremos para leer de object3D directamente
    const rot = cam.getAttribute('rotation');
    const rigRot = rig.getAttribute('rotation') || {y:0};
    const pos = rig.getAttribute('position');

    // Heading
    if(headText) {
        const h = Math.floor((360 - ((rot.y + rigRot.y) % 360)) % 360);
        headText.innerText = h.toString().padStart(3, '0');
    }
    
    // Profundidad
    if(depthText) {
        const bDepth = ROV.config.baseDepth || 0;
        depthText.innerText = Math.floor(bDepth - pos.y);
    }

    // Coordenadas XYZ
    if (coordsBlock) {
        coordsBlock.innerText = 
            `X: ${pos.x.toFixed(2)}  Y: ${pos.y.toFixed(2)}  Z: ${pos.z.toFixed(2)}`;
    }
}

// Evento Gamepad
window.addEventListener("gamepadconnected", (e) => {
    if(ROV.refs.debug) {
        ROV.refs.debug.innerText = `CONNECTED: ${e.gamepad.id.split('(')[0]}`;
        ROV.refs.debug.style.opacity = "1";
        setTimeout(() => { ROV.refs.debug.style.opacity = "0"; }, 3000);
    }
});

// Arrancar
initSystem();
