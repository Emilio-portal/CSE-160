'use strict';

var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotation;
  void main() {
    gl_Position = u_GlobalRotation * u_ModelMatrix * a_Position;
  }
`;

var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }
`;

// fox color palette
var FOX_ORANGE = [0.90, 0.45, 0.10, 1.0];
var FOX_LIGHT  = [1.00, 0.65, 0.25, 1.0];
var FOX_CREAM  = [0.95, 0.88, 0.75, 1.0];
var FOX_DARK   = [0.12, 0.08, 0.05, 1.0];
var FOX_DKORG  = [0.70, 0.28, 0.04, 1.0];
var WHITE      = [1.00, 1.00, 1.00, 1.0];

var gl, canvas;
var a_Position, u_ModelMatrix, u_GlobalRotation, u_FragColor;

// global rotation
var g_globalAngleX = -15;
var g_globalAngleY =  25;

// front legs (left + right share same angle for slider control)
var g_frontUpperAngle  = 0;
var g_frontLowerAngle  = 0;
var g_frontFootAngle   = 0;
var g_frontRUpperAngle = 0;
var g_frontRLowerAngle = 0;
var g_frontRFootAngle  = 0;

// back legs
var g_backUpperAngle  = 0;
var g_backLowerAngle  = 0;
var g_backFootAngle   = 0;
var g_backRUpperAngle = 0;
var g_backRLowerAngle = 0;
var g_backRFootAngle  = 0;

// tail
var g_tailAngle = 30;

// animation state
var g_animating    = false;
var g_startTime    = 0;
var g_time         = 0;
var g_lastTickTime = 0;
var g_fps          = 0;

// poke animation
var g_poking    = false;
var g_pokeStart = 0;

function main() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { antialias: true });
  if (!gl) { alert('WebGL not supported'); return; }

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.53, 0.81, 0.98, 1.0); // sky blue background

  var vs = compileShader(gl.VERTEX_SHADER,   VSHADER_SOURCE);
  var fs = compileShader(gl.FRAGMENT_SHADER, FSHADER_SOURCE);
  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  a_Position       = gl.getAttribLocation(prog,  'a_Position');
  u_ModelMatrix    = gl.getUniformLocation(prog, 'u_ModelMatrix');
  u_GlobalRotation = gl.getUniformLocation(prog, 'u_GlobalRotation');
  u_FragColor      = gl.getUniformLocation(prog, 'u_FragColor');

  gl.uniformMatrix4fv(u_ModelMatrix, false, new Matrix4().elements);

  initPrimitiveBuffers();
  setupEventHandlers();
  renderScene();
}

function compileShader(type, src) {
  var s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    console.error(gl.getShaderInfoLog(s));
  return s;
}

function setupEventHandlers() {
  // global rotation sliders
  document.getElementById('sl-angleX').addEventListener('input', function(e) {
    g_globalAngleX = +e.target.value; renderScene();
  });
  document.getElementById('sl-angleY').addEventListener('input', function(e) {
    g_globalAngleY = +e.target.value; renderScene();
  });

  // front leg sliders - both legs move together
  document.getElementById('sl-frontUpper').addEventListener('input', function(e) {
    g_frontUpperAngle = g_frontRUpperAngle = +e.target.value; renderScene();
  });
  document.getElementById('sl-frontLower').addEventListener('input', function(e) {
    g_frontLowerAngle = g_frontRLowerAngle = +e.target.value; renderScene();
  });
  document.getElementById('sl-frontFoot').addEventListener('input', function(e) {
    g_frontFootAngle = g_frontRFootAngle = +e.target.value; renderScene();
  });

  // back leg sliders
  document.getElementById('sl-backUpper').addEventListener('input', function(e) {
    g_backUpperAngle = g_backRUpperAngle = +e.target.value; renderScene();
  });
  document.getElementById('sl-backLower').addEventListener('input', function(e) {
    g_backLowerAngle = g_backRLowerAngle = +e.target.value; renderScene();
  });
  document.getElementById('sl-backFoot').addEventListener('input', function(e) {
    g_backFootAngle = g_backRFootAngle = +e.target.value; renderScene();
  });

  // tail slider
  document.getElementById('sl-tail').addEventListener('input', function(e) {
    g_tailAngle = +e.target.value; renderScene();
  });

  // animation buttons
  document.getElementById('btn-start').addEventListener('click', function() {
    if (!g_animating) {
      g_animating    = true;
      g_startTime    = performance.now() / 1000;
      g_lastTickTime = g_startTime;
      tick();
    }
  });
  document.getElementById('btn-stop').addEventListener('click', function() {
    g_animating = false;
    g_poking    = false;
  });

  // mouse drag to rotate
  var dragging = false;
  canvas.addEventListener('mousedown', function(e) {
    if (e.shiftKey) { triggerPoke(); return; }
    dragging = true;
  });
  canvas.addEventListener('mouseup',    function() { dragging = false; });
  canvas.addEventListener('mouseleave', function() { dragging = false; });
  canvas.addEventListener('mousemove',  function(e) {
    if (!dragging || e.shiftKey) return;
    g_globalAngleY += e.movementX * 0.5;
    g_globalAngleX -= e.movementY * 0.5;
    renderScene();
  });
}

