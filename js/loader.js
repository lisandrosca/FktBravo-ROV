// loader.js

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    const pageName = path.split("/").pop().split(".")[0];
    const jsonKey = pageName.replace(/_/g, "-");

    console.log(`[Loader] Init: ${jsonKey}`);
    const debugConsole = document.getElementById('debug-console'); 

    initGyroToggle();

    fetch('../data/dives.json')
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(data => {
            if (!data[jsonKey]) throw new Error(`Key "${jsonKey}" not found in JSON`);
            
            const diveData = data[jsonKey];
            updateUI(diveData);
            loadModelDirectly(diveData.model_path);
        })
        .catch(err => {
            console.error("[Loader] Critical Error:", err);
            if(debugConsole) debugConsole.innerHTML = `ERROR: ${err.message}`;
            alert("Error cargando la misión. Revisa la consola.");
        });
});

function initGyroToggle() {
    const gyroBtn = document.getElementById('gyro-toggle');
    const cameraEl = document.getElementById('main-camera');
    const debugConsole = document.getElementById('debug-console');

    if (!gyroBtn || !cameraEl) return;

    gyroBtn.addEventListener('click', async () => {
        // Manejo de permisos para iOS
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const permissionState = await DeviceOrientationEvent.requestPermission();
                if (permissionState !== 'granted') {
                    if(debugConsole) debugConsole.textContent = "SYSTEM: Gyro permission denied.";
                    return;
                }
            } catch (error) {
                console.error(error);
                return;
            }
        }

        const controls = cameraEl.components['look-controls'];
        const isEnabled = cameraEl.getAttribute('look-controls').magicWindowTrackingEnabled;

        if (isEnabled) {
            // --- AL DESACTIVAR (Solución al Snap) ---
            const currentRotationX = cameraEl.object3D.rotation.x;
            const currentRotationY = cameraEl.object3D.rotation.y;

            cameraEl.setAttribute('look-controls', { magicWindowTrackingEnabled: false });

            if (controls) {
                controls.pitch = currentRotationX;
                controls.yaw = currentRotationY;
            }
            
            gyroBtn.classList.remove('active');
            if(debugConsole) debugConsole.textContent = "SYSTEM: Gyroscope OFF";

        } else {
            // --- AL ACTIVAR ---
            cameraEl.setAttribute('look-controls', { magicWindowTrackingEnabled: true });
            
            gyroBtn.classList.add('active');
            if(debugConsole) debugConsole.textContent = "SYSTEM: Gyroscope ON";
        }
    });
}

function updateUI(data) {
    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setText('ui-title', data.title);
    setText('ui-id', data.id);
    setText('ui-depth', data.depth);
    setText('ui-temp', data.temp);
    setText('ui-salinity', data.salinity);
    setText('ui-o2', data.o2_con);
    setText('date-block', data.date);
    document.title = `ROV: ${data.title}`;
}

function loadModelDirectly(url) {
    const mapEntity = document.getElementById('map-entity');
    const debugConsole = document.getElementById('debug-console');

    if (!mapEntity) return;

    debugConsole.textContent = "SYSTEM: Loading 3D Model...";
    mapEntity.removeAttribute('gltf-model');

    mapEntity.addEventListener('model-loaded', () => {
        console.log("[Loader] Model loaded successfully!");
        debugConsole.textContent = "SYSTEM: Model Loaded. Dive Active.";
    }, { once: true });

    mapEntity.addEventListener('model-error', (e) => {
        console.error("[Loader] 3D Model Failed:", e.detail.src);
        debugConsole.textContent = "SYSTEM ERROR: Could not load 3D model.";
    }, { once: true });

    mapEntity.setAttribute('gltf-model', url);
}
