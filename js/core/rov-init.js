// rov-init.js
// Inicializa el espacio de nombres global para evitar errores de "undefined"
window.ROV = window.ROV || {};
window.ROV.refs = {};   // Aquí guardaremos referencias al DOM
window.ROV.config = {}; // Aquí irán las constantes
window.ROV.state = {};  // Aquí irá el estado mutable
window.ROV.physics = {};// Aquí irán las funciones físicas
window.ROV.actions = {};      // 
window.ROV.modelHandler = {}; //
