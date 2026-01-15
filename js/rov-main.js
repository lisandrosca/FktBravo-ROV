mapEntity.addEventListener('model-loaded', () => {
    const mesh = mapEntity.getObject3D('mesh');
    if (!mesh) return;


    const currentSrc = mapEntity.getAttribute('gltf-model');
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
    mapEntity.setAttribute('scale', `${scaleFactor} ${scaleFactor} ${scaleFactor}`);
    
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    
    // Centrar el modelo
    mapEntity.setAttribute('position', { 
        x: -center.x * scaleFactor, 
        y: (-center.y * scaleFactor) - 2, 
        z: (-center.z * scaleFactor) - 10 
    });

    baseMoveSpeed = 0.02 + (Math.log10(maxDim + 1) * 0.03);
    
    if(typeof debug !== 'undefined') {
        debug.innerText = "SYSTEM: ROV Online - Dive Active";
        setTimeout(() => { debug.style.opacity = "0"; }, 5000);
    }
});

function updateLoop() {
    const rot = cam.getAttribute('rotation');
    const rigRot = rig.getAttribute('rotation') || {y:0};
    
    // Check de seguridad por si los elementos no han cargado aún
    if(headText) {
        headText.innerText = Math.floor((360 - ((rot.y + rigRot.y) % 360)) % 360).toString().padStart(3, '0');
    }

    if(typeof updateGamepad === 'function') updateGamepad();

    if (activeAction) {
        const pos = rig.getAttribute('position'), angle = rot.y * (Math.PI / 180);
        let fov = cam.getAttribute('camera').fov;
        
        // Check de seguridad para speedLevels
        const currentSpeedMult = (window.speedLevels && window.currentLevelIndex !== undefined) 
            ? window.speedLevels[window.currentLevelIndex] 
            : 1.0;

        const speed = baseMoveSpeed * (fov/80) * currentSpeedMult;
        
        if (activeAction === 'move-up') { pos.x -= Math.sin(angle) * speed; pos.z -= Math.cos(angle) * speed; }
        if (activeAction === 'move-down') { pos.x += Math.sin(angle) * speed; pos.z += Math.cos(angle) * speed; }
        if (activeAction === 'move-left') { pos.x -= Math.cos(angle) * speed; pos.z += Math.sin(angle) * speed; }
        if (activeAction === 'move-right') { pos.x += Math.cos(angle) * speed; pos.z -= Math.sin(angle) * speed; }
        if (activeAction === 'ascend') pos.y += speed * 0.7;
        if (activeAction === 'descend') pos.y -= speed * 0.7;
        if (activeAction === 'zoom-in') fov = Math.max(5, fov - (baseZoomSpeed * (fov/80)));
        if (activeAction === 'zoom-out') fov = Math.min(150, fov + (baseZoomSpeed * (fov/80)));
        
        rig.setAttribute('position', pos); 
        cam.setAttribute('camera', 'fov', fov);
    }
    
    if(depthText && rig) {
        // Usamos baseDepth si existe, sino 0
        const bDepth = (typeof baseDepth !== 'undefined') ? baseDepth : 0;
        depthText.innerText = Math.floor(bDepth - rig.getAttribute('position').y);
    }
    
    requestAnimationFrame(updateLoop);
}

window.addEventListener("gamepadconnected", (e) => {
    if(debug) {
        debug.innerText = `CONNECTED: ${e.gamepad.id.split('(')[0]}`;
        debug.style.opacity = "1";
        setTimeout(() => { debug.style.opacity = "0"; }, 3000);
    }
});

updateLoop();