// animation loop
function tick() {
  if (!g_animating && !g_poking) return;

  var now = performance.now() / 1000;
  var dt  = now - g_lastTickTime;
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
    var t = performance.now() / 1000 - g_pokeStart;
    // poke: tail wags fast, back legs crouch
    g_tailAngle       =  45 * Math.sin(t * 14);
    g_backUpperAngle  = g_backRUpperAngle  = -25 * Math.abs(Math.sin(t * 3));
    g_backLowerAngle  = g_backRLowerAngle  =  30 * Math.abs(Math.sin(t * 3));
    if (t > 2.0) {
      g_poking = false;
      if (!g_animating) {
        g_tailAngle = 30;
        g_backUpperAngle = g_backRUpperAngle = 0;
        g_backLowerAngle = g_backRLowerAngle = 0;
      }
    }
    return;
  }

  // walk cycle - front/back legs alternate, left/right legs opposite phase
  var s  = Math.sin(g_time * 3.5);
  var sR = Math.sin(g_time * 3.5 + Math.PI);

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
    g_startTime = g_lastTickTime = g_pokeStart;
    tick();
  }
}

function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // build global rotation matrix and pass to shader
  var G = new Matrix4();
  G.rotate(g_globalAngleX, 1, 0, 0);
  G.rotate(g_globalAngleY, 0, 1, 0);
  G.scale(0.67, 0.67, 0.67);
  gl.uniformMatrix4fv(u_GlobalRotation, false, G.elements);

  drawFox();
}

