// rov-input-keyboard.js
// Manejo de teclado: WASD + Flechas + Acciones + Dual Heave

console.log("SYSTEM: Keyboard Module Loaded"); // Debug para confirmar carga

const keyState = {};

// Listeners globales
window.addEventListener('keydown', (e) => {
    keyState[e.code] = true;
    
    // Debug rápido: Si presionas 'L', debería salir esto en consola
    if(e.code === 'KeyL') console.log("Key L pressed - Toggle Lights");

    // Acciones Discretas
    if (!e.repeat) {
        switch(e.code) {
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

// AHORA: Anclamos la función a ROV para asegurarnos que main.js la encuentre
ROV.updateKeyboard = function() {
    // Si el usuario está escribiendo en un input, no movemos el ROV
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;

    // 1. MOVIMIENTO HORIZONTAL (WASD)
    let surge = 0; // W/S
    let sway = 0;  // A/D

    if (keyState['KeyW']) surge = 1;
    if (keyState['KeyS']) surge = -1;
    if (keyState['KeyA']) sway = -1;
    if (keyState['KeyD']) sway = 1;

    // 2. MOVIMIENTO VERTICAL (Dual Support)
    let heave = 0;
    if (keyState['Space'] || keyState['KeyE']) heave = 1;
    if (keyState['ShiftLeft'] || keyState['ShiftRight'] || keyState['KeyQ']) heave = -1;

    // Aplicar física
    if (surge !== 0 || sway !== 0 || heave !== 0) {
        ROV.physics.applyMove(surge, sway, heave, false);
    }

    // 3. ROTACIÓN DE CÁMARA (Flechas)
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
