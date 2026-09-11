import * as THREE from './three.module.js';

// ----------------------------------------------------
// Canvas, Scene & Renderer Setup (160x160 Floating Mascot)
// ----------------------------------------------------
const PET_WIDTH = 160;
const PET_HEIGHT = 160;

const canvas = document.getElementById('pet-canvas');

const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  alpha: true,
  antialias: false,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance'
});
renderer.setSize(PET_WIDTH, PET_HEIGHT);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();

// Orthographic camera centered at (0, 0): [-80, 80] horizontal and vertical
const camera = new THREE.OrthographicCamera(
  -PET_WIDTH / 2, PET_WIDTH / 2,
  PET_HEIGHT / 2, -PET_HEIGHT / 2,
  -1000, 1000
);
camera.position.z = 500;

let screenBounds = { x: 0, y: 32, width: 1366, height: 736 };

if (window.electronAPI) {
  if (window.electronAPI.getScreenBounds) {
    window.electronAPI.getScreenBounds().then(bounds => {
      if (bounds && bounds.width && bounds.height) {
        screenBounds = bounds;
        if (!state.hasInitialPos) {
          state.screenX = Math.round(bounds.x + (bounds.width - PET_WIDTH) / 2);
          state.screenY = Math.round(bounds.y + (bounds.height - PET_HEIGHT) / 3);
          state.hasInitialPos = true;
          pickNewWaypoint();
        }
      }
    });
  }

  if (window.electronAPI.onScreenBoundsChanged) {
    window.electronAPI.onScreenBoundsChanged(bounds => {
      if (bounds && bounds.width && bounds.height) {
        screenBounds = bounds;
      }
    });
  }

  if (window.electronAPI.onPauseToggled) {
    window.electronAPI.onPauseToggled(paused => {
      state.isPaused = paused;
      if (paused) {
        state.mode = 'idle_action';
        state.vx = 0;
        state.vy = 0;
        state.action = { name: 'sleep', emoji: '💤' };
        setFaceTexture(frontTexClosed);
        state.modeTimer = 999999;
      } else {
        state.mode = 'swim';
        state.action = null;
        setFaceTexture(frontTexNormal);
        state.modeTimer = 3000;
        pickNewWaypoint();
      }
    });
  }
}

// ----------------------------------------------------
// 3D Lighting (Minecraft Isometric Day Light)
// ----------------------------------------------------
const ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.60);
dirLight.position.set(1.5, 2.5, 2.0);
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.35);
fillLight.position.set(-1.5, 1.0, 1.0);
scene.add(fillLight);

// ----------------------------------------------------
// Pixel-Art Texture Creation (16x16 Minecraft Voxel Faces)
// ----------------------------------------------------
const TEX_SIZE = 16;

function createTexture(paintFn) {
  const c = document.createElement('canvas');
  c.width = TEX_SIZE;
  c.height = TEX_SIZE;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  paintFn(ctx);

  const texture = new THREE.CanvasTexture(c);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture, canvas: c, ctx };
}

function paintBaseFace(c) {
  c.fillStyle = '#ebecef';
  c.fillRect(0, 0, 16, 16);

  c.fillStyle = '#e2e3e9';
  c.fillRect(2, 2, 2, 2);
  c.fillRect(12, 1, 2, 2);
  c.fillRect(1, 13, 2, 2);
  c.fillRect(13, 14, 2, 2);
  c.fillRect(7, 4, 2, 1);

  c.fillStyle = '#f4f5fa';
  c.fillRect(4, 1, 2, 2);
  c.fillRect(10, 3, 2, 2);
  c.fillRect(3, 10, 2, 2);

  c.fillStyle = '#c5c6d2';
  c.fillRect(0, 8, 2, 1);
  c.fillRect(0, 10, 2, 1);
  c.fillRect(14, 8, 2, 1);
  c.fillRect(14, 10, 2, 1);
}

// 1. Front Normal Face (Cute, non-scary Baby Happy Ghast)
const frontTexNormal = createTexture(c => {
  paintBaseFace(c);
  const featureColor = '#585a62';

  // Left eye: cols 2-5
  c.fillStyle = featureColor;
  c.fillRect(2, 7, 2, 1);
  c.fillRect(4, 8, 2, 1);

  // Right eye: cols 10-13
  c.fillRect(10, 8, 2, 1);
  c.fillRect(12, 7, 2, 1);

  // Cute 5-pixel smile
  c.fillRect(5, 11, 1, 1);
  c.fillRect(6, 12, 3, 1);
  c.fillRect(9, 11, 1, 1);
});

