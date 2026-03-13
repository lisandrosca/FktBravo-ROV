// rov-controls.js

// --- 1. GAMEPAD INPUT ---
function updateGamepad() {
    const gamepads = navigator.getGamepads();
    let anyActive = false;

    for (let i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i];
        if (!gp || !gp.connected) continue;

        // Check for UI Exit (Gamepad B button)
        if (ROV.controlsUI && ROV.controlsUI.checkGPExit) {
            ROV.controlsUI.checkGPExit(gp);
        }

        anyActive = true;
        processGamepadInput(gp);
    }
}

function processGamepadInput(gp) {
    // BLOQUEO POR MODAL (Prioridad Máxima)
    if (ROV.state.isLogbookOpen) {
        // Permitir cerrar con botón B (índice 1) o Start (9)
        if (gp.buttons[1].pressed || gp.buttons[9].pressed) {
            // Debounce simple para que no parpadee
            if (!ROV.state.debounce.menu) {
                ROV.modal.close();
                triggerDebounce('menu');
            }
        }
        return; // <--- IMPORTANTE: Detiene todo el movimiento si el modal está abierto
    }

    // --- LÓGICA NORMAL DE JUEGO ---

    const { state, config } = ROV;

    // A. MOVIMIENTO (Sway/Surge con LS)
    const lx = Math.abs(gp.axes[0]) > 0.1 ? gp.axes[0] : 0;
    const ly = Math.abs(gp.axes[1]) > 0.1 ? -gp.axes[1] : 0;

    // ELEVAR/DESCENDER (Ahora en L1/R1 - Indices 4/5)
    let heave = 0;
    if (gp.buttons[4].pressed) heave = -1; // L1 (Descend)
    if (gp.buttons[5].pressed) heave = 1;  // R1 (Ascend)

    if (lx !== 0 || ly !== 0 || heave !== 0) {
        ROV.physics.applyMove(ly, lx, heave, true);
    }

    // B. ROTACIÓN (RS - Invertido Y por petición de usuario)
    handleGamepadRotation(gp);

    // C. ACCIONES DISCRETAS
    const db = state.debounce;

    // ZOOM (Ahora en L2/R2 - Indices 6/7 para mayor control analógico/suave)
    let fov = ROV.refs.cam.getAttribute('camera').fov;
    if (gp.buttons[7].pressed) fov = Math.max(5, fov - 1); // R2 (Zoom In)
    if (gp.buttons[6].pressed) fov = Math.min(140, fov + 1); // L2 (Zoom Out)
    if (fov !== ROV.refs.cam.getAttribute('camera').fov) {
        ROV.refs.cam.setAttribute('camera', 'fov', fov);
    }

    // CAMBIO DE VELOCIDAD (D-Pad Up/Down - Indices 12/13)
    if (gp.buttons[12].pressed && !db.speed) { ROV.actions.changeSpeed(1); triggerDebounce('speed'); }
    if (gp.buttons[13].pressed && !db.speed) { ROV.actions.changeSpeed(-1); triggerDebounce('speed'); }

    // --- BOTONES DE ACCIÓN ---
    // BTN A (Square / BTN 2) -> Alternar HUD
    if (gp.buttons[2].pressed && !db.hud) {
        ROV.actions.cycleHUD();
        triggerDebounce('hud');
    }

    // BTN Cross (X / BTN 0) -> ACCIÓN CONTEXTUAL (Scan)
    if (gp.buttons[0].pressed && !db.action) {
        if (ROV.state.activeWaypoint) {
            ROV.actions.scanWaypoint();
        }
        triggerDebounce('action');
    }

    // BOTONES DE SISTEMA
    if (gp.buttons[8].pressed && !db.reset) { ROV.actions.resetPosition(); triggerDebounce('reset'); } // Share/Select

    // START/OPTIONS (BTN 9) se captura en rov-controls-ui.js para el menú, 
    // pero mantenemos debounce aquí si fuera necesario para otras lógicas.
}

function handleGamepadRotation(gp) {
    const { rig, pivot } = ROV.refs;
    let rawRx = gp.axes[2];
    let rawRy = -gp.axes[3]; // <--- INVERTIDO POR PETICIÓN DE USUARIO

    if (Math.abs(rawRx) < ROV.config.deadzone) rawRx = 0;
    if (Math.abs(rawRy) < ROV.config.deadzone) rawRy = 0;

    const verticalHandicap = 0.65;
    let finalRx = 0, finalRy = 0;

    if (rawRx !== 0 || rawRy !== 0) {
        if (Math.abs(rawRx) >= Math.abs(rawRy) * verticalHandicap) {
            finalRx = rawRx;
        } else {
            finalRy = rawRy;
        }
    }

    if (finalRx !== 0 || finalRy !== 0) {
        ROV.actions.look(-finalRx * 2.0, finalRy * 1.5);
    }
}

