// js/systems/rov-modal.js
ROV.modal = {
    overlay: null,
    title: null,
    body: null,

    init: function () {
        this.overlay = document.getElementById('modal-overlay');
        this.title = document.getElementById('m-title');
        this.body = document.getElementById('m-body');
    },

    // Acepta el objeto de datos COMPLETO del waypoint
    open: function (waypointData) {
        if (!this.overlay) this.init();

        // 1. Bloquear Inputs (Physics)
        ROV.state.isLogbookOpen = true;

        // 2. Limpiar contenido anterior
        this.body.innerHTML = '';

        // 3. Renderizar Título
        if (this.title) this.title.innerText = ROV.localization.t(waypointData.title) || "SYSTEM ENTRY";

        // 4. Renderizar Contenido (Pattern Matching)
        const content = waypointData.content || {};
        let htmlBuffer = '';

        // --- A. Video YouTube ---
        if (content.youtube_id) {
            htmlBuffer += this._buildYoutube(content.youtube_id, content.video_caption);
        }

        // --- B. Galería de Fotos ---
        if (content.gallery && content.gallery.length > 0) {
            htmlBuffer += this._buildGallery(content.gallery);
        }

        // --- C. Gráficos ---
        if (content.image_chart) {
            htmlBuffer += this._buildChart(content.image_chart, content.chart_caption);
        }

        // --- D. Descripción (Texto) ---
        if (content.description) {
            const desc = ROV.localization.t(content.description);
            htmlBuffer += `<div class="modal-desc">${desc}</div>`;
        }

        // Inyectar al DOM
        this.body.innerHTML = htmlBuffer;

        // 5. Mostrar Visualmente
        this.overlay.classList.add('active');
        console.log("[MODAL] Rendered:", waypointData.id);
    },

    close: function () {
        if (!this.overlay) return;

        // Limpiar contenido al cerrar (detiene videos)
        setTimeout(() => {
            if (!this.overlay.classList.contains('active')) {
                this.body.innerHTML = '';
            }
        }, 500); // Aumentado para coincidir con la transición CSS

        this.overlay.classList.remove('active');

        // Liberar Inputs
        ROV.state.isLogbookOpen = false;
    },

    // --- BUILDERS (HTML Generators) ---

    _buildYoutube: function (id, caption) {
        return `
            <div class="video-wrapper">
                <iframe src="https://www.youtube.com/embed/${id}?rel=0&modestbranding=1" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen></iframe>
            </div>
            ${caption ? `<div class="media-caption">${ROV.localization.t(caption)}</div>` : ''}
        `;
    },

    _buildGallery: function (images) {
        if (!images || images.length === 0) return '';

        // 1. Featured Image (First image by default)
        const featured = images[0];
        const mainHtml = `
            <div class="gallery-main" id="gallery-main">
                <img src="${featured.src}" id="gallery-featured-img" alt="${ROV.localization.t(featured.caption) || 'Focus image'}">
                <div class="gallery-caption" id="gallery-featured-caption">${ROV.localization.t(featured.caption) || ''}</div>
            </div>
        `;

        // 2. Thumbnails Row
        const thumbs = images.map((img, idx) => `
            <div class="gallery-thumb ${idx === 0 ? 'active' : ''}" 
                 onclick="ROV.modal.updateGalleryFocus('${img.src}', '${img.caption || ''}', this)">
                <img src="${img.src}" alt="Thumbnail ${idx + 1}" loading="lazy">
            </div>
        `).join('');

        const thumbsHtml = `<div class="gallery-thumbs-row">${thumbs}</div>`;

        return `<div class="modal-gallery-v2">${mainHtml}${thumbsHtml}</div>`;
    },

    updateGalleryFocus: function (src, caption, thumbEl) {
        const featuredImg = document.getElementById('gallery-featured-img');
        const featuredCaption = document.getElementById('gallery-featured-caption');

        if (featuredImg) {
            featuredImg.style.opacity = '0';
            setTimeout(() => {
                featuredImg.src = src;
                featuredImg.style.opacity = '1';
                if (featuredCaption) featuredCaption.innerText = ROV.localization.t(caption);
            }, 200);
        }

        // Update active state in thumbnails
        const allThumbs = thumbEl.parentElement.querySelectorAll('.gallery-thumb');
        allThumbs.forEach(t => t.classList.remove('active'));
        if (thumbEl) thumbEl.classList.add('active');
    },

    _buildChart: function (src, caption) {
        return `
            <div class="chart-container">
                <img src="${src}" alt="Scientific Data">
                ${caption ? `<div class="media-caption" style="text-align:center; margin-top:5px;">${ROV.localization.t(caption)}</div>` : ''}
            </div>
        `;
    }
};
