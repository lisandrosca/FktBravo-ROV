// js/systems/rov-waypoints.js

ROV.waypoints = {
    list: [], 
    uiBtn: null,
    uiExplore: null, // Referencia al texto Explore
    
    init: function() {
        ROV.state.activeWaypoint = null;

        // Referencias DOM
        this.uiBtn = document.getElementById('btn-scan');
        this.uiExplore = document.getElementById('explore-label');
        
        if (this.uiBtn) {
            this.uiBtn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                ROV.actions.scanWaypoint();
            });
        }

        const path = window.location.pathname;
        const pageName = path.split("/").pop().split(".")[0];
        const missionKey = pageName.replace(/_/g, "-");

        fetch('../data/waypoints.json')
            .then(res => res.json())
            .then(data => {
                const points = data[missionKey];
                if (points && points.length > 0) this.spawn(points);
            })
            .catch(err => console.error("[Waypoints] Error:", err));
    },

    spawn: function(data) {
        const scene = document.querySelector('a-scene');
        data.forEach(wpData => {
            const el = document.createElement('a-entity');
            
            // Estado inicial: Esfera blanca pequeña y transparente
            el.setAttribute('geometry', 'primitive: sphere; radius: 0.15');
            el.setAttribute('material', 'color: #FFFFFF; shader: flat; opacity: 0.4; transparent: true');
            el.setAttribute('scale', '0.3 0.3 0.3'); 
            el.setAttribute('position', wpData.position);
            scene.appendChild(el);

            this.list.push({
                id: wpData.id,
                el: el,
                pos: new THREE.Vector3(wpData.position.x, wpData.position.y, wpData.position.z),
                active: false
            });
        });
    },

    update: function() {
        if (!ROV.refs.rig || this.list.length === 0) return;

        const currentPos = ROV.refs.rig.object3D.position;
        let foundCandidate = null;

        this.list.forEach(wp => {
            const dist = currentPos.distanceTo(wp.pos);
            const isClose = dist < 3.5; 

            if (isClose !== wp.active) {
                wp.active = isClose;
                
                if (isClose) {
                    // Cerca
                    wp.el.setAttribute('geometry', 'primitive: octahedron; radius: 0.2');
                    wp.el.setAttribute('scale', '0.45 0.85 0.45');
                    wp.el.setAttribute('material', 'opacity: 0.6');
                    wp.el.setAttribute('animation', 'property: rotation; to: 0 360 0; loop: true; dur: 4000; easing: linear');
                } else {
                    // Lejos
                    wp.el.setAttribute('geometry', 'primitive: sphere; radius: 0.15');
                    wp.el.setAttribute('scale', '0.3 0.3 0.3');
                    wp.el.setAttribute('material', 'opacity: 0.4');
                    wp.el.removeAttribute('animation');
                    wp.el.object3D.rotation.set(0, 0, 0);
                }
            }
            if (isClose) foundCandidate = wp.id;
        });

        // Actualizar Estado
        ROV.state.activeWaypoint = foundCandidate;

        // Mostrar/Ocultar UI (Botón + Texto)
        if (foundCandidate) {
            // MOSTRAR
            if (this.uiBtn && this.uiBtn.classList.contains('ui-hidden')) {
                this.uiBtn.classList.remove('ui-hidden');
            }
            if (this.uiExplore && this.uiExplore.classList.contains('ui-hidden')) {
                this.uiExplore.classList.remove('ui-hidden');
            }
        } else {
            // OCULTAR
            if (this.uiBtn && !this.uiBtn.classList.contains('ui-hidden')) {
                this.uiBtn.classList.add('ui-hidden');
            }
            if (this.uiExplore && !this.uiExplore.classList.contains('ui-hidden')) {
                this.uiExplore.classList.add('ui-hidden');
            }
        }
    }
};