// 2. Front Closed / Sleeping Face
const frontTexClosed = createTexture(c => {
  paintBaseFace(c);
  const featureColor = '#656770';
  c.fillStyle = featureColor;
  c.fillRect(3, 8, 3, 1);
  c.fillRect(10, 8, 3, 1);
  c.fillRect(6, 12, 4, 1);
});

// 3. Front Wink / Happy Face
const frontTexWink = createTexture(c => {
  paintBaseFace(c);
  const featureColor = '#585a62';
  c.fillStyle = featureColor;
  c.fillRect(3, 8, 1, 1); c.fillRect(4, 7, 2, 1); c.fillRect(6, 8, 1, 1);
  c.fillRect(9, 8, 1, 1); c.fillRect(10, 7, 2, 1); c.fillRect(12, 8, 1, 1);
  c.fillRect(5, 11, 1, 1); c.fillRect(6, 12, 4, 1); c.fillRect(10, 11, 1, 1);
});

// 4. Front Surprised Face
const frontTexSurprised = createTexture(c => {
  paintBaseFace(c);
  const featureColor = '#585a62';
  c.fillStyle = featureColor;
  c.fillRect(3, 7, 2, 2);
  c.fillRect(11, 7, 2, 2);
  c.fillRect(7, 11, 2, 2);
});

// 5. Side Faces with Diagonal Red Ribbon Stitches
const sideTexRight = createTexture(c => {
  c.fillStyle = '#dbdce2';
  c.fillRect(0, 0, 16, 16);
  c.fillStyle = '#ced0d8';
  c.fillRect(3, 2, 3, 2);
  c.fillRect(11, 8, 2, 3);

  const redMain = '#d23838';
  const redDark = '#b32424';
  const stitches = [[10, 5], [9, 7], [8, 9], [7, 11], [6, 13]];
  for (const [sx, sy] of stitches) {
    c.fillStyle = redMain;
    c.fillRect(sx, sy, 2, 1);
    c.fillStyle = redDark;
    c.fillRect(sx, sy + 1, 2, 1);
  }
});

const sideTexLeft = createTexture(c => {
  c.fillStyle = '#dbdce2';
  c.fillRect(0, 0, 16, 16);
  c.fillStyle = '#ced0d8';
  c.fillRect(3, 2, 3, 2);
  c.fillRect(11, 8, 2, 3);

  const redMain = '#d23838';
  const redDark = '#b32424';
  const stitches = [[5, 5], [6, 7], [7, 9], [8, 11], [9, 13]];
  for (const [sx, sy] of stitches) {
    c.fillStyle = redMain;
    c.fillRect(sx, sy, 2, 1);
    c.fillStyle = redDark;
    c.fillRect(sx, sy + 1, 2, 1);
  }
});

// 6. Top Face with Pastel Pink Streaks
const topTex = createTexture(c => {
  c.fillStyle = '#f8f8fc';
  c.fillRect(0, 0, 16, 16);
  c.fillStyle = '#ffffff';
  c.fillRect(2, 2, 4, 3);
  c.fillRect(10, 10, 4, 3);

  c.fillStyle = '#eedfe5';
  c.fillRect(5, 3, 3, 2);
  c.fillRect(7, 6, 4, 2);
  c.fillRect(9, 9, 3, 2);
});

// 7. Bottom & Back Faces
const bottomTex = createTexture(c => {
  c.fillStyle = '#b7b8c2';
  c.fillRect(0, 0, 16, 16);
  c.fillStyle = '#aaabb5';
  c.fillRect(2, 2, 4, 4);
});

const backTex = createTexture(c => {
  c.fillStyle = '#dbdce2';
  c.fillRect(0, 0, 16, 16);
  c.fillStyle = '#cbccd4';
  c.fillRect(4, 4, 3, 3);
});

