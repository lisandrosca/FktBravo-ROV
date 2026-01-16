// js/rov-main-custom.js

ROV.refs.mapEntity.addEventListener('model-loaded', () => {
    const mesh = ROV.refs.mapEntity.getObject3D('mesh');
    if (!mesh) return;

    // Detectamos la carpeta base donde está el modelo (ej: .../giant-corals/)
    const currentSrc = ROV.refs.mapEntity.getAttribute('gltf-model');
    const basePath = currentSrc.substring(0, currentSrc.lastIndexOf('/') + 1);
    
    console.log(`[Custom Main] Model Base Path: ${basePath}`);

            const loader = new THREE.TextureLoader();

    mesh.traverse(node => {
        if (node.isMesh) {
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            
            materials.forEach(mat => {
                mat.side = THREE.DoubleSide; 
                
                // Debug: Ver qué materiales está encontrando
                // console.log("Processing material:", mat.name);

                if (mat.name) {
                    const baseName = mat.name; 
                    
                    // --- 1. BASE COLOR ---
                    const colorPath = `${basePath}textures/${baseName}_baseColor.png`;
                    mat.map = loader.load(colorPath, (tex) => {
                        tex.encoding = THREE.sRGBEncoding;
                        tex.flipY = false;
                        
                        // --- EL FIX PRINCIPAL ESTÁ AQUÍ ---
                        // Le decimos que si el modelo lo pide, repita la textura
                        // en lugar de estirar el último pixel.
                        tex.wrapS = THREE.RepeatWrapping;
                        tex.wrapT = THREE.RepeatWrapping;
                    });

                    // --- 2. NORMAL MAP ---
                    const normalPath = `${basePath}textures/${baseName}_normal.png`;
                    mat.normalMap = loader.load(normalPath, (tex) => {
                        tex.flipY = false;
                        tex.wrapS = THREE.RepeatWrapping;
                        tex.wrapT = THREE.RepeatWrapping;
                    });

                    // --- 3. METALLIC / ROUGHNESS ---
                    const mrPath = `${basePath}textures/${baseName}_metallicRoughness.png`;
                    const mrTexture = loader.load(mrPath, (tex) => {
                        tex.flipY = false;
                        tex.wrapS = THREE.RepeatWrapping;
                        tex.wrapT = THREE.RepeatWrapping;
                    });
                    
                    mat.metalnessMap = mrTexture;
                    mat.roughnessMap = mrTexture;

                    mat.needsUpdate = true;
                }
            });
        }
    });



    // --- CÓDIGO DE ESCALADO Y CENTRADO AUTOMÁTICO (Idéntico al original) ---
    const bbox = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Escalar a aprox 20 unidades
    const scaleFactor = 20 / maxDim;
    ROV.refs.mapEntity.setAttribute('scale', `${scaleFactor} ${scaleFactor} ${scaleFactor}`);
    
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    
    // Centrar en el mundo
    ROV.refs.mapEntity.setAttribute('position', { 
        x: -center.x * scaleFactor, 
        y: (-center.y * scaleFactor) - 2, 
        z: (-center.z * scaleFactor) - 10 
    });

    // Recalcular velocidad base según tamaño
    ROV.config.baseMoveSpeed = 0.02 + (Math.log10(maxDim + 1) * 0.03);
    
    if(ROV.refs.debug) {
        ROV.refs.debug.innerText = "SYSTEM: Custom Model Online";
        setTimeout(() => { ROV.refs.debug.style.opacity = "0"; }, 5000);
    }
});

// --- INIT SYSTEMS (Idéntico al original) ---

function initSystem() {
    if(typeof initTouchRotation === 'function') {
        initTouchRotation();
        console.log("[Custom Main] Touch Rotation Initialized");
    }

    if (ROV.refs.cam) {
        ROV.refs.cam.setAttribute('look-controls', {
            touchEnabled: false, 
            mouseEnabled: false,
            magicWindowTrackingEnabled: true 
        });
    }
    updateLoop();
}

function updateLoop() {
    const { cam, rig, headText, depthText } = ROV.refs;
    const { activeAction } = ROV.state;

    // Telemetría Heading
    const rot = cam.getAttribute('rotation');
    const rigRot = rig.getAttribute('rotation') || {y:0};
    if(headText) {
        headText.innerText = Math.floor((360 - ((rot.y + rigRot.y) % 360)) % 360).toString().padStart(3, '0');
    }

    // Gamepad
    if(typeof updateGamepad === 'function') updateGamepad();

    // Touch Actions
    if (activeAction) {
        let fov = cam.getAttribute('camera').fov;
        let surge = 0, sway = 0, heave = 0;

        if (activeAction === 'move-up')    surge = 1;
        if (activeAction === 'move-down')  surge = -1;
        if (activeAction === 'move-left')  sway = -1;
        if (activeAction === 'move-right') sway = 1;
        if (activeAction === 'ascend')     heave = 1;
        if (activeAction === 'descend')    heave = -1;

        if (surge !== 0 || sway !== 0 || heave !== 0) {
            ROV.physics.applyMove(surge, sway, heave, false);
        }

        const zoomSpd = ROV.config.baseZoomSpeed;
        if (activeAction === 'zoom-in') fov = Math.max(5, fov - (zoomSpd * (fov/80)));
        if (activeAction === 'zoom-out') fov = Math.min(150, fov + (zoomSpd * (fov/80)));
        cam.setAttribute('camera', 'fov', fov);
    }
    
    // Telemetría Profundidad
    if(depthText && rig) {
        const bDepth = ROV.config.baseDepth || 0;
        depthText.innerText = Math.floor(bDepth - rig.getAttribute('position').y);
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

initSystem();
