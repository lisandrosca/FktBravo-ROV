function updateGamepad() {
    const gamepads = navigator.getGamepads();
    const gp = gamepads[0]; 
    if (!gp) return;

    // Usamos las referencias globales
    const { rig, pivot, cam } = ROV.refs;
    const { state, config } = ROV;

    if (!rig || !pivot || !cam) return;

    // --- 1. LECTURA DE MOVIMIENTO (Stick Izquierdo + Gatillos) ---
    const lx = Math.abs(gp.axes[0]) > 0.1 ? gp.axes[0] : 0; 
    const ly = Math.abs(gp.axes[1]) > 0.1 ? -gp.axes[1] : 0; 
    
    let heave = 0; 
    if (gp.buttons[6].pressed) heave = -1; // Bajar
    if (gp.buttons[7].pressed) heave = 1;  // Subir

    // Física centralizada
    if (lx !== 0 || ly !== 0 || heave !== 0) {
        ROV.physics.applyMove(ly, lx, heave, true);
    }

    // --- 2. CÁMARA / ROTACIÓN (Stick Derecho) - CON BIAS HORIZONTAL ---
    let rawRx = gp.axes[2]; 
    let rawRy = gp.axes[3]; 

    // Deadzone
    if (Math.abs(rawRx) < config.deadzone) rawRx = 0;
    if (Math.abs(rawRy) < config.deadzone) rawRy = 0;

    // Lógica "Winner Takes All" con BIAS (Favoritismo)
    // El threshold es 40/60. Favorecemos horizontal.
    // Multiplicamos Vertical por 0.65. Significa que Vertical vale "menos" en la competencia.
    const verticalHandicap = 0.65; 

    let finalRx = 0;
    let finalRy = 0;

    if (rawRx !== 0 || rawRy !== 0) {
        // Comparación sesgada hacia Horizontal
        if (Math.abs(rawRx) >= Math.abs(rawRy) * verticalHandicap) {
            finalRx = rawRx; // Gana Horizontal (es más fácil ganar)
            finalRy = 0;
        } else {
            finalRx = 0;
            finalRy = rawRy; // Solo gana si es MUY vertical
        }
    }

    // --- APLICACIÓN SEGURA DE ROTACIÓN ---
    let currentRigY = (rig.getAttribute('rotation') || {x:0, y:0, z:0}).y;
    let currentPivotX = (pivot.getAttribute('rotation') || {x:0, y:0, z:0}).x;

    // 1. Horizontal (Gira todo el RIG en Y)
    if (finalRx !== 0) {
        // CAMBIO: Velocidad reducida de 2.5 a 2.0
        const newY = currentRigY - (finalRx * 2.0);
        rig.setAttribute('rotation', {x: 0, y: newY, z: 0});
    }

    // 2. Vertical (Gira solo el PIVOT en X)
    if (finalRy !== 0) {
        // CAMBIO: Velocidad reducida de 2.0 a 1.5
        let newX = currentPivotX + (finalRy * 1.5);
        newX = Math.max(-80, Math.min(80, newX));
        
        pivot.setAttribute('rotation', {x: newX, y: 0, z: 0});
    }

    // --- 3. OTROS CONTROLES ---
    let fov = cam.getAttribute('camera').fov;
    if (gp.buttons[5].pressed) fov = Math.max(5, fov - 1);
    if (gp.buttons[4].pressed) fov = Math.min(140, fov + 1);
    cam.setAttribute('camera', 'fov', fov);

    // Debounce y botones de sistema
    const db = state.debounce;
    
    // Velocidad D-PAD
    if (gp.buttons[15].pressed && !db.speed) {
        if (state.currentLevelIndex < config.speedLevels.length - 1) {
            state.currentLevelIndex++; ROV.physics.updateSpeedUI();
        }
        db.speed = true; setTimeout(() => db.speed = false, 200);
    }
    if (gp.buttons[14].pressed && !db.speed) {
        if (state.currentLevelIndex > 0) {
            state.currentLevelIndex--; ROV.physics.updateSpeedUI();
        }
        db.speed = true; setTimeout(() => db.speed = false, 200);
    }

    if (gp.buttons[3].pressed && !db.light) { 
        if(ROV.refs.lightToggle) ROV.refs.lightToggle.click();
        db.light = true; setTimeout(() => db.light = false, 400);
    }
    if (gp.buttons[0].pressed && !db.hud) { 
        if(ROV.refs.hudToggle) ROV.refs.hudToggle.click();
        db.hud = true; setTimeout(() => db.hud = false, 400);
    }
    if (gp.buttons[2].pressed && !db.reset) { 
        if(ROV.refs.resetBtn) ROV.refs.resetBtn.click();
        db.reset = true; setTimeout(() => db.reset = false, 400);
    }
}