// Tentacle texture
const tentacleTex = createTexture(c => {
  c.fillStyle = '#d2d3dc';
  c.fillRect(0, 0, 16, 16);
  c.fillStyle = '#c3c4ce';
  c.fillRect(0, 8, 16, 8);
});

// ----------------------------------------------------
// 3D Model Construction (Real Minecraft Voxel Meshes)
// ----------------------------------------------------
const ghastGroup = new THREE.Group();
scene.add(ghastGroup);

// Cube Body (44 x 44 x 44 pixels)
const BODY_SIZE = 44;
const bodyGeometry = new THREE.BoxGeometry(BODY_SIZE, BODY_SIZE, BODY_SIZE);

// Materials for 6 box faces: +X, -X, +Y, -Y, +Z, -Z
const bodyMaterials = [
  new THREE.MeshLambertMaterial({ map: sideTexRight.texture }),  // Right (+X)
  new THREE.MeshLambertMaterial({ map: sideTexLeft.texture }),   // Left (-X)
  new THREE.MeshLambertMaterial({ map: topTex.texture }),        // Top (+Y)
  new THREE.MeshLambertMaterial({ map: bottomTex.texture }),     // Bottom (-Y)
  new THREE.MeshLambertMaterial({ map: frontTexNormal.texture }),// Front (+Z)
  new THREE.MeshLambertMaterial({ map: backTex.texture })        // Back (-Z)
];

const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterials);
ghastGroup.add(bodyMesh);

function setFaceTexture(texObj) {
  bodyMaterials[4].map = texObj.texture;
  bodyMaterials[4].needsUpdate = true;
}

// 6 Real 3D Tentacles Attached Beneath the Body
const TENTACLE_CONFIGS = [
  { x: -12, z:  10, w: 4.8, len: 12 }, // Front-left
  { x:  12, z:  10, w: 4.8, len: 12 }, // Front-right
  { x: -12, z: -10, w: 4.8, len: 13 }, // Back-left
  { x:  12, z: -10, w: 4.8, len: 13 }, // Back-right
  { x:  -3, z:   0, w: 5.2, len: 14 }, // Center-left
  { x:   3, z:   0, w: 5.2, len: 14 }  // Center-right
];

const tentacleMaterial = new THREE.MeshLambertMaterial({ map: tentacleTex.texture });

const tentaclePivots = TENTACLE_CONFIGS.map(cfg => {
  const pivot = new THREE.Group();
  pivot.position.set(cfg.x, -BODY_SIZE / 2, cfg.z);

  const geom = new THREE.BoxGeometry(cfg.w, cfg.len, cfg.w);
  const mesh = new THREE.Mesh(geom, tentacleMaterial);
  mesh.position.set(0, -cfg.len / 2, 0);
  pivot.add(mesh);

  ghastGroup.add(pivot);
  return { pivot, len: cfg.len };
});

// ----------------------------------------------------
// State Management (Floating Desktop Mascot)
// ----------------------------------------------------
const state = {
  hasInitialPos: false,
  screenX: 400,
  screenY: 250,
  vx: 1.8,
  vy: 0.2,
  targetX: 600,
  targetY: 250,

  // 3D Angles: Isometric view (top and front visible)
  baseYaw: 0.55,
  basePitch: 0.32,
  yaw: 0.55,
  pitch: 0.32,
  roll: 0,
  targetYaw: 0.55,
  targetPitch: 0.32,
  targetRoll: 0,

  // Facing (1 = right, -1 = left)
  facing: 1,

  // Fish swimming cycles
  swimCycle: 0,
  pulseTimer: 0,

  // Modes: swim | hover | dart | happy | dragging | thrown | idle_action
  mode: 'swim',
  modeTimer: 3500,
  action: null,
  isPaused: false,

  // Blinking
  blinkTimer: 3000,
  isBlinking: false,

  // Petting interaction
  petRubDist: 0,
  petRubTimer: 0,

  // 360 Loop animation
  rollAnim: 0
};

// ----------------------------------------------------
// Mouse / Catching / Dragging
// ----------------------------------------------------
function startDrag(clientX, clientY) {
  state.mode = 'dragging';
  state.action = null;
  setFaceTexture(frontTexSurprised);
  state.vx = 0;
  state.vy = 0;
  canvas.classList.add('grabbing');
  document.body.style.cursor = 'grabbing';

  if (window.electronAPI && window.electronAPI.startDrag) {
    window.electronAPI.startDrag(clientX, clientY);
  }
  return true;
}

