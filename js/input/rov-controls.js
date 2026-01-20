// rov-controls.js
// Capa de Input: Escucha Gamepad y Touch, y llama a Actions o Physics.

// --- 1. GAMEPAD INPUT ---
function updateGamepad() {
    const gamepads = navigator.getGamepads();
    const gp = gamepads[0]; 
    if (!gp) return;

    const { state, config } = ROV;

    // A. MOVIMIENTO (Llamada a Physics)
    const lx = Math.abs(gp.axes[0]) > 0.1 ? gp.axes[0] : 0; 
    const ly = Math.abs(gp.axes[1]) > 0.1 ? -gp.axes[1] : 0; 
    
    let heave = 0; 
    if (gp.buttons[6].pressed) heave = -1; // Gatillo L2
    if (gp.buttons[7].pressed) heave = 1;  // Gatillo R2

    if (lx !== 0 || ly !== 0 || heave !== 0) {
        ROV.physics.applyMove(ly, lx, heave, true);
    }

    // B. ROTACIÓN (Lógica local de Input -> DOM, mantenemos bias aquí por ser específico de control)
    handleGamepadRotation(gp);

    // C. ACCIONES DISCRETAS (Llamada a Actions)
    const db = state.debounce;

    // Zoom (Se mantiene aquí porque es continuo mientras aprietas)
    let fov = ROV.refs.cam.getAttribute('camera').fov;
    if (gp.buttons[5].pressed) fov = Math.max(5, fov - 1); // R1
    if (gp.buttons[4].pressed) fov = Math.min(140, fov + 1); // L1
    if (fov !== ROV.refs.cam.getAttribute('camera').fov) {
        ROV.refs.cam.setAttribute('camera', 'fov', fov);
    }

    // Botones con Debounce (Solo un clic por pulsación)
    if (gp.buttons[15].pressed && !db.speed) { // D-Pad Right
        ROV.actions.changeSpeed(1);
        triggerDebounce('speed');
    }
    if (gp.buttons[14].pressed && !db.speed) { // D-Pad Left
        ROV.actions.changeSpeed(-1);
        triggerDebounce('speed');
    }
    if (gp.buttons[3].pressed && !db.light) { // Triángulo / Y
        ROV.actions.toggleLights();
        triggerDebounce('light');
    }
    if (gp.buttons[0].pressed && !db.hud) { // Cruz / A (o XBox A)
        ROV.actions.cycleHUD();
        triggerDebounce('hud');
    }
    if (gp.buttons[2].pressed && !db.reset) { // Cuadrado / X
        ROV.actions.resetPosition();
        triggerDebounce('reset');
    }
}

// Helper para limpiar rotación del gamepad (Winner Takes All)
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
    setTimeout(() => ROV.state.debounce[key] = false, 300); // 300ms de espera
}


// --- 2. TOUCH & UI INPUT ---
// Inicializa listeners al cargar la página
(function initUIControls() {
    
    // Asignar acciones a botones UI
    const bindClick = (id, actionFn) => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('ui-clickable');
            el.onclick = actionFn;
        }
    };

    // Botones de Sistema (Llaman a ROV.actions)
    bindClick('hud-toggle', ROV.actions.cycleHUD);
    bindClick('light-toggle', ROV.actions.toggleLights);
    bindClick('fullscreen-toggle', ROV.actions.toggleFullscreen);
    bindClick('reset-pos', ROV.actions.resetPosition);
    bindClick('speed-plus', () => ROV.actions.changeSpeed(1));
    bindClick('speed-minus', () => ROV.actions.changeSpeed(-1));

    // Botones de Movimiento Continuo (Hold)
    // Estos setean el estado 'activeAction' que el Main Loop lee
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

    // Limpiar estado al soltar
    const clear = () => { ROV.state.activeAction = null; };
    window.addEventListener('touchend', clear);
    window.addEventListener('mouseup', clear);

})();


// --- 3. ROTACIÓN TÁCTIL (Touch Look) ---
function initTouchRotation() {
    const zone = document.body;

    zone.addEventListener('touchstart', (e) => {
        if(e.target.closest('.ui-clickable') || e.target.tagName === 'BUTTON') return;
        const touch = e.touches[0];
        ROV.state.touchLook.dragging = true;
        ROV.state.touchLook.lastX = touch.clientX;
        ROV.state.touchLook.lastY = touch.clientY;
    }, {passive: false});

    zone.addEventListener('touchmove', (e) => {
        if (!ROV.state.touchLook.dragging) return;
        if(e.cancelable) e.preventDefault(); 

        const touch = e.touches[0];
        const deltaX = touch.clientX - ROV.state.touchLook.lastX;
        const deltaY = touch.clientY - ROV.state.touchLook.lastY;

        ROV.state.touchLook.lastX = touch.clientX;
        ROV.state.touchLook.lastY = touch.clientY;

        // Lógica Winner Takes All simplificada
        const { rig, pivot } = ROV.refs;
        const sensitivity = ROV.config.touchSensitivity;
        
        // Bias Horizontal
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



























