'use strict';

// ─────────────────────────── Shaders ────────────────────────────────────────
const VSHADER = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotation;
  void main() {
    gl_Position = u_GlobalRotation * u_ModelMatrix * a_Position;
  }
`;
const FSHADER = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }
`;

// ─────────────────────────── Colors (fox palette) ───────────────────────────
const FOX_ORANGE  = [0.90, 0.45, 0.10, 1.0];
const FOX_LIGHT   = [1.00, 0.65, 0.25, 1.0];
const FOX_CREAM   = [0.95, 0.88, 0.75, 1.0];
const FOX_DARK    = [0.12, 0.08, 0.05, 1.0];
const FOX_DKORG   = [0.70, 0.28, 0.04, 1.0];
const WHITE       = [1.00, 1.00, 1.00, 1.0];

// ─────────────────────────── WebGL globals ───────────────────────────────────
let gl, canvas;
let a_Position, u_ModelMatrix, u_GlobalRotation, u_FragColor;

// ─────────────────────────── Scene state ─────────────────────────────────────
let g_globalAngleX = -15;
let g_globalAngleY =  25;

// Front-left leg chain (sliders + animation)
let g_frontUpperAngle = 0;
let g_frontLowerAngle = 0;
let g_frontFootAngle  = 0;

// Front-right leg chain
let g_frontRUpperAngle = 0;
let g_frontRLowerAngle = 0;
let g_frontRFootAngle  = 0;

// Back-left leg chain
let g_backUpperAngle  = 0;
let g_backLowerAngle  = 0;
let g_backFootAngle   = 0;

// Back-right leg chain
let g_backRUpperAngle = 0;
let g_backRLowerAngle = 0;
let g_backRFootAngle  = 0;

// Tail
let g_tailAngle = 30;

// Animation
let g_animating    = false;
let g_startTime    = 0;
let g_time         = 0;
let g_lastTickTime = 0;
let g_fps          = 0;

// Poke
let g_poking       = false;
let g_pokeStart    = 0;

// ─────────────────────────── Entry point ─────────────────────────────────────
function main() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { antialias: true });
  if (!gl) { alert('WebGL not supported'); return; }

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.12, 0.12, 0.16, 1.0);

  // Compile shaders
  const vs = compileShader(gl.VERTEX_SHADER,   VSHADER);
  const fs = compileShader(gl.FRAGMENT_SHADER, FSHADER);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(prog)); return;
  }
  gl.useProgram(prog);

  // Attribute / uniform locations
  a_Position       = gl.getAttribLocation(prog,  'a_Position');
  u_ModelMatrix    = gl.getUniformLocation(prog, 'u_ModelMatrix');
  u_GlobalRotation = gl.getUniformLocation(prog, 'u_GlobalRotation');
  u_FragColor      = gl.getUniformLocation(prog, 'u_FragColor');

  // Upload identity as default model matrix
  gl.uniformMatrix4fv(u_ModelMatrix, false, new Matrix4().elements);

  // Allocate primitive buffers once
  initPrimitiveBuffers();

  setupEventHandlers();
  renderScene();
}

function compileShader(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    console.error(gl.getShaderInfoLog(s));
  return s;
}

// ─────────────────────────── Event handlers ──────────────────────────────────
function setupEventHandlers() {
  // Sliders — global rotation
  document.getElementById('sl-angleX').addEventListener('input', e => {
    g_globalAngleX = +e.target.value;
    renderScene();
  });
  document.getElementById('sl-angleY').addEventListener('input', e => {
    g_globalAngleY = +e.target.value;
    renderScene();
  });

  // Sliders — front legs (both left and right move together)
  document.getElementById('sl-frontUpper').addEventListener('input', e => {
    g_frontUpperAngle = g_frontRUpperAngle = +e.target.value;
    renderScene();
  });
  document.getElementById('sl-frontLower').addEventListener('input', e => {
    g_frontLowerAngle = g_frontRLowerAngle = +e.target.value;
    renderScene();
  });
  document.getElementById('sl-frontFoot').addEventListener('input', e => {
    g_frontFootAngle = g_frontRFootAngle = +e.target.value;
    renderScene();
  });

  // Sliders — back legs (both left and right move together)
  document.getElementById('sl-backUpper').addEventListener('input', e => {
    g_backUpperAngle = g_backRUpperAngle = +e.target.value;
    renderScene();
  });
  document.getElementById('sl-backLower').addEventListener('input', e => {
    g_backLowerAngle = g_backRLowerAngle = +e.target.value;
    renderScene();
  });
  document.getElementById('sl-backFoot').addEventListener('input', e => {
    g_backFootAngle = g_backRFootAngle = +e.target.value;
    renderScene();
  });

  // Slider — tail
  document.getElementById('sl-tail').addEventListener('input', e => {
    g_tailAngle = +e.target.value;
    renderScene();
  });

  // Animation buttons
  document.getElementById('btn-start').addEventListener('click', () => {
    if (!g_animating) {
      g_animating = true;
      g_startTime = performance.now() / 1000;
      g_lastTickTime = g_startTime;
      tick();
    }
  });
  document.getElementById('btn-stop').addEventListener('click', () => {
    g_animating = false;
    g_poking = false;
  });

  // Mouse drag → rotate
  let dragging = false;
  canvas.addEventListener('mousedown', e => {
    if (e.shiftKey) { triggerPoke(); return; }
    dragging = true;
  });
  canvas.addEventListener('mouseup',   () => { dragging = false; });
  canvas.addEventListener('mouseleave',() => { dragging = false; });
  canvas.addEventListener('mousemove', e => {
    if (!dragging || e.shiftKey) return;
    g_globalAngleY += e.movementX * 0.5;
    g_globalAngleX -= e.movementY * 0.5;
    renderScene();
  });
}

