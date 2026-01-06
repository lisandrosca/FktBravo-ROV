mapEntity.addEventListener('model-loaded', () => {
    const mesh = mapEntity.getObject3D('mesh');
    if (!mesh) return;
    const loader = new THREE.TextureLoader();
    mesh.traverse(node => {
        if (node.isMesh) {
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            materials.forEach(mat => {
                mat.side = THREE.DoubleSide;
                const match = node.name.match(/material(\d+)/i);
                if (match) {
                    mat.map = loader.load(`../assets/models/whale-fall/textures/material${match[1]}_diffuse.jpeg`, (tex) => {
                        tex.encoding = THREE.sRGBEncoding;
                        tex.flipY = false;
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
    const scaleFactor = 20 / maxDim;
    mapEntity.setAttribute('scale', `${scaleFactor} ${scaleFactor} ${scaleFactor}`);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    mapEntity.setAttribute('position', { x: -center.x * scaleFactor, y: (-center.y * scaleFactor) - 2, z: (-center.z * scaleFactor) - 10 });
    baseMoveSpeed = 0.02 + (Math.log10(maxDim + 1) * 0.03);
    
    debug.innerText = "SYSTEM: ROV Online - Controller V2.0 Ready";
    setTimeout(() => { debug.style.opacity = "0"; }, 5000);
});

function updateLoop() {
    const rot = cam.getAttribute('rotation');
    const rigRot = rig.getAttribute('rotation') || {y:0};
    headText.innerText = Math.floor((360 - ((rot.y + rigRot.y) % 360)) % 360).toString().padStart(3, '0');

    updateGamepad();

    if (activeAction) {
        const pos = rig.getAttribute('position'), angle = rot.y * (Math.PI / 180);
        let fov = cam.getAttribute('camera').fov;
        const speed = baseMoveSpeed * (fov/80) * speedLevels[currentLevelIndex];
        if (activeAction === 'move-up') { pos.x -= Math.sin(angle) * speed; pos.z -= Math.cos(angle) * speed; }
        if (activeAction === 'move-down') { pos.x += Math.sin(angle) * speed; pos.z += Math.cos(angle) * speed; }
        if (activeAction === 'move-left') { pos.x -= Math.cos(angle) * speed; pos.z += Math.sin(angle) * speed; }
        if (activeAction === 'move-right') { pos.x += Math.cos(angle) * speed; pos.z -= Math.sin(angle) * speed; }
        if (activeAction === 'ascend') pos.y += speed * 0.7;
        if (activeAction === 'descend') pos.y -= speed * 0.7;
        if (activeAction === 'zoom-in') fov = Math.max(5, fov - (baseZoomSpeed * (fov/80)));
        if (activeAction === 'zoom-out') fov = Math.min(150, fov + (baseZoomSpeed * (fov/80)));
        rig.setAttribute('position', pos); cam.setAttribute('camera', 'fov', fov);
    }
    depthText.innerText = Math.floor(baseDepth - rig.getAttribute('position').y);
    requestAnimationFrame(updateLoop);
}

window.addEventListener("gamepadconnected", (e) => {
    debug.innerText = `CONNECTED: ${e.gamepad.id.split('(')[0]}`;
    debug.style.opacity = "1";
    setTimeout(() => { debug.style.opacity = "0"; }, 3000);
});

// Arrancar el loop
updateLoop();
