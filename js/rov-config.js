// Referencias al DOM
const debug = document.getElementById('debug-console'),
      mapEntity = document.getElementById('map-entity'),
      rig = document.getElementById('camera-rig'),
      cam = document.getElementById('main-camera'),
      depthText = document.getElementById('depth-val'),
      headText = document.getElementById('head-val'),
      hudToggle = document.getElementById('hud-toggle'),
      fsToggle = document.getElementById('fullscreen-toggle'),
      lightToggle = document.getElementById('light-toggle'),
      resetBtn = document.getElementById('reset-pos'),
      rovSpot = document.getElementById('rov-spot'),
      rovPoint = document.getElementById('rov-point'),
      hidableElements = document.querySelectorAll('.hidable');

// Variables de estado y configuración
let activeAction = null, currentLevelIndex = 5, lightsOn = true, isHudVisible = true;
const speedLevels = [0.1, 0.2, 0.4, 0.6, 0.8, 1.0, 1.5, 2.0, 3.0];
let baseMoveSpeed = 0.04, baseZoomSpeed = 0.8;
const baseDepth = 3895.0;
const DEADZONE = 0.15;

// Debounce para joystick
const debounce = { light: false, hud: false, reset: false, menu: false, speed: false };