// ─────────────────────────── Animation loop ──────────────────────────────────
function tick() {
  if (!g_animating && !g_poking) return;

  const now = performance.now() / 1000;
  const dt  = now - g_lastTickTime;
  if (dt > 0) g_fps = Math.round(0.9 * g_fps + 0.1 * (1 / dt));
  g_lastTickTime = now;
  g_time = now - g_startTime;

  document.getElementById('fps').textContent = g_fps;

  updateAnimationAngles();
  renderScene();
  requestAnimationFrame(tick);
}

function updateAnimationAngles() {
  if (g_poking) {
    const t = performance.now() / 1000 - g_pokeStart;
    // Tail wags fast, back legs crouch
    g_tailAngle          =  45 * Math.sin(t * 14);
    g_backUpperAngle     = -25 * Math.abs(Math.sin(t * 3));
    g_backRUpperAngle    = -25 * Math.abs(Math.sin(t * 3));
    g_backLowerAngle     =  30 * Math.abs(Math.sin(t * 3));
    g_backRLowerAngle    =  30 * Math.abs(Math.sin(t * 3));
    if (t > 2.0) {
      g_poking = false;
      // Reset to resting if not in normal animation
      if (!g_animating) {
        g_tailAngle = 30;
        g_backUpperAngle = g_backRUpperAngle = 0;
        g_backLowerAngle = g_backRLowerAngle = 0;
      }
    }
    return;
  }

  // Walk cycle — front/back alternate, left/right out of phase by 180°
  const s = Math.sin(g_time * 3.5);
  const sR = Math.sin(g_time * 3.5 + Math.PI);

  g_frontUpperAngle  =  28 * s;
  g_frontLowerAngle  =  18 * Math.max(0, -s);
  g_frontFootAngle   =   8 * s;

  g_frontRUpperAngle =  28 * sR;
  g_frontRLowerAngle =  18 * Math.max(0, -sR);
  g_frontRFootAngle  =   8 * sR;

  g_backUpperAngle   =  28 * sR;
  g_backLowerAngle   =  18 * Math.max(0, -sR);
  g_backFootAngle    =   8 * sR;

  g_backRUpperAngle  =  28 * s;
  g_backRLowerAngle  =  18 * Math.max(0, -s);
  g_backRFootAngle   =   8 * s;

  g_tailAngle = 20 * Math.sin(g_time * 2.5) + 20;
}

function triggerPoke() {
  g_poking    = true;
  g_pokeStart = performance.now() / 1000;
  if (!g_animating) {
    g_startTime    = g_pokeStart;
    g_lastTickTime = g_pokeStart;
    tick();
  }
}

// ─────────────────────────── Scene rendering ─────────────────────────────────
function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // ── Global rotation (passed explicitly to vertex shader) ──
  const G = new Matrix4();
  G.rotate(g_globalAngleX, 1, 0, 0);
  G.rotate(g_globalAngleY, 0, 1, 0);
  G.scale(0.75, 0.75, 0.75);   // shrink 25% so fox fits comfortably on screen
  gl.uniformMatrix4fv(u_GlobalRotation, false, G.elements);

  drawFox();
}