function endDrag() {
  if (state.mode !== 'dragging') return;
  canvas.classList.remove('grabbing');
  document.body.style.cursor = 'default';

  if (window.electronAPI && window.electronAPI.endDrag) {
    window.electronAPI.endDrag();
  }

  const speed = Math.hypot(state.vx, state.vy);
  if (speed > 4.0) {
    state.mode = 'thrown';
    setFaceTexture(frontTexSurprised);
    state.modeTimer = 1800;
  } else {
    state.mode = 'swim';
    setFaceTexture(frontTexNormal);
    state.modeTimer = 3000 + Math.random() * 2000;
    pickNewWaypoint();
  }
}

function onPointerDown(e) {
  if (e.button !== 0) return; // Left mouse click only
  try {
    canvas.setPointerCapture(e.pointerId);
  } catch {}
  startDrag(e.clientX, e.clientY);
  e.preventDefault();
  e.stopPropagation();
}

canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('lostpointercapture', endDrag);
window.addEventListener('pointerup', endDrag);
window.addEventListener('blur', endDrag);

// Petting interaction on mouse movement over pet
canvas.addEventListener('pointermove', (e) => {
  if (state.mode !== 'dragging') {
    const d = Math.hypot(e.movementX || 0, e.movementY || 0);
    if (d > 2 && d < 60) {
      state.petRubDist += d;
      state.petRubTimer = 1000;
      if (state.petRubDist > 65 && state.mode !== 'happy') {
        state.mode = 'happy';
        setFaceTexture(frontTexWink);
        state.action = null;
        state.modeTimer = 2200;
        state.rollAnim = Math.PI * 2;
        state.petRubDist = 0;
      }
    }
  }
});

// Receive OS-level drag updates from main process
if (window.electronAPI && window.electronAPI.onDragUpdate) {
  window.electronAPI.onDragUpdate(({ screenX, screenY, vx, vy }) => {
    state.screenX = screenX;
    state.screenY = screenY;
    state.vx = vx;
    state.vy = vy;

    // Fluid 3D tilt while being carried
    if (vx > 0.5) {
      state.facing = 1;
      state.targetYaw = 0.65;
    } else if (vx < -0.5) {
      state.facing = -1;
      state.targetYaw = -0.65;
    }

    state.targetPitch = state.basePitch + Math.max(-0.35, Math.min(0.35, -vy * 0.05 * state.facing));
    state.targetRoll = Math.max(-0.30, Math.min(0.30, vx * 0.05));
  });
}

// ----------------------------------------------------
// Navigation & Behavior
// ----------------------------------------------------
function pickNewWaypoint() {
  const pad = 60;
  const minX = screenBounds.x + pad;
  const maxX = Math.max(minX + 50, screenBounds.x + screenBounds.width - PET_WIDTH - pad);
  const minY = screenBounds.y + pad;
  const maxY = Math.max(minY + 50, screenBounds.y + screenBounds.height - PET_HEIGHT - pad);

  state.targetX = minX + Math.random() * (maxX - minX);
  state.targetY = minY + Math.random() * (maxY - minY);

  const dist = Math.hypot(state.targetX - state.screenX, state.targetY - state.screenY);
  if (dist < 200) {
    state.targetX = (state.screenX < (minX + maxX) / 2)
      ? maxX - Math.random() * 150
      : minX + Math.random() * 150;
  }
}

