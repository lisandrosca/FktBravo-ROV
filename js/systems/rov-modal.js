// js/systems/rov-modal.js
ROV.modal = {
    overlay: null,
    title: null,
    body: null,

    init: function() {
        this.overlay = document.getElementById('modal-overlay');
        this.title = document.getElementById('m-title');
        this.body = document.getElementById('m-body');
    },

    // Acepta el objeto de datos COMPLETO del waypoint
    open: function(waypointData) {
        if (!this.overlay) this.init(); 

        // 1. Bloquear Inputs (Physics)
        ROV.state.isLogbookOpen = true;

        // 2. Limpiar contenido anterior
        this.body.innerHTML = '';

        // 3. Renderizar Título
        if(this.title) this.title.innerText = waypointData.title || "SYSTEM ENTRY";

        // 4. Renderizar Contenido (Pattern Matching)
        const content = waypointData.content || {};
        let htmlBuffer = '';

        // --- A. Descripción (Texto) ---
        // Ahora es lo primero que se ve
        if (content.description) {
            htmlBuffer += `<div class="modal-desc" style="margin-top: 0;">${content.description}</div>`;
        }

        // --- B. Video YouTube ---
        if (content.youtube_id) {
            htmlBuffer += this._buildYoutube(content.youtube_id, content.video_caption);
        }

        // --- C. Galería de Fotos ---
        if (content.gallery && content.gallery.length > 0) {
            htmlBuffer += this._buildGallery(content.gallery);
        }

        // --- D. Gráficos ---
        if (content.image_chart) {
            htmlBuffer += this._buildChart(content.image_chart, content.chart_caption);
        }

        // Inyectar al DOM
        this.body.innerHTML = htmlBuffer;

        // 5. Mostrar Visualmente
        this.overlay.classList.add('active');
        console.log("[MODAL] Rendered:", waypointData.id);
    },

    close: function() {
        if (!this.overlay) return;
        
        // Limpiar contenido al cerrar (detiene videos)
        setTimeout(() => {
            if(!this.overlay.classList.contains('active')) {
                this.body.innerHTML = ''; 
            }
        }, 300); 

        this.overlay.classList.remove('active');
        
        // Liberar Inputs
        ROV.state.isLogbookOpen = false;
    },

    // --- BUILDERS (HTML Generators) ---

    _buildYoutube: function(id, caption) {
        return `
            <div class="video-wrapper">
                <iframe src="https://www.youtube.com/embed/${id}?rel=0&modestbranding=1" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen></iframe>
            </div>
            ${caption ? `<div class="media-caption">${caption}</div>` : ''}
        `;
    },

    _buildGallery: function(images) {
        // images: Array [{src, caption}]
        let items = images.map(img => `
            <div class="gallery-item" title="${img.caption || ''}">
                <img src="${img.src}" alt="${img.caption || 'Log image'}" loading="lazy">
            </div>
        `).join('');

        return `<div class="modal-gallery">${items}</div>`;
    },

    _buildChart: function(src, caption) {
        return `
            <div class="chart-container">
                <img src="${src}" alt="Scientific Data">
                ${caption ? `<div class="media-caption" style="text-align:center; margin-top:5px;">${caption}</div>` : ''}
            </div>
        `;
    }
};