function drawFox() {
  var GY = -0.9; // ground level (bottom of feet)

  // ground plane - large and deep so no gaps or see-through from any angle
  drawCube(mat().translate(-20, GY - 2.0, -20).scale(40, 2.0, 40), [0.22, 0.55, 0.12, 1.0]);

  // blob shadow - must sit just ABOVE the ground top surface (GY) to be visible
  drawCube(mat().translate(-0.75, GY + 0.01, -1.0).scale(1.5, 0.02, 2.0), [0.10, 0.26, 0.04, 1.0]);

  // body: spans x[-0.6, 0.6], y[0, 0.7], z[-0.9, 0.9]
  drawCube(mat().translate(-0.6, 0, -0.9).scale(1.2, 0.7, 1.8), FOX_ORANGE);

  // --- head ---
  // headBase is the local origin for all head parts (front face at z=0 = world z=-1.05)
  var headBase = mat().translate(-0.35, 0.55, -1.05);

  drawCube(clone(headBase).scale(0.7, 0.65, 0.7), FOX_ORANGE);

  // muzzle - keep it entirely in front of the head (z offset + depth < 0) to avoid z-fighting
  drawCube(clone(headBase).translate(0.1, 0.02, -0.22).scale(0.5, 0.35, 0.20), FOX_CREAM);

  // nose - sits in front of muzzle
  drawCube(clone(headBase).translate(0.22, 0.23, -0.28).scale(0.26, 0.18, 0.10), FOX_DARK);

  // eyes
  drawCube(clone(headBase).translate(0.18, 0.40, -0.10).scale(0.14, 0.12, 0.08), FOX_DARK);
  drawCube(clone(headBase).translate(0.38, 0.40, -0.10).scale(0.14, 0.12, 0.08), FOX_DARK);

  // ears - orange brought closer to dark so the dark clearly peeks out in front
  drawPyramid(clone(headBase).translate(0.0,  0.62, 0.13).scale(0.22, 0.38, 0.14), FOX_ORANGE);
  drawPyramid(clone(headBase).translate(0.04, 0.64, 0.08).scale(0.14, 0.28, 0.14), FOX_DARK);
  drawPyramid(clone(headBase).translate(0.48, 0.62, 0.13).scale(0.22, 0.38, 0.14), FOX_ORANGE);
  drawPyramid(clone(headBase).translate(0.52, 0.64, 0.08).scale(0.14, 0.28, 0.14), FOX_DARK);

  // --- tail ---
  // tailBase pivot is at the rear of the body; g_tailAngle rotates it up/down
  var tailBase = mat().translate(0, 0.35, 0.9).rotate(g_tailAngle, 1, 0, 0);

  // tail body - cylinder rotated so its axis runs along Z (same trick as tip)
  var tailBody = clone(tailBase).translate(-0.15, 0.20, 0).rotate(90, 1, 0, 0);
  drawCylinder(clone(tailBody).scale(0.30, 0.70, 0.30), FOX_DKORG);

  // white fluffy tip - translate adjusted so center aligns with body cylinder center
  // center x = 0.5*sx + tx = 0, so tx = -0.5*0.36 = -0.18
  // center y in tailBase = 0.05, so ty = 0.05 + 0.5*sz = 0.05 + 0.18 = 0.23
  var tailTip = clone(tailBase).translate(-0.18, 0.23, 0.7).rotate(90, 1, 0, 0);
  drawCylinder(clone(tailTip).scale(0.36, 0.55, 0.36), WHITE);

  // --- legs: 4 chains, each 3 joints deep ---
  drawLegChain(-0.5, 0, -0.55, g_frontUpperAngle,  g_frontLowerAngle,  g_frontFootAngle,  FOX_ORANGE, FOX_DKORG, FOX_DARK);
  drawLegChain( 0.2, 0, -0.55, g_frontRUpperAngle, g_frontRLowerAngle, g_frontRFootAngle, FOX_ORANGE, FOX_DKORG, FOX_DARK);
  drawLegChain(-0.5, 0,  0.55, g_backUpperAngle,   g_backLowerAngle,   g_backFootAngle,   FOX_ORANGE, FOX_DKORG, FOX_DARK);
  drawLegChain( 0.2, 0,  0.55, g_backRUpperAngle,  g_backRLowerAngle,  g_backRFootAngle,  FOX_ORANGE, FOX_DKORG, FOX_DARK);
}

// 3-level hierarchical leg: thigh -> calf -> foot
// Each child builds on the parent's BASE matrix (before scale), then offsets
// by the parent's unscaled length so the joints stay connected.
function drawLegChain(ax, ay, az, upperAng, lowerAng, footAng, colUpper, colLower, colFoot) {
  var UH = 0.42, LH = 0.38;
  var UW = 0.18, LW = 0.14;

  var upperBase = mat().translate(ax, ay, az).rotate(upperAng, 1, 0, 0);
  drawCube(clone(upperBase).translate(-UW/2, -UH, -UW/2).scale(UW, UH, UW), colUpper);

  var lowerBase = clone(upperBase).translate(0, -UH, 0).rotate(-lowerAng, 1, 0, 0);
  drawCube(clone(lowerBase).translate(-LW/2, -LH, -LW/2).scale(LW, LH, LW), colLower);

  var footBase = clone(lowerBase).translate(0, -LH, 0).rotate(footAng, 1, 0, 0);
  drawCube(clone(footBase).translate(-0.12, -0.08, -0.28).scale(0.24, 0.08, 0.3), colFoot);
}

// helpers so we don't have to type new Matrix4() everywhere
function mat()    { return new Matrix4(); }
function clone(m) { return new Matrix4(m); }
