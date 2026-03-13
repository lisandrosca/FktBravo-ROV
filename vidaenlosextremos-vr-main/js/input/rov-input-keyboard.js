// rov-input-keyboard.js

console.log("SYSTEM: Keyboard Module Loaded");

const keyState = {};

window.addEventListener('keydown', (e) => {
    keyState[e.code] = true;

    if (!e.repeat) {
        if (e.code === 'Escape') {
            if (ROV.state.isLogbookOpen) {
                ROV.modal.close();
                return;
            }
            if (ROV.state.isControlsOpen) {
                ROV.controlsUI.toggle(false);
                return;
            }
            if (ROV.state.isMenuOpen) {
                ROV.controlsUI.toggleMenu(false);
                return;
            }
            ROV.controlsUI.toggleMenu(true);
            return;
        }

        // 2. BLOQUEO: Si el modal está abierto, IGNORAR resto de teclas
        if (ROV.state.isLogbookOpen) return;

        // 3. ACCIONES NORMALES (Solo si el modal está cerrado)
        switch (e.code) {
            case 'Enter': ROV.actions.scanWaypoint(); break;
            case 'KeyH': ROV.actions.cycleHUD(); break;
            case 'KeyR': ROV.actions.resetPosition(); break;
            case 'Digit1': ROV.actions.changeSpeed(-1); break;
            case 'Digit2': ROV.actions.changeSpeed(1); break;
        }
    }
});

window.addEventListener('keyup', (e) => {
    keyState[e.code] = false;
});

ROV.updateKeyboard = function () {
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
    if (keyState['Space']) heave = 1; // Subir
    if (keyState['ShiftLeft'] || keyState['ShiftRight']) heave = -1; // Bajar (Shift)

    // 5. ZOOM (NUEVO: E / Q)
    let fov = ROV.refs.cam.getAttribute('camera').fov;
    if (keyState['KeyE']) fov = Math.max(5, fov - 1); // Zoom In
    if (keyState['KeyQ']) fov = Math.min(140, fov + 1); // Zoom Out
    if (fov !== ROV.refs.cam.getAttribute('camera').fov) {
        ROV.refs.cam.setAttribute('camera', 'fov', fov);
    }

    if (surge !== 0 || sway !== 0 || heave !== 0) {
        ROV.physics.applyMove(surge, sway, heave, false);
    }

    // 6. ROTACIÓN DE CÁMARA
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
        ROV.actions.look(rotYaw * camSpeed, rotPitch * camSpeed);
    }
};
