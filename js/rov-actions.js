// rov-actions.js
// Centraliza las acciones discretas (On/Off, Toggles, Resets)
// para que puedan ser llamadas desde cualquier input (Touch, Gamepad, Teclado).

ROV.actions = {
    toggleLights: function() {
        ROV.state.lightsOn = !ROV.state.lightsOn;
        
        // Actualizar DOM
        if (ROV.refs.rovSpot) ROV.refs.rovSpot.setAttribute('light', 'intensity', ROV.state.lightsOn ? 2.5 : 0);
        if (ROV.refs.rovPoint) ROV.refs.rovPoint.setAttribute('light', 'intensity', ROV.state.lightsOn ? 0.8 : 0);
        
        // Feedback visual en botón UI
        if (ROV.refs.lightToggle) {
            ROV.refs.lightToggle.style.color = ROV.state.lightsOn ? "#fff" : "#ff4444";
            // Forzar actualización visual del icono si es necesario
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
            // Mantenemos el toggle del HUD visible siempre para poder cambiar
            if (ROV.refs.hudToggle) ROV.refs.hudToggle.classList.remove('ui-hidden');
        }
        // Modo 2: Nada (Cinemático) - Solo dejamos el botón para volver
        if (ROV.refs.hudToggle) ROV.refs.hudToggle.classList.remove('ui-hidden');
    },

    resetPosition: function() {
        if (!ROV.refs.rig) return;
        ROV.refs.rig.setAttribute('position', "0 1.6 0"); 
        ROV.refs.rig.setAttribute('rotation', "0 0 0"); 
        if(ROV.refs.pivot) ROV.refs.pivot.setAttribute('rotation', "0 0 0"); 
        if(ROV.refs.cam) ROV.refs.cam.setAttribute('rotation', "0 0 0"); 
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
    }
};
