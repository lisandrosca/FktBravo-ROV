// rov-actions.js
// Centraliza las acciones discretas (On/Off, Toggles, Resets)

ROV.actions = {
    toggleLights: function() {
        ROV.state.lightsOn = !ROV.state.lightsOn;
        
        // Actualizar DOM
        if (ROV.refs.rovSpot) ROV.refs.rovSpot.setAttribute('light', 'intensity', ROV.state.lightsOn ? 2.5 : 0);
        if (ROV.refs.rovPoint) ROV.refs.rovPoint.setAttribute('light', 'intensity', ROV.state.lightsOn ? 0.8 : 0);
        
        // Feedback visual en botón UI
        if (ROV.refs.lightToggle) {
            ROV.refs.lightToggle.style.color = ROV.state.lightsOn ? "#fff" : "#ff4444";
        }
    },

    cycleHUD: function() {
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

    resetPosition: function() {
        if (!ROV.refs.rig) return;

        // Usar la posición definida en el JSON (cargada en loader.js) o un default seguro
        const startPos = (ROV.config && ROV.config.startPosition) ? ROV.config.startPosition : {x: 0, y: 1.6, z: 0};
        const startRot = (ROV.config && ROV.config.startRotation) ? ROV.config.startRotation : {x: 0, y: 0, z: 0};

        ROV.refs.rig.setAttribute('position', startPos); 
        ROV.refs.rig.setAttribute('rotation', startRot); 
        
        if(ROV.refs.pivot) ROV.refs.pivot.setAttribute('rotation', "0 0 0"); 
        if(ROV.refs.cam) ROV.refs.cam.setAttribute('rotation', "0 0 0"); 
        
        console.log("ROV Reset to:", startPos);
    },

    toggleFullscreen: function() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => console.log(err));
        } else {
            document.exitFullscreen();
        }
    },

    changeSpeed: function(direction) {
        // direction: 1 (subir), -1 (bajar)
        const levels = ROV.config.speedLevels;
        let idx = ROV.state.currentLevelIndex;

        if (direction > 0 && idx < levels.length - 1) idx++;
        if (direction < 0 && idx > 0) idx--;

        ROV.state.currentLevelIndex = idx;
        ROV.physics.updateSpeedUI();
    },

    // --- NUEVA FUNCIÓN CONTEXTUAL ---
    scanWaypoint: function() {
        const wpId = ROV.state.activeWaypoint;
        
        if (wpId) {
            console.log(`[SYSTEM] Scanning Target: ${wpId}`);
            
            // Feedback Visual: Parpadeo del botón
            const btn = document.getElementById('btn-scan');
            if(btn) {
                // Flash blanco para indicar foto/scan
                const originalBg = btn.style.backgroundColor;
                btn.style.backgroundColor = "#FFFFFF";
                btn.style.color = "#000";
                
                setTimeout(() => {
                    btn.style.backgroundColor = ""; // Volver al CSS (rgba)
                    btn.style.color = "#FFFFFF";
                }, 150);
            }
        }
    }
};













