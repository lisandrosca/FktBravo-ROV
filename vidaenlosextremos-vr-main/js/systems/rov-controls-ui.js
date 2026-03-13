// js/systems/rov-controls-ui.js

ROV.controlsUI = {
    overlay: null,
    menu: null,
    currentTab: 'gamepad',
    _lastStart: false,

    init: function () {
        this.overlay = document.getElementById('controls-overlay');
        this.menu = document.getElementById('system-menu');
        this.setupEventListeners();
    },

    setupEventListeners: function () {
        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.tab);
            });
        });

        // Menu items
        const menuHome = document.getElementById('menu-home');
        const menuControls = document.getElementById('menu-controls');
        const menuGyro = document.getElementById('menu-gyro');

        if (menuHome) {
            menuHome.onclick = () => {
                window.location.href = './index.html';
            };
        }

        if (menuControls) {
            menuControls.onclick = () => {
                this.toggleMenu(false);
                this.toggle(true);
            };
        }

        if (menuGyro) {
            menuGyro.onclick = () => {
                if (window.ROV && ROV.actions && ROV.actions.toggleGyro) {
                    ROV.actions.toggleGyro();
                    this.toggleMenu(false);
                }
            };
        }
    },

    toggle: function (show) {
        if (!this.overlay) this.init();
        const force = (show !== undefined) ? show : !this.overlay.classList.contains('active');

        if (force) {
            this.overlay.classList.add('active');
            ROV.state.isControlsOpen = true;
            // Default to gamepad if available
            const gamepads = navigator.getGamepads();
            let hasGP = false;
            for (let i = 0; i < gamepads.length; i++) { if (gamepads[i]) hasGP = true; }
            this.switchTab(hasGP ? 'gamepad' : 'keyboard');
        } else {
            this.overlay.classList.remove('active');
            ROV.state.isControlsOpen = false;
        }
    },

    toggleMenu: function (show) {
        if (!this.menu) this.init();
        const force = (show !== undefined) ? show : !this.menu.classList.contains('active');
        this.menu.classList.toggle('active', force);
        ROV.state.isMenuOpen = force;
    },

    switchTab: function (tabName) {
        this.currentTab = tabName;
        const isGP = tabName === 'gamepad';

        // UI Tabs & Views
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
        document.querySelectorAll('.controls-view').forEach(v => v.classList.toggle('active', v.id === `view-${tabName}`));

        // Hints Toggling
        const gpHints = document.getElementById('gp-hints');
        const kbHints = document.getElementById('kb-hints');
        if (gpHints) gpHints.style.display = isGP ? 'flex' : 'none';
        if (kbHints) kbHints.style.display = isGP ? 'none' : 'flex';

        // Update Switch Input Hint
        const switchKey = document.getElementById('switch-key');
        if (switchKey) {
            if (isGP) {
                switchKey.innerHTML = '<svg class="gp-hint-svg" style="width:20px;height:20px;vertical-align:middle;"><use href="#gp-select"></use></svg>';
            } else {
                switchKey.innerHTML = 'TAB';
            }
        }

        if (isGP) this.updateGPIcons();
    },

    updateGPIcons: function () {
        const gpView = document.getElementById('view-gamepad');
        if (!gpView) return;

        const keys = gpView.querySelectorAll('.mapping-key');
        keys.forEach(k => {
            const txt = k.innerText.trim();
            if (txt === 'BTN Y') k.innerHTML = '<svg class="gp-hint-svg"><use href="#gp-triangle"></use></svg>';
            if (txt === 'BTN B') k.innerHTML = '<svg class="gp-hint-svg"><use href="#gp-circle"></use></svg>';
            if (txt === 'BTN X') k.innerHTML = '<svg class="gp-hint-svg"><use href="#gp-square"></use></svg>';
            if (txt === 'BTN A') k.innerHTML = '<svg class="gp-hint-svg"><use href="#gp-cross"></use></svg>';
            if (txt === 'DPAD ↑') k.innerHTML = '<svg class="gp-hint-svg"><use href="#gp-dpad-up"></use></svg>';
            if (txt === 'DPAD ↓') k.innerHTML = '<svg class="gp-hint-svg"><use href="#gp-dpad-down"></use></svg>';
            // Small variants for hints
            if (txt === 'BTN B_SHORT') k.innerHTML = '<svg class="hint-key"><use href="#gp-circle"></use></svg>';
        });
    },

    checkGPExit: function (gp) {
        // BTN B (Index 1) to exit overlay
        if (ROV.state.isControlsOpen && gp.buttons[1].pressed) {
            this.toggle(false);
        }

        // BTN Select (Index 8) to switch tabs
        if (ROV.state.isControlsOpen && gp.buttons[8].pressed && !ROV.state.debounce.tabSwitch) {
            const next = this.currentTab === 'gamepad' ? 'keyboard' : 'gamepad';
            this.switchTab(next);

            // Simple debounce for tab switch
            ROV.state.debounce.tabSwitch = true;
            setTimeout(() => ROV.state.debounce.tabSwitch = false, 300);
        }

        // START/OPTIONS (Index 9) to toggle System Menu
        const startPressed = gp.buttons[9].pressed;
        if (startPressed && !this._lastStart) {
            this.toggleMenu();
        }
        this._lastStart = startPressed;
    }
};

// Global shortcuts
window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
        // Handled in rov-input-keyboard.js
    }
    if (e.code === 'KeyM') {
        ROV.controlsUI.toggleMenu();
    }
    if (e.code === 'Tab' && ROV.state.isControlsOpen) {
        e.preventDefault();
        const next = ROV.controlsUI.currentTab === 'gamepad' ? 'keyboard' : 'gamepad';
        ROV.controlsUI.switchTab(next);
    }
});