function pickNewBehavior() {
  if (state.isPaused) {
    state.mode = 'idle_action';
    state.action = { name: 'sleep', emoji: '💤' };
    setFaceTexture(frontTexClosed);
    state.modeTimer = 999999;
    return;
  }

  const r = Math.random();
  if (r < 0.50) {
    state.mode = 'swim';
    state.action = null;
    setFaceTexture(frontTexNormal);
    state.modeTimer = 3000 + Math.random() * 3500;
    pickNewWaypoint();
  } else if (r < 0.70) {
    state.mode = 'hover';
    state.action = null;
    setFaceTexture(Math.random() < 0.25 ? frontTexClosed : frontTexNormal);
    state.modeTimer = 2200 + Math.random() * 2000;
    state.vx *= 0.3;
    state.vy *= 0.3;
  } else if (r < 0.85) {
    state.mode = 'dart';
    state.action = null;
    setFaceTexture(frontTexSurprised);
    state.modeTimer = 1300 + Math.random() * 700;
    pickNewWaypoint();
  } else {
    state.mode = 'idle_action';
    const acts = [
      { name: 'wave', emoji: '👋', bubble: 'Squeak!' },
      { name: 'idea', emoji: '💡' },
      { name: 'energize', emoji: '☕' },
      { name: 'music', emoji: '🎶' },
      { name: 'heart', emoji: '💖' },
      { name: 'sleep', emoji: '💤' }
    ];
    state.action = acts[Math.floor(Math.random() * acts.length)];
    setFaceTexture(state.action.name === 'sleep' ? frontTexClosed : frontTexNormal);
    state.modeTimer = 2200 + Math.random() * 1600;
    state.vx *= 0.2;
    state.vy *= 0.2;
  }
}