// ─────────────────────────── Fox body ────────────────────────────────────────
function drawFox() {
  // All coordinates are in a local fox space where the body spans roughly
  // (-0.6..+0.6) in X, (0..0.8) in Y, (-0.9..+0.9) in Z.
  // Y=0 is the belly, +Y is up.

  // ── BODY ──
  let M = mat().translate(-0.6, 0, -0.9).scale(1.2, 0.7, 1.8);
  drawCube(M, FOX_ORANGE);

  // ── HEAD ──
  // headBase: the local origin for all head parts (no scale here)
  const headBase = mat().translate(-0.35, 0.55, -1.05);

  drawCube(clone(headBase).scale(0.7, 0.65, 0.7), FOX_ORANGE);

  // Muzzle — cream protrusion off front face of head (negative z = outward)
  drawCube(clone(headBase).translate(0.1, 0.02, -0.20).scale(0.5, 0.35, 0.28), FOX_CREAM);

  // Nose tip (dark) — at the very front of the muzzle
  drawCube(clone(headBase).translate(0.22, 0.23, -0.26).scale(0.26, 0.18, 0.12), FOX_DARK);

  // Left ear — orange block, dark inner marking on its front face (-Z side)
  drawCube(clone(headBase).translate(0.0, 0.62, 0.28).scale(0.22, 0.32, 0.14), FOX_ORANGE);
  drawCube(clone(headBase).translate(0.04, 0.66, 0.22).scale(0.14, 0.22, 0.04), FOX_DARK);

  // Right ear
  drawCube(clone(headBase).translate(0.48, 0.62, 0.28).scale(0.22, 0.32, 0.14), FOX_ORANGE);
  drawCube(clone(headBase).translate(0.52, 0.66, 0.22).scale(0.14, 0.22, 0.04), FOX_DARK);

  // ── TAIL ──
  // tailBase pivots from rear of body
  const tailBase = mat().translate(0, 0.35, 0.9)
                        .rotate(g_tailAngle, 1, 0, 0)
                        .translate(0, 0, 0);

  drawCube(clone(tailBase).translate(-0.15, -0.1, 0).scale(0.3, 0.3, 0.7), FOX_DKORG);

  // Tail tip — white cylinder, axis rotated 90° so it extends in +Z (same as tail)
  // translate centers it on the tail's XY cross-section at z=0.7 (tail end)
  const tailTipBase = clone(tailBase)
    .translate(-0.15, 0.20, 0.7)
    .rotate(90, 1, 0, 0);
  drawCylinder(clone(tailTipBase).scale(0.3, 0.5, 0.3), WHITE);

  // ── LEGS (4 chains, each 3 levels deep) ──
  drawLegChain(
    -0.5, 0, -0.55,   // attach: front-left
    g_frontUpperAngle, g_frontLowerAngle, g_frontFootAngle,
    FOX_ORANGE, FOX_DKORG, FOX_DARK
  );
  drawLegChain(
    0.2, 0, -0.55,    // attach: front-right
    g_frontRUpperAngle, g_frontRLowerAngle, g_frontRFootAngle,
    FOX_ORANGE, FOX_DKORG, FOX_DARK
  );
  drawLegChain(
    -0.5, 0, 0.55,    // attach: back-left
    g_backUpperAngle, g_backLowerAngle, g_backFootAngle,
    FOX_ORANGE, FOX_DKORG, FOX_DARK
  );
  drawLegChain(
    0.2, 0, 0.55,     // attach: back-right
    g_backRUpperAngle, g_backRLowerAngle, g_backRFootAngle,
    FOX_ORANGE, FOX_DKORG, FOX_DARK
  );
}

// Draws one 3-level leg chain: upper thigh → lower calf → foot
// Critical pattern: each child's base starts from parent's BASE (no scale),
// then translates by the parent's unscaled segment length.
function drawLegChain(ax, ay, az, upperAng, lowerAng, footAng, colUpper, colLower, colFoot) {
  const UPPER_H = 0.42;
  const LOWER_H = 0.38;
  const UPPER_W = 0.18;
  const LOWER_W = 0.14;

  // ── Upper leg ──
  const upperBase = mat()
    .translate(ax, ay, az)
    .rotate(upperAng, 1, 0, 0);

  drawCube(clone(upperBase).translate(-UPPER_W / 2, -UPPER_H, -UPPER_W / 2)
                            .scale(UPPER_W, UPPER_H, UPPER_W), colUpper);

  // ── Lower leg — pivot at bottom of upper ──
  const lowerBase = clone(upperBase)
    .translate(0, -UPPER_H, 0)
    .rotate(lowerAng, 1, 0, 0);

  drawCube(clone(lowerBase).translate(-LOWER_W / 2, -LOWER_H, -LOWER_W / 2)
                            .scale(LOWER_W, LOWER_H, LOWER_W), colLower);

  // ── Foot — pivot at bottom of lower ──
  const footBase = clone(lowerBase)
    .translate(0, -LOWER_H, 0)
    .rotate(footAng, 1, 0, 0);

  // Foot extends in -Z direction (forward, same direction the fox faces)
  drawCube(clone(footBase).translate(-0.12, -0.08, -0.28)
                           .scale(0.24, 0.08, 0.3), colFoot);
}

// ─────────────────────────── Matrix helpers ───────────────────────────────────
// mat() returns a fresh Matrix4 identity — shorter than typing 'new Matrix4()'
function mat() { return new Matrix4(); }

// clone returns a Matrix4 copy; we chain transforms off it without polluting the original
function clone(m) { return new Matrix4(m); }
