// loader.js

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    let site = urlParams.get('site');

    if (!site) {
        const path = window.location.pathname;
        site = path.split("/").pop().split(".")[0];
    }

    const jsonKey = site.replace(/_/g, "-");
    console.log(`[Loader] Init: ${jsonKey}`);

    const debugConsole = document.getElementById('debug-console');

    initGyroToggle();
    loadIcons();
    checkVersion();
    if (ROV.controlsUI) ROV.controlsUI.init();

    fetch('data/dives.json')
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(data => {
            if (!data[jsonKey]) throw new Error(`Key "${jsonKey}" not found in JSON`);

            const diveData = data[jsonKey];

            // 1. Inyectar Configuración Global (Vital para Física y Resets)
            if (window.ROV && ROV.config) {
                // Profundidad base para que la física calcule bien (evita el 0m)
                ROV.config.baseDepth = diveData.depth || 0;

                // Coordenadas de Spawn
                ROV.config.startPosition = diveData.start_position || { x: 0, y: 2, z: 10 };
                ROV.config.startRotation = diveData.start_rotation || { x: 0, y: 0, z: 0 };
                ROV.config.floorColor = diveData.floor_color || '#4e5846';
                if (diveData.floor_limit !== undefined) {
                    ROV.config.floorLimitOverride = diveData.floor_limit;
                }
            }

            // 2. Aplicar Posición Inicial Inmediatamente
            const rig = document.getElementById('camera-rig');
            if (rig) {
                // Usamos los datos recién guardados o los del JSON
                const startPos = diveData.start_position || { x: 0, y: 2, z: 10 };
                const startRot = diveData.start_rotation || { x: 0, y: 0, z: 0 };

                rig.setAttribute('position', startPos);
                rig.setAttribute('rotation', startRot);
                console.log(`[Loader] Spawning at:`, startPos);
            }

            // 3. Actualizar UI y cargar modelo
            updateUI(diveData);
            loadModelDirectly(diveData.model_path);
        })
        .catch(err => {
            console.error("[Loader] Critical Error:", err);
            if (debugConsole) debugConsole.innerHTML = `ERROR: ${err.message}`;
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
                    if (debugConsole) debugConsole.textContent = "SYSTEM: Gyro permission denied.";
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
            if (debugConsole) debugConsole.textContent = "SYSTEM: Gyroscope OFF";

        } else {
            // --- AL ACTIVAR ---
            cameraEl.setAttribute('look-controls', { magicWindowTrackingEnabled: true });

            gyroBtn.classList.add('active');
            if (debugConsole) debugConsole.textContent = "SYSTEM: Gyroscope ON";
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
    setText('ui-depth', data.depth); // Esto es visual inicial, luego la física toma el control
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

function loadIcons() {
    fetch('assets/icons.html')
        .then(res => res.text())
        .then(html => {
            const div = document.createElement('div');
            div.style.display = 'none';
            div.innerHTML = html;
            document.body.insertBefore(div, document.body.firstChild);
            console.log("[Loader] SVG Icons Injected");
        })
        .catch(err => console.error("[Loader] Icons Error:", err));
}

function checkVersion() {
    // Cache bust local version file
    fetch(`data/version.json?t=${Date.now()}`)
        .then(res => res.json())
        .then(ver => {
            console.log(
                `%c 🛠️ BUILD BASE HASH: ${ver.hash} \n%c 💬 "${ver.message}" \n%c 📅 Build Time: ${ver.timestamp}`,
                "color: #aaa; font-weight: bold; font-size: 11px;",
                "color: #888; font-style: italic;",
                "color: #888; font-size: 10px;"
            );
        })
        .catch(() => console.warn("[Loader] Version tracking not found"));
}
