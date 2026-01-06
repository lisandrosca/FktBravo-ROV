// Actualizar el texto de velocidad en pantalla
function updateSpeedUI() {
    if (speedValText) {
        speedValText.innerText = speedLevels[currentLevelIndex].toFixed(1);
    }
}

function updateGamepad() {
    const gamepads = navigator.getGamepads();
    const gp = gamepads[0]; 
    if (!gp) return;

    const pos = rig.getAttribute('position');
    let fov = cam.getAttribute('camera').fov;
    
    const rigRot = rig.getAttribute('rotation') || {x:0, y:0, z:0};
    const camRot = cam.getAttribute('rotation') || {x:0, y:0, z:0};
    const totalAngle = (rigRot.y + camRot.y) * (Math.PI / 180);
    
    const currentSpeed = baseMoveSpeed * (fov/80) * speedLevels[currentLevelIndex] * 1.5;

    // --- MOVIMIENTO ---
    const lx = Math.abs(gp.axes[0]) > DEADZONE ? gp.axes[0] : 0; 
    const ly = Math.abs(gp.axes[1]) > DEADZONE ? -gp.axes[1] : 0; 

    pos.x += -ly * Math.sin(totalAngle) * currentSpeed;
    pos.z += -ly * Math.cos(totalAngle) * currentSpeed;
    pos.x += lx * Math.cos(totalAngle) * currentSpeed;
    pos.z += -lx * Math.sin(totalAngle) * currentSpeed;

    // --- ROTACIÓN ---
    const rx = Math.abs(gp.axes[2]) > DEADZONE ? gp.axes[2] : 0;
    if (rx !== 0) {
        rigRot.y -= rx * 2.5; 
        rig.setAttribute('rotation', rigRot);
    }

    // --- ASCENSO / DESCENSO ---
    if (gp.buttons[7].pressed) pos.y -= currentSpeed * 0.8; 
    if (gp.buttons[6].pressed) pos.y += currentSpeed * 0.8; 

    // --- ZOOM ---
    if (gp.buttons[5].pressed || gp.buttons[12].pressed) fov = Math.max(5, fov - 1);
    if (gp.buttons[4].pressed || gp.buttons[13].pressed) fov = Math.min(140, fov + 1);

    // --- VELOCIDAD (D-PAD) ---
    if (gp.buttons[15].pressed && !debounce.speed) {
        if (currentLevelIndex < speedLevels.length - 1) {
            currentLevelIndex++;
            updateSpeedUI();
        }
        debounce.speed = true; setTimeout(() => debounce.speed = false, 200);
    }
    if (gp.buttons[14].pressed && !debounce.speed) {
        if (currentLevelIndex > 0) {
            currentLevelIndex--;
            updateSpeedUI();
        }
        debounce.speed = true; setTimeout(() => debounce.speed = false, 200);
    }

    // --- BOTONES ---
    if (gp.buttons[3].pressed && !debounce.light) { 
        lightToggle.click();
        debounce.light = true; setTimeout(() => debounce.light = false, 400);
    }
    if (gp.buttons[1].pressed && !debounce.menu) { 
        window.location.href = '../index.html'; // Ruta corregida a relativa
        debounce.menu = true;
    }
    if (gp.buttons[0].pressed && !debounce.hud) { 
        hudToggle.click();
        debounce.hud = true; setTimeout(() => debounce.hud = false, 400);
    }
    if (gp.buttons[2].pressed && !debounce.reset) { 
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
    if (currentLevelIndex < speedLevels.length-1) {
        currentLevelIndex++; 
        updateSpeedUI();
    }
};

document.getElementById('speed-minus').onclick = () => { 
    if (currentLevelIndex > 0) {
        currentLevelIndex--; 
        updateSpeedUI();
    }
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

// Lógica de 3 modos para el HUD
hudToggle.addEventListener('click', () => {
    hudMode = (hudMode + 1) % 3; 

    // Primero ocultamos todo lo que tenga la clase 'hidable'
    hidableElements.forEach(el => el.classList.add('ui-hidden'));

    if (hudMode === 0) {
        // MODO 0: MOSTRAR TODO
        hidableElements.forEach(el => el.classList.remove('ui-hidden'));
    } 
    else if (hudMode === 1) {
        // MODO 1: SOLO TELEMETRÍA Y FECHA
        if (telemetryBlock) telemetryBlock.classList.remove('ui-hidden');
        if (dateBlock) dateBlock.classList.remove('ui-hidden');
    }
    // MODO 2: No se hace nada, permanece todo oculto (el botón HUD nunca tiene 'hidable')
});
