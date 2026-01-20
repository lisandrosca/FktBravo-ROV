// rov-model-handler.js
// Se encarga exclusivamente de cargar modelos, aplicar texturas manuales y ajustar escalas.

ROV.modelHandler = {
    /**
     * Se ejecuta cuando el modelo .glb/.gltf termina de cargar.
     * Busca texturas 'materialX_diffuse' y las aplica, luego centra y escala.
     */
    setupModel: function(mesh) {
        if (!mesh) return;

        const mapEntity = ROV.refs.mapEntity;
        const currentSrc = mapEntity.getAttribute('gltf-model');
        const basePath = currentSrc.substring(0, currentSrc.lastIndexOf('/') + 1);
        
        console.log(`[ModelHandler] Path base detectado: ${basePath}`);

        // 1. Carga Manual de Texturas (Fix para modelos sin texturas embebidas)
        const loader = new THREE.TextureLoader();
        
        mesh.traverse(node => {
            if (node.isMesh) {
                // Asegurar doble cara para ver paredes desde adentro si hace falta
                const materials = Array.isArray(node.material) ? node.material : [node.material];
                
                materials.forEach(mat => {
                    mat.side = THREE.DoubleSide;
                    // Buscar patrón "materialXX" en el nombre del nodo
                    const match = node.name.match(/material(\d+)/i);
                    if (match) {
                        const textureUrl = `${basePath}textures/material${match[1]}_diffuse.jpeg`;
                        
                        // Cargar textura asíncronamente
                        loader.load(textureUrl, (tex) => {
                            tex.encoding = THREE.sRGBEncoding;
                            tex.flipY = false; // Importante para GLTF
                            mat.map = tex;
                            mat.needsUpdate = true;
                        }, undefined, (err) => {
                            // Silencioso o warning suave para no saturar consola
                            console.warn(`[ModelHandler] Textura no encontrada: ${textureUrl}`);
                        });
                    }
                });
            }
        });

        // 2. Auto-Escalado y Centrado
        // Calculamos la caja de rebote (Bounding Box)
        const bbox = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        bbox.getSize(size);
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetSize = 20; // Tamaño objetivo en metros aprox
        const scaleFactor = targetSize / maxDim;
        
        // Aplicar escala
        mapEntity.setAttribute('scale', `${scaleFactor} ${scaleFactor} ${scaleFactor}`);
        
        // Calcular centro para posicionarlo en 0,0,0
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        
        // Ajuste de posición (El -2 en Y y -10 en Z son offsets estéticos para que quede frente a cámara)
        mapEntity.setAttribute('position', { 
            x: -center.x * scaleFactor, 
            y: (-center.y * scaleFactor) - 2, 
            z: (-center.z * scaleFactor) - 10 
        });

        // 3. Ajuste dinámico de velocidad base según el tamaño del modelo
        // Modelos grandes necesitan moverse más rápido
        ROV.config.baseMoveSpeed = 0.02 + (Math.log10(maxDim + 1) * 0.03);
        
        console.log(`[ModelHandler] Modelo listo. Escala: ${scaleFactor.toFixed(4)}`);
    }
};