// --- LÓGICA DE ROTACIÓN TÁCTIL PERSONALIZADA ---

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

        const { rig, pivot } = ROV.refs;
        const sensitivity = ROV.config.touchSensitivity;

        // Leemos valores actuales de forma segura
        let currentRigY = (rig.getAttribute('rotation') || {x:0, y:0, z:0}).y;
        let currentPivotX = (pivot.getAttribute('rotation') || {x:0, y:0, z:0}).x;

        // --- Winner Takes All Touch con BIAS Horizontal ---
        // Usamos el mismo handicap de 0.65 para favorecer horizontal
        const verticalHandicap = 0.65;

        if (Math.abs(deltaX) > Math.abs(deltaY) * verticalHandicap) {
            // Horizontal (Más fácil de activar)
            if (Math.abs(deltaX) > 1) {
                let newY = currentRigY - (deltaX * sensitivity);
                rig.setAttribute('rotation', {x: 0, y: newY, z: 0});
            }
        } else {
            // Vertical (Más difícil de activar)
            if (Math.abs(deltaY) > 1) {
                let newX = currentPivotX - (deltaY * sensitivity);
                newX = Math.max(-80, Math.min(80, newX));
                pivot.setAttribute('rotation', {x: newX, y: 0, z: 0});
            }
        }
    }, {passive: false});

    zone.addEventListener('touchend', () => {
        ROV.state.touchLook.dragging = false;
    });
}


// --- CONFIGURACIÓN DE EVENTOS UI ---

const setupBtn = (id) => {
    const b = document.getElementById(id); if(!b) return;
    b.classList.add('ui-clickable');
    b.addEventListener('touchstart', (e) => { e.preventDefault(); ROV.state.activeAction = id; });
    b.addEventListener('mousedown', (e) => { e.preventDefault(); ROV.state.activeAction = id; });
};

['move-up', 'move-down', 'move-left', 'move-right', 'ascend', 'descend', 'zoom-in', 'zoom-out'].forEach(setupBtn);

window.addEventListener('touchend', () => { ROV.state.activeAction = null; });
window.addEventListener('mouseup', () => { ROV.state.activeAction = null; });

if (ROV.refs.fsToggle) {
    ROV.refs.fsToggle.classList.add('ui-clickable');
    ROV.refs.fsToggle.onclick = () => { 
        if (!document.fullscreenElement) document.documentElement.requestFullscreen(); 
        else document.exitFullscreen(); 
    };
}

const addClickable = (id) => {
    const el = document.getElementById(id);
    if(el) el.classList.add('ui-clickable');
    return el;
}

const speedPlus = addClickable('speed-plus');
if (speedPlus) {
    speedPlus.onclick = () => { 
        if (ROV.state.currentLevelIndex < ROV.config.speedLevels.length-1) {
            ROV.state.currentLevelIndex++; 
            ROV.physics.updateSpeedUI();
        }
    };
}

const speedMinus = addClickable('speed-minus');
if (speedMinus) {
    speedMinus.onclick = () => { 
        if (ROV.state.currentLevelIndex > 0) {
            ROV.state.currentLevelIndex--; 
            ROV.physics.updateSpeedUI();
        }
    };
}

if (ROV.refs.resetBtn) {
    ROV.refs.resetBtn.classList.add('ui-clickable');
    ROV.refs.resetBtn.onclick = () => { 
        // CAMBIO: Usamos la variable global en lugar de texto fijo
        ROV.refs.rig.setAttribute('position', ROV.config.startingPosition); 
        
        // Reseteamos rotaciones a 0
        ROV.refs.rig.setAttribute('rotation', "0 0 0"); 
        ROV.refs.pivot.setAttribute('rotation', "0 0 0"); 
        ROV.refs.cam.setAttribute('rotation', "0 0 0"); 
    };
}


if (ROV.refs.lightToggle) {
    ROV.refs.lightToggle.classList.add('ui-clickable');
    ROV.refs.lightToggle.addEventListener('click', () => {
        ROV.state.lightsOn = !ROV.state.lightsOn;
        ROV.refs.rovSpot.setAttribute('light', 'intensity', ROV.state.lightsOn ? 2.5 : 0);
        ROV.refs.rovPoint.setAttribute('light', 'intensity', ROV.state.lightsOn ? 0.8 : 0);
        ROV.refs.lightToggle.style.color = ROV.state.lightsOn ? "#fff" : "#ff4444";
    });
}

if (ROV.refs.hudToggle) {
    ROV.refs.hudToggle.classList.add('ui-clickable');
    ROV.refs.hudToggle.addEventListener('click', () => {
        ROV.state.hudMode = (ROV.state.hudMode + 1) % 3; 
        ROV.refs.hidableElements.forEach(el => el.classList.add('ui-hidden'));
        if (ROV.state.hudMode === 0) {
            ROV.refs.hidableElements.forEach(el => el.classList.remove('ui-hidden'));
        } 
        else if (ROV.state.hudMode === 1) {
            if (ROV.refs.telemetryBlock) ROV.refs.telemetryBlock.classList.remove('ui-hidden');
            if (ROV.refs.dateBlock) ROV.refs.dateBlock.classList.remove('ui-hidden');
        }
    });
}
