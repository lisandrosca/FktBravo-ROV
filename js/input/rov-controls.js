// rov-controls.js

// --- 1. GAMEPAD INPUT ---
function updateGamepad() {
    const gamepads = navigator.getGamepads();
    const gp = gamepads[0]; 
    if (!gp) return;

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

    // A. MOVIMIENTO
    const lx = Math.abs(gp.axes[0]) > 0.1 ? gp.axes[0] : 0; 
    const ly = Math.abs(gp.axes[1]) > 0.1 ? -gp.axes[1] : 0; 
    
    let heave = 0; 
    if (gp.buttons[6].pressed) heave = -1; // L2
    if (gp.buttons[7].pressed) heave = 1;  // R2

    if (lx !== 0 || ly !== 0 || heave !== 0) {
        ROV.physics.applyMove(ly, lx, heave, true);
    }

    // B. ROTACIÓN
    handleGamepadRotation(gp);

    // C. ACCIONES DISCRETAS
    const db = state.debounce;

    let fov = ROV.refs.cam.getAttribute('camera').fov;
    if (gp.buttons[5].pressed) fov = Math.max(5, fov - 1); // R1
    if (gp.buttons[4].pressed) fov = Math.min(140, fov + 1); // L1
    if (fov !== ROV.refs.cam.getAttribute('camera').fov) {
        ROV.refs.cam.setAttribute('camera', 'fov', fov);
    }

    // --- BOTÓN CONTEXTUAL (A/X) ---
    if (gp.buttons[0].pressed && !db.action) { 
        if (ROV.state.activeWaypoint) {
            ROV.actions.scanWaypoint();
        } else {
            ROV.actions.cycleHUD();
        }
        triggerDebounce('action');
    }

    if (gp.buttons[15].pressed && !db.speed) { ROV.actions.changeSpeed(1); triggerDebounce('speed'); }
    if (gp.buttons[14].pressed && !db.speed) { ROV.actions.changeSpeed(-1); triggerDebounce('speed'); }
    if (gp.buttons[3].pressed && !db.light) { ROV.actions.toggleLights(); triggerDebounce('light'); }
    if (gp.buttons[2].pressed && !db.reset) { ROV.actions.resetPosition(); triggerDebounce('reset'); }
}

function handleGamepadRotation(gp) {
    const { rig, pivot } = ROV.refs;
    let rawRx = gp.axes[2]; 
    let rawRy = gp.axes[3]; 

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

    let currentRigY = (rig.getAttribute('rotation') || {y:0}).y;
    let currentPivotX = (pivot.getAttribute('rotation') || {x:0}).x;

    if (finalRx !== 0) {
        rig.setAttribute('rotation', {x: 0, y: currentRigY - (finalRx * 2.0), z: 0});
    }
    if (finalRy !== 0) {
        let newX = currentPivotX + (finalRy * 1.5);
        newX = Math.max(-80, Math.min(80, newX));
        pivot.setAttribute('rotation', {x: newX, y: 0, z: 0});
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
    bindClick('light-toggle', ROV.actions.toggleLights);
    bindClick('fullscreen-toggle', ROV.actions.toggleFullscreen);
    bindClick('reset-pos', ROV.actions.resetPosition);
    bindClick('speed-plus', () => ROV.actions.changeSpeed(1));
    bindClick('speed-minus', () => ROV.actions.changeSpeed(-1));

    const setupHoldBtn = (id) => {
        const b = document.getElementById(id); if(!b) return;
        b.classList.add('ui-clickable');
        
        const start = (e) => { 
            if(e.cancelable) e.preventDefault(); 
            ROV.state.activeAction = id; 
        };
        
        b.addEventListener('touchstart', start, {passive:false});
        b.addEventListener('mousedown', start);
    };

    ['move-up', 'move-down', 'move-left', 'move-right', 'ascend', 'descend', 'zoom-in', 'zoom-out'].forEach(setupHoldBtn);

    const clear = () => { ROV.state.activeAction = null; };
    window.addEventListener('touchend', clear);
    window.addEventListener('mouseup', clear);
})();


// --- 3. ROTACIÓN TÁCTIL (Touch Look) ---
function initTouchRotation() {
    const zone = document.body;

    zone.addEventListener('touchstart', (e) => {
        if(e.target.closest('.ui-clickable') || e.target.tagName === 'BUTTON') return;
        // Evitar conflicto con botón contextual
        if(e.target.closest('#btn-scan')) return; 

        const touch = e.touches[0];
        ROV.state.touchLook.dragging = true;
        ROV.state.touchLook.lastX = touch.clientX;
        ROV.state.touchLook.lastY = touch.clientY;
    }, {passive: false});

    zone.addEventListener('touchmove', (e) => {
        // Si el modal está abierto, no rotar cámara
        if (ROV.state.isLogbookOpen) return;

        if (!ROV.state.touchLook.dragging) return;
        if(e.cancelable) e.preventDefault(); 

        const touch = e.touches[0];
        const deltaX = touch.clientX - ROV.state.touchLook.lastX;
        const deltaY = touch.clientY - ROV.state.touchLook.lastY;

        ROV.state.touchLook.lastX = touch.clientX;
        ROV.state.touchLook.lastY = touch.clientY;

        const { rig, pivot } = ROV.refs;
        const sensitivity = ROV.config.touchSensitivity;
        
        if (Math.abs(deltaX) > Math.abs(deltaY) * 0.65) {
            if (Math.abs(deltaX) > 1) {
                const curY = rig.getAttribute('rotation').y;
                rig.setAttribute('rotation', {x: 0, y: curY - (deltaX * sensitivity), z: 0});
            }
        } else {
            if (Math.abs(deltaY) > 1) {
                const curX = pivot.getAttribute('rotation').x;
                let newX = Math.max(-80, Math.min(80, curX - (deltaY * sensitivity)));
                pivot.setAttribute('rotation', {x: newX, y: 0, z: 0});
            }
        }
    }, {passive: false});

    zone.addEventListener('touchend', () => { ROV.state.touchLook.dragging = false; });
}
