function updateGamepad() {
    const gamepads = navigator.getGamepads();
    const gp = gamepads[0]; 
    if (!gp) return;

    const pos = rig.getAttribute('position');
    let fov = cam.getAttribute('camera').fov;
    
    // 1. OBTENER ROTACIÓN TOTAL (Heading)
    // Sumamos la rotación del rig y de la cámara para que el frente siempre sea tu vista
    const rigRot = rig.getAttribute('rotation') || {x:0, y:0, z:0};
    const camRot = cam.getAttribute('rotation') || {x:0, y:0, z:0};
    const totalAngle = (rigRot.y + camRot.y) * (Math.PI / 180);
    
    const currentSpeed = baseMoveSpeed * (fov/80) * speedLevels[currentLevelIndex] * 1.5;

    // --- MOVIMIENTO (Stick Izquierdo) ---
    // Invertimos gp.axes[1] para que arriba sea positivo (adelante)
    const lx = Math.abs(gp.axes[0]) > DEADZONE ? gp.axes[0] : 0; 
    const ly = Math.abs(gp.axes[1]) > DEADZONE ? -gp.axes[1] : 0; 

    // Trigonometría corregida para A-Frame (Forward es -Z)
    // Movimiento adelante/atrás
    pos.x += -ly * Math.sin(totalAngle) * currentSpeed;
    pos.z += -ly * Math.cos(totalAngle) * currentSpeed;
    // Movimiento lateral (Strafe)
    pos.x += lx * Math.cos(totalAngle) * currentSpeed;
    pos.z += -lx * Math.sin(totalAngle) * currentSpeed;

    // --- ROTACIÓN / HEADING (Stick Derecho) ---
    const rx = Math.abs(gp.axes[2]) > DEADZONE ? gp.axes[2] : 0;
    if (rx !== 0) {
        rigRot.y -= rx * 2.5; 
        rig.setAttribute('rotation', rigRot);
    }

    // --- ASCENSO / DESCENSO (Gatillos) ---
    if (gp.buttons[7].pressed) pos.y -= currentSpeed * 0.8; // R2: Bajar
    if (gp.buttons[6].pressed) pos.y += currentSpeed * 0.8; // L2: Subir

    // --- ZOOM (L1/R1 y D-PAD Arriba/Abajo) ---
    // R1 (5) o D-Pad Arriba (12) -> Zoom In
    if (gp.buttons[5].pressed || gp.buttons[12].pressed) fov = Math.max(5, fov - 1);
    // L1 (4) o D-Pad Abajo (13) -> Zoom Out
    if (gp.buttons[4].pressed || gp.buttons[13].pressed) fov = Math.min(140, fov + 1);

    // --- VELOCIDAD (D-PAD Izquierda/Derecha) ---
    if (gp.buttons[15].pressed && !debounce.speed) {
        if (currentLevelIndex < speedLevels.length - 1) currentLevelIndex++;
        debounce.speed = true; setTimeout(() => debounce.speed = false, 200);
    }
    if (gp.buttons[14].pressed && !debounce.speed) {
        if (currentLevelIndex > 0) currentLevelIndex--;
        debounce.speed = true; setTimeout(() => debounce.speed = false, 200);
    }

    // --- BOTONES DE FIGURAS ---
    if (gp.buttons[3].pressed && !debounce.light) { // Triángulo
        lightToggle.click();
        debounce.light = true; setTimeout(() => debounce.light = false, 400);
    }
    if (gp.buttons[1].pressed && !debounce.menu) { // Círculo
        window.location.href = '/./index.html';
        debounce.menu = true;
    }
    if (gp.buttons[0].pressed && !debounce.hud) { // Cruz
        hudToggle.click();
        debounce.hud = true; setTimeout(() => debounce.hud = false, 400);
    }
    if (gp.buttons[2].pressed && !debounce.reset) { // Cuadrado
        resetBtn.click();
        debounce.reset = true; setTimeout(() => debounce.reset = false, 400);
    }

    rig.setAttribute('position', pos);
    cam.setAttribute('camera', 'fov', fov);
}

// --- CONFIGURACIÓN DE EVENTOS Y UI ---

const setupBtn = (id) => {
    const b = document.getElementById(id); if(!b) return;
    b.addEventListener('touchstart', (e) => { e.preventDefault(); activeAction = id; });
    window.addEventListener('touchend', () => { activeAction = null; });
};

['move-up', 'move-down', 'move-left', 'move-right', 'ascend', 'descend', 'zoom-in', 'zoom-out'].forEach(setupBtn);

fsToggle.onclick = () => { 
    if (!document.fullscreenElement) document.documentElement.requestFullscreen(); 
    else document.exitFullscreen(); 
};

document.getElementById('speed-plus').onclick = () => { 
    if (currentLevelIndex < speedLevels.length-1) currentLevelIndex++; 
};

document.getElementById('speed-minus').onclick = () => { 
    if (currentLevelIndex > 0) currentLevelIndex--; 
};

resetBtn.onclick = () => { 
    rig.setAttribute('position', "0 1.6 0"); 
    rig.setAttribute('rotation', "0 0 0"); 
    cam.setAttribute('rotation', "0 0 0"); 
};

lightToggle.addEventListener('click', () => {
    lightsOn = !lightsOn;
    rovSpot.setAttribute('light', 'intensity', lightsOn ? 2.5 : 0);
    rovPoint.setAttribute('light', 'intensity', lightsOn ? 0.8 : 0);
    lightToggle.style.color = lightsOn ? "#fff" : "#ff4444";
});

hudToggle.addEventListener('click', () => {
    isHudVisible = !isHudVisible;
    hidableElements.forEach(el => el.classList.toggle('ui-hidden', !isHudVisible));
});
