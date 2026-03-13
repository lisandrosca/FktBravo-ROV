// rov-actions.js
// Centraliza las acciones discretas (On/Off, Toggles, Resets)

ROV.actions = {
    cycleHUD: function () {
        ROV.state.hudMode = (ROV.state.hudMode + 1) % 3;

        // Ocultar todo primero
        if (ROV.refs.hidableElements) {
            ROV.refs.hidableElements.forEach(el => el.classList.add('ui-hidden'));
        }

        // Mostrar según el modo
        if (ROV.state.hudMode === 0) {
            // Modo 0: Todo visible
            ROV.refs.hidableElements.forEach(el => el.classList.remove('ui-hidden'));
        }
        else if (ROV.state.hudMode === 1) {
            // Modo 1: Solo Datos
            if (ROV.refs.telemetryBlock) ROV.refs.telemetryBlock.classList.remove('ui-hidden');
            if (ROV.refs.dateBlock) ROV.refs.dateBlock.classList.remove('ui-hidden');
            if (ROV.refs.hudToggle) ROV.refs.hudToggle.classList.remove('ui-hidden');
        }
        // Modo 2: Nada (Cinemático)
        if (ROV.refs.hudToggle) ROV.refs.hudToggle.classList.remove('ui-hidden');
    },

    resetPosition: function () {
        if (!ROV.refs.rig) return;

        // Usar la posición definida en el JSON (cargada en loader.js) o un default seguro
        const startPos = (ROV.config && ROV.config.startPosition) ? ROV.config.startPosition : { x: 0, y: 1.6, z: 0 };
        const startRot = (ROV.config && ROV.config.startRotation) ? ROV.config.startRotation : { x: 0, y: 0, z: 0 };

        ROV.refs.rig.setAttribute('position', startPos);
        ROV.refs.rig.setAttribute('rotation', startRot);

        if (ROV.refs.pivot) ROV.refs.pivot.setAttribute('rotation', "0 0 0");
        if (ROV.refs.cam) ROV.refs.cam.setAttribute('rotation', "0 0 0");

        console.log("ROV Reset to:", startPos);
    },

    toggleFullscreen: function () {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => console.log(err));
        } else {
            document.exitFullscreen();
        }
    },

    changeSpeed: function (direction) {
        // direction: 1 (subir), -1 (bajar)
        const levels = ROV.config.speedLevels;
        let idx = ROV.state.currentLevelIndex;

        if (direction > 0 && idx < levels.length - 1) idx++;
        if (direction < 0 && idx > 0) idx--;

        ROV.state.currentLevelIndex = idx;
        ROV.physics.updateSpeedUI();
    },

    // --- ACCIÓN CONTEXTUAL: SCAN ---
    scanWaypoint: function () {
        const wpId = ROV.state.activeWaypoint;

        if (wpId) {
            // 1. Recuperar DATOS COMPLETOS desde la memoria de Waypoints
            let fullData = null;
            if (ROV.waypoints && ROV.waypoints.getDataById) {
                fullData = ROV.waypoints.getDataById(wpId);
            }

            // 2. Abrir Modal con datos (o fallback si falla)
            if (ROV.modal) {
                ROV.modal.open(fullData || { title: "UNKNOWN DATA", content: {} });
            }

            // 3. Gamification: Marcar como visitado
            if (ROV.waypoints && ROV.waypoints.markAsVisited) {
                ROV.waypoints.markAsVisited(wpId);
            }

            // 4. Feedback Visual: Parpadeo del botón
            const btn = document.getElementById('btn-scan');
            if (btn) {
                // Flash blanco momentáneo
                btn.style.backgroundColor = "#FFFFFF";
                btn.style.color = "#000";

                setTimeout(() => {
                    btn.style.backgroundColor = ""; // Volver al CSS (rgba)
                    btn.style.color = "#FFFFFF";
                }, 150);
            }

            // 4. Explore Button Success Animation
            const exploreLabel = document.querySelector('.grid-header-explore div[data-i18n="ui.explore"]');
            if (exploreLabel) {
                exploreLabel.classList.add('explore-success');
                setTimeout(() => exploreLabel.classList.remove('explore-success'), 600);
            }
        }
    },

    // --- CENTRALIZED ROTATION ---
    look: function (yawDelta, pitchDelta) {
        if (ROV.state.isLogbookOpen) return;

        const { rig, pivot } = ROV.refs;
        if (!rig || !pivot) return;

        // Yaw (Horizontal) - Rotamos el RIG por el eje Y
        if (yawDelta !== 0) {
            const currentYaw = (rig.getAttribute('rotation') || { y: 0 }).y;
            rig.setAttribute('rotation', { x: 0, y: currentYaw + yawDelta, z: 0 });
        }

        // Pitch (Vertical) - Rotamos el PIVOT por el eje X
        if (pitchDelta !== 0) {
            const currentPitch = (pivot.getAttribute('rotation') || { x: 0 }).x;
            let newPitch = currentPitch + pitchDelta;
            // Limitamos a 80 grados arriba/abajo para evitar vuelcos
            newPitch = Math.max(-80, Math.min(80, newPitch));
            pivot.setAttribute('rotation', { x: newPitch, y: 0, z: 0 });
        }
    }
};
