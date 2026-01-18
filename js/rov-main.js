ROV.refs.mapEntity.addEventListener('model-loaded', () => {
    const mesh = ROV.refs.mapEntity.getObject3D('mesh');
    if (!mesh) return;

    const currentSrc = ROV.refs.mapEntity.getAttribute('gltf-model');
    const basePath = currentSrc.substring(0, currentSrc.lastIndexOf('/') + 1);
    
    console.log(`[Main] Model Base Path detected: ${basePath}`);

    const loader = new THREE.TextureLoader();
    mesh.traverse(node => {
        if (node.isMesh) {
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            materials.forEach(mat => {
                mat.side = THREE.DoubleSide;
                const match = node.name.match(/material(\d+)/i);
                if (match) {
                    const textureUrl = `${basePath}textures/material${match[1]}_diffuse.jpeg`;
                    
                    mat.map = loader.load(textureUrl, (tex) => {
                        tex.encoding = THREE.sRGBEncoding;
                        tex.flipY = false;
                    }, undefined, (err) => {
                        console.warn(`[Main] Texture load failed for: ${textureUrl}`);
                    });
                    mat.needsUpdate = true;
                }
            });
        }
    });

    const bbox = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Auto-escala: ajusta cualquier modelo para que mida aprox 20 unidades
    const scaleFactor = 20 / maxDim;
    ROV.refs.mapEntity.setAttribute('scale', `${scaleFactor} ${scaleFactor} ${scaleFactor}`);
    
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    
    // Centrar el modelo
    ROV.refs.mapEntity.setAttribute('position', { 
        x: -center.x * scaleFactor, 
        y: (-center.y * scaleFactor) - 2, 
        z: (-center.z * scaleFactor) - 10 
    });

    // Guardamos la velocidad base calculada en la Configuración Global
    ROV.config.baseMoveSpeed = 0.02 + (Math.log10(maxDim + 1) * 0.03);
    
    if(ROV.refs.debug) {
        ROV.refs.debug.innerText = "SYSTEM: ROV Online - Dive Active";
        setTimeout(() => { ROV.refs.debug.style.opacity = "0"; }, 5000);
    }
});

// NUEVO: Función de arranque para inicializar controles personalizados
function initSystem() {
    // 1. Inicializar lógica de rotación táctil personalizada
    if(typeof initTouchRotation === 'function') {
        initTouchRotation();
        console.log("[Main] Custom Touch Rotation Initialized");
    }

    // 2. Desactivar el touch nativo de A-Frame en la cámara para evitar conflictos
    // Mantenemos mouseEnabled false para que no secuestre el clic en PC si no queremos
    if (ROV.refs.cam) {
        ROV.refs.cam.setAttribute('look-controls', {
            touchEnabled: false, 
            mouseEnabled: false,
            magicWindowTrackingEnabled: true // Mantenemos giroscopio activo si se desea
        });
    }

    // Arrancamos el bucle principal
    updateLoop();
}

function updateLoop() {
    const { cam, rig, headText, depthText } = ROV.refs;
    const { activeAction } = ROV.state;

    // 1. Telemetría (Heading)
    const rot = cam.getAttribute('rotation');
    const rigRot = rig.getAttribute('rotation') || {y:0};
    
    if(headText) {
        headText.innerText = Math.floor((360 - ((rot.y + rigRot.y) % 360)) % 360).toString().padStart(3, '0');
    }

    // 2. Gamepad (Llama a physics internamente)
    if(typeof updateGamepad === 'function') updateGamepad();

    // 3. Controles Táctiles (Touch / Mouse) para MOVIMIENTO
    if (activeAction) {
        let fov = cam.getAttribute('camera').fov;
        
        // Mapeamos acciones a vectores (Surge, Sway, Heave)
        let surge = 0, sway = 0, heave = 0;

        if (activeAction === 'move-up')    surge = 1;
        if (activeAction === 'move-down')  surge = -1;
        if (activeAction === 'move-left')  sway = -1;
        if (activeAction === 'move-right') sway = 1;
        if (activeAction === 'ascend')     heave = 1;
        if (activeAction === 'descend')    heave = -1;

        // Si hay movimiento físico, usamos la función centralizada
        if (surge !== 0 || sway !== 0 || heave !== 0) {
            ROV.physics.applyMove(surge, sway, heave, false); // false = no turbo para touch
        }

        // Zoom (Manejado aparte porque es propiedad de cámara, no posición)
        const zoomSpd = ROV.config.baseZoomSpeed;
        if (activeAction === 'zoom-in') fov = Math.max(5, fov - (zoomSpd * (fov/80)));
        if (activeAction === 'zoom-out') fov = Math.min(150, fov + (zoomSpd * (fov/80)));
        cam.setAttribute('camera', 'fov', fov);
    }
    
    // 4. Telemetría (Profundidad)
    if(depthText && rig) {
        const bDepth = ROV.config.baseDepth || 0;
        depthText.innerText = Math.floor(bDepth - rig.getAttribute('position').y);
    }

     // 5: Actualización de Coordenadas en UI
    if (ROV.refs.coordsBlock && ROV.refs.rig) {
        const pos = ROV.refs.rig.getAttribute('position');
        // Usamos toFixed(2) para que no baile tanto el número
        ROV.refs.coordsBlock.innerText = 
            `X: ${pos.x.toFixed(2)}  Y: ${pos.y.toFixed(2)}  Z: ${pos.z.toFixed(2)}`;
    }

    requestAnimationFrame(updateLoop);
}

window.addEventListener("gamepadconnected", (e) => {
    if(ROV.refs.debug) {
        ROV.refs.debug.innerText = `CONNECTED: ${e.gamepad.id.split('(')[0]}`;
        ROV.refs.debug.style.opacity = "1";
        setTimeout(() => { ROV.refs.debug.style.opacity = "0"; }, 3000);
    }
});

// Iniciamos el sistema
initSystem();
