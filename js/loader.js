document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    const pageName = path.split("/").pop().split(".")[0];
    const jsonKey = pageName.replace(/_/g, "-");

    console.log(`[Loader] Init: ${jsonKey}`);
    const debugConsole = document.getElementById('debug-console'); // Para mostrar errores en pantalla

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

    // 1. Limpiamos cualquier modelo previo
    mapEntity.removeAttribute('gltf-model');

    // 2. Escuchamos eventos de carga ANTES de asignar el modelo
    mapEntity.addEventListener('model-loaded', () => {
        console.log("[Loader] Model loaded successfully!");
        debugConsole.textContent = "SYSTEM: Model Loaded. Dive Active.";
        
        // Opcional: Ajustar escala si se ve muy chico/grande
        // mapEntity.setAttribute('scale', '1 1 1'); 
    }, { once: true });

    mapEntity.addEventListener('model-error', (e) => {
        console.error("[Loader] 3D Model Failed:", e.detail.src);
        debugConsole.textContent = "SYSTEM ERROR: Could not load 3D model.";
    }, { once: true });

    // 3. Asignamos la URL directa. Esto fuerza la carga inmediata.
    mapEntity.setAttribute('gltf-model', url);
}