// ----------------------------------------------------
// Physics & Animation Loop
// ----------------------------------------------------
function update(dt) {
  state.swimCycle += dt * 0.0035;

  // Natural eye blink
  state.blinkTimer -= dt;
  if (state.blinkTimer <= 0) {
    state.isBlinking = true;
    setFaceTexture(frontTexClosed);
    if (state.blinkTimer <= -140) {
      state.isBlinking = false;
      setFaceTexture(frontTexNormal);
      state.blinkTimer = 3000 + Math.random() * 4000;
    }
  }

  // Propulsion pulses
  state.pulseTimer += dt;
  let pulseStrength = 1.0;
  if (state.mode === 'swim') {
    const pulsePhase = (state.pulseTimer % 1200) / 1200;
    pulseStrength = Math.sin(pulsePhase * Math.PI);
  } else if (state.mode === 'dart') {
    pulseStrength = 2.4;
  }

  switch (state.mode) {
    case 'swim':
    case 'dart': {
      const dx = state.targetX - state.screenX;
      const dy = state.targetY - state.screenY;
      const dist = Math.hypot(dx, dy);

      if (dist < 45) pickNewWaypoint();

      const targetAngle = Math.atan2(dy, dx);
      const currentAngle = Math.atan2(state.vy, state.vx);
      let angleDiff = targetAngle - currentAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      const steer = angleDiff * 0.06;
      const newAngle = currentAngle + steer;

      const accel = (0.09 + 0.09 * pulseStrength) * (state.mode === 'dart' ? 1.8 : 1.0);
      state.vx += Math.cos(newAngle) * accel;
      state.vy += Math.sin(newAngle) * accel;

      const drag = 0.94;
      state.vx *= drag;
      state.vy *= drag;

      state.screenX += state.vx;
      state.screenY += state.vy;

      // 3D Direction & Rotation:
      if (state.vx >= 0.15) {
        state.facing = 1;
        state.targetYaw = 0.55 + Math.min(0.3, state.vx * 0.08);
      } else if (state.vx <= -0.15) {
        state.facing = -1;
        state.targetYaw = -0.55 + Math.max(-0.3, state.vx * 0.08);
      }

      state.targetPitch = state.basePitch + Math.max(-0.25, Math.min(0.25, -state.vy * 0.08 * state.facing));
      state.targetRoll = Math.max(-0.25, Math.min(0.25, steer * 6.0));

      state.modeTimer -= dt;
      if (state.modeTimer <= 0) pickNewBehavior();
      break;
    }

    case 'hover':
    case 'idle_action': {
      state.vx *= 0.88;
      state.vy *= 0.88;
      state.screenX += state.vx;
      state.screenY += state.vy;

      state.screenY += Math.sin(state.swimCycle * 2.5) * 0.4;

      state.targetYaw = state.facing * 0.55;
      state.targetPitch = state.basePitch;
      state.targetRoll = Math.sin(state.swimCycle) * 0.04;

      state.modeTimer -= dt;
      if (state.modeTimer <= 0) pickNewBehavior();
      break;
    }

    case 'happy': {
      state.vx *= 0.88;
      state.vy *= 0.88;
      state.screenX += state.vx;
      state.screenY += state.vy - 0.35;

      if (state.rollAnim > 0) {
        state.rollAnim -= dt * 0.007;
        state.roll = (Math.PI * 2 - state.rollAnim);
      } else {
        state.roll = 0;
      }

      state.modeTimer -= dt;
      if (state.modeTimer <= 0) {
        state.mode = 'swim';
        setFaceTexture(frontTexNormal);
        pickNewWaypoint();
      }
      break;
    }

    case 'thrown': {
      state.screenX += state.vx;
      state.screenY += state.vy;
      state.vx *= 0.93;
      state.vy *= 0.93;
      state.roll += state.vx * 0.03;

      const spd = Math.hypot(state.vx, state.vy);
      if (spd < 0.6) {
        state.mode = 'hover';
        setFaceTexture(frontTexNormal);
        state.modeTimer = 1600;
        state.roll = 0;
      }
      break;
    }

    case 'dragging': {
      // Direct OS drag updates handled in onDragUpdate
      break;
    }
  }

  // Smooth angle interpolation
  if (state.mode !== 'happy' && state.mode !== 'thrown') {
    state.yaw += (state.targetYaw - state.yaw) * 0.10;
    state.pitch += (state.targetPitch - state.pitch) * 0.10;
    state.roll += (state.targetRoll - state.roll) * 0.10;
  }

  // Screen edge boundary bounce & window positioning
  const minX = screenBounds.x;
  const maxX = screenBounds.x + screenBounds.width - PET_WIDTH;
  const minY = screenBounds.y;
  const maxY = screenBounds.y + screenBounds.height - PET_HEIGHT;

  if (state.mode !== 'dragging') {
    if (state.screenX < minX) {
      state.screenX = minX;
      state.vx = Math.abs(state.vx) * 0.8 + 0.8;
      pickNewWaypoint();
    } else if (state.screenX > maxX) {
      state.screenX = maxX;
      state.vx = -Math.abs(state.vx) * 0.8 - 0.8;
      pickNewWaypoint();
    }

    if (state.screenY < minY) {
      state.screenY = minY;
      state.vy = Math.abs(state.vy) * 0.8 + 0.6;
      pickNewWaypoint();
    } else if (state.screenY > maxY) {
      state.screenY = maxY;
      state.vy = -Math.abs(state.vy) * 0.8 - 0.6;
      pickNewWaypoint();
    }

    if (window.electronAPI && window.electronAPI.setWindowPos) {
      window.electronAPI.setWindowPos(state.screenX, state.screenY);
    }
  }

  // ----------------------------------------------------
  // Update 3D Group Transformation
  // In our centered Orthographic camera:
  // Center is (0, 0, 0), slight Y offset of +5 to center body + tentacles
  // ----------------------------------------------------
  ghastGroup.position.set(0, 5, 0);
  ghastGroup.rotation.set(state.pitch, state.yaw, state.roll);

  // Gentle breathing squash & stretch
  const pulsePhase = (state.pulseTimer % 1200) / 1200;
  const pulseS = Math.sin(pulsePhase * Math.PI);
  const sx = 1.0 + (state.mode === 'swim' ? pulseS * 0.04 : 0);
  const sy = 1.0 - (state.mode === 'swim' ? pulseS * 0.04 : 0);
  ghastGroup.scale.set(sx, sy, 1.0);

  // ----------------------------------------------------
  // Update Real 3D Tentacle Physics
  // ----------------------------------------------------
  tentaclePivots.forEach((t, idx) => {
    const wave = Math.sin(state.swimCycle * 2.2 + idx * 0.8) * 0.15;
    const dragX = Math.max(-0.6, Math.min(0.6, state.vx * 0.12 * state.facing));
    const dragZ = Math.max(-0.6, Math.min(0.6, -state.vy * 0.10));

    t.pivot.rotation.z = -dragX + wave * 0.5;
    t.pivot.rotation.x = dragZ + wave;
  });
}

// ----------------------------------------------------
// Main Render Loop
// ----------------------------------------------------
let lastTime = performance.now();

function loop(time) {
  const dt = Math.min(60, time - lastTime);
  lastTime = time;

  update(dt);
  renderer.render(scene, camera);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

pickNewWaypoint();
