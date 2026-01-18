// js/waypoints-loader.js

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    const pageName = path.split("/").pop().split(".")[0];
    const currentSceneKey = pageName.replace(/_/g, "-");

    console.log(`[Waypoints] Inicializando para: ${currentSceneKey}`);
    loadWaypoints(currentSceneKey);
});

function loadWaypoints(sceneKey) {
    fetch('../data/waypoints.json')
        .then(res => {
            if (!res.ok) throw new Error("Error loading waypoints");
            return res.json();
        })
        .then(data => {
            const waypoints = data[sceneKey];
            if (!waypoints || waypoints.length === 0) return;
            spawnBubbles(waypoints);
        })
        .catch(err => console.error(err));
}

function spawnBubbles(list) {
    const scene = document.querySelector('a-scene');
    if (!scene) return;

    // --- CONFIGURACIÓN MAESTRA DE TAMAÑO ---
    const GLOBAL_SCALE = 0.5; 
    
    // Cálculos automáticos basados en la escala global
    const outerRadius = 0.4 * GLOBAL_SCALE;   // Radio del borde wireframe
    const innerRadius = 0.15 * GLOBAL_SCALE;  // Radio del núcleo sólido
    const floatHeight = 0.3 * GLOBAL_SCALE;   // Cuánto sube al flotar
    // ---------------------------------------

    const container = document.createElement('a-entity');
    container.setAttribute('id', 'waypoints-container');
    
    list.forEach(wp => {
        // CONTENEDOR (Wrapper)
        const wrapper = document.createElement('a-entity');
        wrapper.setAttribute('position', wp.position);
        wrapper.setAttribute('id', wp.id);
        wrapper.setAttribute('class', 'interactable-waypoint');
        wrapper.setAttribute('data-title', wp.title);

        // Animación de Flote (Ajustada dinámicamente a la escala)
        wrapper.setAttribute('animation__float', {
            property: 'object3D.position.y',
            to: wp.position.y + floatHeight,
            dir: 'alternate',
            dur: 2500,
            loop: true,
            easing: 'easeInOutSine'
        });

        // --- 1. CAPA EXTERNA (Wireframe) ---
        const outer = document.createElement('a-entity');
        outer.setAttribute('geometry', `primitive: octahedron; radius: ${outerRadius}`);
        outer.setAttribute('material', {
            shader: 'flat',
            color: '#00ffff',
            wireframe: true,
            wireframeLinewidth: 2
        });
        
        outer.setAttribute('animation', {
            property: 'rotation',
            to: '0 360 0',
            dur: 8000,
            loop: true,
            easing: 'linear'
        });

        // --- 2. CAPA INTERNA (Núcleo) ---
        const core = document.createElement('a-entity');
        core.setAttribute('geometry', `primitive: octahedron; radius: ${innerRadius}`);
        core.setAttribute('material', {
            shader: 'flat',
            color: '#00ffff',
            opacity: 0.6,
            transparent: true
        });

        core.setAttribute('animation', {
            property: 'rotation',
            to: '360 0 0',
            dur: 4000,
            loop: true,
            easing: 'linear'
        });

        // Unimos
        wrapper.appendChild(outer);
        wrapper.appendChild(core);
        container.appendChild(wrapper);
    });

    scene.appendChild(container);
}
