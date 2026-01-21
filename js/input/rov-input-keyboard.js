// rov-input-keyboard.js

console.log("SYSTEM: Keyboard Module Loaded"); 

const keyState = {};

window.addEventListener('keydown', (e) => {
    keyState[e.code] = true;
    
    if (!e.repeat) {
        // 1. PRIORIDAD: Si el modal está abierto, ESC lo cierra.
        if (ROV.state.isLogbookOpen && e.code === 'Escape') {
            ROV.modal.close();
            return; // Cortamos aquí.
        }

        // 2. BLOQUEO: Si el modal está abierto, IGNORAR resto de teclas
        if (ROV.state.isLogbookOpen) return; 

        // 3. ACCIONES NORMALES (Solo si el modal está cerrado)
        switch(e.code) {
            case 'Enter': ROV.actions.scanWaypoint(); break;
            case 'KeyL': ROV.actions.toggleLights(); break;
            case 'KeyH': ROV.actions.cycleHUD(); break;
            case 'KeyR': ROV.actions.resetPosition(); break;
            case 'KeyF': ROV.actions.toggleFullscreen(); break;
            case 'Digit1': ROV.actions.changeSpeed(-1); break;
            case 'Digit2': ROV.actions.changeSpeed(1); break;
        }
    }
});

window.addEventListener('keyup', (e) => {
    keyState[e.code] = false;
});

ROV.updateKeyboard = function() {
    // 1. Bloqueo si el usuario escribe en un input
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;

    // 2. BLOQUEO: Si el modal está abierto, detenemos toda física
    if (ROV.state.isLogbookOpen) {
        return; 
    }

    // 3. MOVIMIENTO HORIZONTAL
    let surge = 0; 
    let sway = 0;  

    if (keyState['KeyW']) surge = 1;
    if (keyState['KeyS']) surge = -1;
    if (keyState['KeyA']) sway = -1;
    if (keyState['KeyD']) sway = 1;

    // 4. MOVIMIENTO VERTICAL
    let heave = 0;
    if (keyState['Space'] || keyState['KeyE']) heave = 1;
    if (keyState['ShiftLeft'] || keyState['ShiftRight'] || keyState['KeyQ']) heave = -1;

    if (surge !== 0 || sway !== 0 || heave !== 0) {
        ROV.physics.applyMove(surge, sway, heave, false);
    }

    // 5. ROTACIÓN DE CÁMARA
    const { rig, pivot } = ROV.refs;
    if (!rig || !pivot) return;

    let rotYaw = 0;   
    let rotPitch = 0; 
    const camSpeed = 1.5; 

    if (keyState['ArrowLeft']) rotYaw = 1;
    if (keyState['ArrowRight']) rotYaw = -1;
    if (keyState['ArrowUp']) rotPitch = 1;
    if (keyState['ArrowDown']) rotPitch = -1;

    if (rotYaw !== 0 || rotPitch !== 0) {
        const currentRigY = rig.getAttribute('rotation').y;
        rig.setAttribute('rotation', {x: 0, y: currentRigY + rotYaw * camSpeed, z: 0});

        const currentPivotX = pivot.getAttribute('rotation').x;
        let newX = currentPivotX + rotPitch * camSpeed;
        newX = Math.max(-80, Math.min(80, newX));
        pivot.setAttribute('rotation', {x: newX, y: 0, z: 0});
    }
};