function triggerDebounce(key) {
    ROV.state.debounce[key] = true;
    setTimeout(() => ROV.state.debounce[key] = false, 300);
}


// --- 2. TOUCH & UI INPUT ---
(function initUIControls() {
    const bindClick = (id, actionFn) => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('ui-clickable');
            el.onclick = actionFn;
        }
    };

    bindClick('hud-toggle', ROV.actions.cycleHUD);
    bindClick('fullscreen-toggle', ROV.actions.toggleFullscreen);
    bindClick('reset-pos', ROV.actions.resetPosition);
    bindClick('speed-plus', () => ROV.actions.changeSpeed(1));
    bindClick('speed-minus', () => ROV.actions.changeSpeed(-1));

    const setupHoldBtn = (id) => {
        const b = document.getElementById(id); if (!b) return;
        b.classList.add('ui-clickable');

        const start = (e) => {
            if (e.cancelable) e.preventDefault();
            ROV.state.activeAction = id;
        };

        b.addEventListener('touchstart', start, { passive: false });
        b.addEventListener('mousedown', start);
    };

    ['move-up', 'move-down', 'move-left', 'move-right', 'ascend', 'descend', 'zoom-in', 'zoom-out'].forEach(setupHoldBtn);

    const clear = () => { ROV.state.activeAction = null; };
    window.addEventListener('touchend', clear);
    window.addEventListener('mouseup', clear);
})();


// --- 3. ROTACIÓN (Touch & Mouse Look) ---
function initRotationControls() {
    const zone = document.body;

    // Estado compartido para el arrastre
    const dragData = {
        active: false,
        lastX: 0,
        lastY: 0,
        isTouch: false
    };

    const applyRotation = (deltaX, deltaY, isTouch) => {
        if (ROV.state.isLogbookOpen) return;
        const sensitivity = isTouch ? ROV.config.touchSensitivity : ROV.config.mouseSensitivity;

        // Rotación Horizontal (Yaw)
        if (Math.abs(deltaX) > Math.abs(deltaY) * 0.65) {
            if (Math.abs(deltaX) > 0.5) {
                ROV.actions.look(-deltaX * sensitivity, 0);
            }
        }
        // Rotación Vertical (Pitch)
        else {
            if (Math.abs(deltaY) > 0.5) {
                ROV.actions.look(0, -deltaY * sensitivity);
            }
        }
    };

    // --- MOUSE EVENTS ---
    zone.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Solo click izquierdo
        if (e.target.closest('.ui-clickable') || e.target.tagName === 'BUTTON' || e.target.closest('#btn-scan')) return;

        dragData.active = true;
        dragData.lastX = e.clientX;
        dragData.lastY = e.clientY;
        dragData.isTouch = false;
    });

    window.addEventListener('mousemove', (e) => {
        if (!dragData.active || dragData.isTouch) return;

        const deltaX = e.clientX - dragData.lastX;
        const deltaY = e.clientY - dragData.lastY;

        dragData.lastX = e.clientX;
        dragData.lastY = e.clientY;

        applyRotation(deltaX, deltaY, false);
    });

    window.addEventListener('mouseup', () => {
        dragData.active = false;
    });

    // --- TOUCH EVENTS ---
    zone.addEventListener('touchstart', (e) => {
        if (e.target.closest('.ui-clickable') || e.target.tagName === 'BUTTON' || e.target.closest('#btn-scan')) return;

        const touch = e.touches[0];
        dragData.active = true;
        dragData.lastX = touch.clientX;
        dragData.lastY = touch.clientY;
        dragData.isTouch = true;
    }, { passive: false });

    zone.addEventListener('touchmove', (e) => {
        if (!dragData.active || !dragData.isTouch) return;
        if (e.cancelable) e.preventDefault();

        const touch = e.touches[0];
        const deltaX = touch.clientX - dragData.lastX;
        const deltaY = touch.clientY - dragData.lastY;

        dragData.lastX = touch.clientX;
        dragData.lastY = touch.clientY;

        applyRotation(deltaX, deltaY, true);
    }, { passive: false });

    zone.addEventListener('touchend', () => {
        dragData.active = false;
    });
}
