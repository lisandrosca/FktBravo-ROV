/**
 * localization.js
 * Handles language switching and dynamic UI updates.
 */

window.ROV = window.ROV || {};

ROV.localization = {
    currentLang: 'es',
    locales: {},
    supportedLanguages: ['en', 'es'],

    async init() {
        // 1. Get saved language or default to browser language or 'es'
        const savedLang = localStorage.getItem('rov-language');
        const browserLang = navigator.language.split('-')[0];

        if (savedLang && this.supportedLanguages.includes(savedLang)) {
            this.currentLang = savedLang;
        } else if (this.supportedLanguages.includes(browserLang)) {
            this.currentLang = browserLang;
        } else {
            this.currentLang = 'es';
        }

        // 2. Load locales
        await this.loadLocales();

        // 3. Update DOM
        this.updateDOM();

        console.log(`[Localization] Initialized in ${this.currentLang.toUpperCase()}`);
    },

    async loadLocales() {
        try {
            // Get base path depending on location (root or habitats/)
            const isHabitat = window.location.pathname.includes('/habitats/');
            const basePath = isHabitat ? '../locales/' : 'locales/';

            const response = await fetch(`${basePath}${this.currentLang}.json`);
            if (!response.ok) throw new Error(`Could not load ${this.currentLang} locale`);
            this.locales = await response.json();
        } catch (error) {
            console.error('[Localization] Error loading locales:', error);
        }
    },

    async setLanguage(lang) {
        if (!this.supportedLanguages.includes(lang)) return;
        if (this.currentLang === lang) return;

        this.currentLang = lang;
        localStorage.setItem('rov-language', lang);

        await this.loadLocales();
        this.updateDOM();

        // Dispatch event for components that might need manual updating
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    },

    /**
     * Translate a key using dot notation (e.g., 'menu.title')
     */
    t(key) {
        const value = key.split('.').reduce((obj, i) => (obj ? obj[i] : null), this.locales);
        return value || key;
    },

    /**
     * Updates all elements with data-i18n attribute
     */
    updateDOM() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);

            if (translation) {
                // If it's a title attribute or placeholder, handle differently
                if (el.hasAttribute('data-i18n-attr')) {
                    const attr = el.getAttribute('data-i18n-attr');
                    el.setAttribute(attr, translation);
                } else {
                    el.textContent = translation;
                }
            }
        });

        // Update document title if needed
        const pageTitleKey = document.body.getAttribute('data-i18n-page-title');
        if (pageTitleKey) {
            document.title = this.t(pageTitleKey);
        }

        // Apply active class to language selectors if they exist
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-lang') === this.currentLang);
        });

        // Update html lang attribute
        document.documentElement.lang = this.currentLang;
    }
};
