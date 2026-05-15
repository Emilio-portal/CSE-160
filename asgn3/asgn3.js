'use strict';

// ── Shaders ──────────────────────────────────────────────────────────────────
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  varying vec2 v_UV;
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
  }
`;

var FSHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_UV;
  uniform vec4 u_FragColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform int u_whichTexture;
  void main() {
    if      (u_whichTexture == -2) { gl_FragColor = u_FragColor; }
    else if (u_whichTexture ==  0) { gl_FragColor = texture2D(u_Sampler0, v_UV); }
    else if (u_whichTexture ==  1) { gl_FragColor = texture2D(u_Sampler1, v_UV); }
    else if (u_whichTexture ==  2) { gl_FragColor = texture2D(u_Sampler2, v_UV); }
    else                           { gl_FragColor = vec4(v_UV, 1.0, 1.0); }
  }
`;

// ── Globals ───────────────────────────────────────────────────────────────────
var gl, canvas;
var a_Position, a_UV;
var u_ModelMatrix, u_ViewMatrix, u_ProjectionMatrix;
var u_FragColor, u_whichTexture;

var g_camera;
var g_keys = {};
var g_lastMouseX = -1, g_lastMouseY = -1, g_mouseDown = false;

// story: find 3 fox dens
var g_foxesFound = 0;
var g_foxPositions = [[9,0,9],[24,0,10],[16,0,25]];
var g_foxFound = [false, false, false];
var g_won = false;

// world buffer (batched walls)
var g_worldBuffer = null;
var g_worldVertCount = 0;

// ── 32x32 map (0=empty, 1-4=wall height) ──────────────────────────────────
var g_map = [
  [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,2,2,2,0,0,0,0,0,3,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,2,0,0,0,0,0,0,0,3,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,2,0,0,0,0,0,0,0,3,0,0,3,0,0,0,4,4,4,4,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,4,0,0,4,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,3,3,0,3,3,0,0,4,0,0,4,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,4,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,4,4,4,4,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,3,3,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,3,0,0,0,0,4],
  [4,0,0,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,3,0,0,0,0,4],
  [4,0,0,2,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,3,3,0,0,0,0,4],
  [4,0,0,2,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,4,4,4,4,4,4,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,4,0,0,0,0,4,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,4,0,0,0,0,4,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,4,0,0,4],
  [4,0,0,0,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,4,0,0,4],
  [4,0,0,0,3,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,0,4,4,4,0,0,4],
  [4,0,0,0,3,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,2,2,2,2,2,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
];

// ── Unit cube verts with UV (6 faces × 2 tris × 3 verts = 36, each: x y z u v) ─
function cubeVertsWithUV(x, y, z) {
  // returns Float32Array of 36*5 floats, translated to world pos
  let d = [
    // front  (z+1)
    x,y,z+1, 0,0,  x+1,y,z+1, 1,0,  x+1,y+1,z+1, 1,1,
    x,y,z+1, 0,0,  x+1,y+1,z+1, 1,1, x,y+1,z+1, 0,1,
    // back   (z)
    x+1,y,z, 0,0,  x,y,z, 1,0,  x,y+1,z, 1,1,
    x+1,y,z, 0,0,  x,y+1,z, 1,1, x+1,y+1,z, 0,1,
    // left   (x)
    x,y,z, 0,0,  x,y,z+1, 1,0,  x,y+1,z+1, 1,1,
    x,y,z, 0,0,  x,y+1,z+1, 1,1, x,y+1,z, 0,1,
    // right  (x+1)
    x+1,y,z+1, 0,0,  x+1,y,z, 1,0,  x+1,y+1,z, 1,1,
    x+1,y,z+1, 0,0,  x+1,y+1,z, 1,1, x+1,y+1,z+1, 0,1,
    // top    (y+1)
    x,y+1,z+1, 0,0,  x+1,y+1,z+1, 1,0,  x+1,y+1,z, 1,1,
    x,y+1,z+1, 0,0,  x+1,y+1,z, 1,1, x,y+1,z, 0,1,
    // bottom (y)
    x,y,z, 0,0,  x+1,y,z, 1,0,  x+1,y,z+1, 1,1,
    x,y,z, 0,0,  x+1,y,z+1, 1,1, x,y,z+1, 0,1,
  ];
  return d;
}

function buildWorldBuffer() {
  let verts = [];
  for (let z = 0; z < 32; z++) {
    for (let x = 0; x < 32; x++) {
      let h = g_map[z][x];
      for (let y = 0; y < h; y++) {
        verts.push(...cubeVertsWithUV(x, y, z));
      }
    }
  }
  g_worldVertCount = verts.length / 5;
  if (!g_worldBuffer) g_worldBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_worldBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
}

// ── Texture generation ────────────────────────────────────────────────────────
function makeProceduralTexture(drawFn) {
  let c = document.createElement('canvas');
  c.width = c.height = 64;
  drawFn(c.getContext('2d'));
  let tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.generateMipmap(gl.TEXTURE_2D);
  return tex;
}

function initTextures() {
  // tex 0: dirt/brick for walls
  let tex0 = makeProceduralTexture(ctx => {
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 16; j++) {
        let r = 110 + Math.floor(Math.random() * 50);
        let g2 = 65 + Math.floor(Math.random() * 25);
        let b = 30 + Math.floor(Math.random() * 20);
        ctx.fillStyle = `rgb(${r},${g2},${b})`;
        ctx.fillRect(i*4, j*4, 4, 4);
      }
    }
    // brick lines
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    for (let row = 0; row < 4; row++) {
      ctx.beginPath(); ctx.moveTo(0, row*16); ctx.lineTo(64, row*16); ctx.stroke();
      let offset = (row % 2) * 32;
      ctx.beginPath(); ctx.moveTo(offset, row*16); ctx.lineTo(offset, row*16+16); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(offset+32, row*16); ctx.lineTo(offset+32, row*16+16); ctx.stroke();
    }
  });
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex0);
  gl.uniform1i(gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'u_Sampler0'), 0);

  // tex 1: grass for walls
  let tex1 = makeProceduralTexture(ctx => {
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 16; j++) {
        let r = 60 + Math.floor(Math.random() * 20);
        let g2 = 130 + Math.floor(Math.random() * 50);
        let b = 40 + Math.floor(Math.random() * 20);
        ctx.fillStyle = `rgb(${r},${g2},${b})`;
        ctx.fillRect(i*4, j*4, 4, 4);
      }
    }
  });
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, tex1);
  gl.uniform1i(gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'u_Sampler1'), 1);

  // tex 2: brown dirt for ground
  let tex2 = makeProceduralTexture(ctx => {
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 16; j++) {
        let r = 120 + Math.floor(Math.random() * 40);
        let g2 = 75 + Math.floor(Math.random() * 25);
        let b = 35 + Math.floor(Math.random() * 20);
        ctx.fillStyle = `rgb(${r},${g2},${b})`;
        ctx.fillRect(i*4, j*4, 4, 4);
      }
    }
  });
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, tex2);
  gl.uniform1i(gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'u_Sampler2'), 2);
}

// ── Draw helpers ──────────────────────────────────────────────────────────────
var g_identityMatrix = new Matrix4();

function setUniforms(color, texNum, M) {
  gl.uniform4fv(u_FragColor, color);
  gl.uniform1i(u_whichTexture, texNum);
  gl.uniformMatrix4fv(u_ModelMatrix, false, (M || g_identityMatrix).elements);
}

function drawCubeImmediate(M, color, texNum) {
  let verts = cubeVertsWithUV(0, 0, 0);
  let buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  bindPointers();
  setUniforms(color, texNum, M);
  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

function bindPointers() {
  let stride = 5 * 4;
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, stride, 3*4);
  gl.enableVertexAttribArray(a_UV);
}

// ── Animal: simple blocky fox (5 cubes) ───────────────────────────────────────
function drawAnimal(wx, wz, t) {
  let bodyM = new Matrix4();
  let bob = Math.sin(t * 2) * 0.05;
  // body
  bodyM.setTranslate(wx + 0.25, 0.5 + bob, wz + 0.25);
  bodyM.scale(0.5, 0.4, 0.7);
  drawCubeImmediate(bodyM, [0.90, 0.45, 0.10, 1], -2);
  // head
  let headM = new Matrix4();
  headM.setTranslate(wx + 0.3, 0.9 + bob, wz + 0.7);
  headM.scale(0.4, 0.4, 0.4);
  drawCubeImmediate(headM, [0.90, 0.45, 0.10, 1], -2);
  // legs (4 cubes)
  for (let lx of [0.27, 0.47]) {
    for (let lz of [0.28, 0.55]) {
      let legM = new Matrix4();
      let swing = (lx + lz > 1) ? Math.sin(t * 4) * 0.08 : Math.sin(t * 4 + Math.PI) * 0.08;
      legM.setTranslate(wx + lx, 0.1 + swing + bob, wz + lz);
      legM.scale(0.15, 0.4, 0.15);
      drawCubeImmediate(legM, [0.70, 0.28, 0.04, 1], -2);
    }
  }
}

// ── Render ────────────────────────────────────────────────────────────────────
var g_startTime = performance.now() / 1000;
var g_time = 0;
var g_fps = 0, g_lastFpsTime = 0, g_frameCount = 0;

function renderScene() {
  let now = performance.now() / 1000;
  g_time = now - g_startTime;

  // fps tracking
  g_frameCount++;
  if (now - g_lastFpsTime >= 1.0) {
    g_fps = g_frameCount;
    g_frameCount = 0;
    g_lastFpsTime = now;
    document.getElementById('fps').textContent = g_fps;
  }

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // upload camera matrices
  gl.uniformMatrix4fv(u_ViewMatrix,       false, g_camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projMatrix.elements);

  // ── sky (solid blue, huge cube centered on player) ─
  let skyM = new Matrix4();
  let e = g_camera.eye.elements;
  skyM.setTranslate(e[0]-500, e[1]-500, e[2]-500);
  skyM.scale(1000, 1000, 1000);
  setUniforms([0.35, 0.45, 0.85, 1], -2, skyM);
  // re-use world buffer approach: just upload sky verts inline
  let skyVerts = cubeVertsWithUV(0, 0, 0);
  let skyBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(skyVerts), gl.STATIC_DRAW);
  bindPointers();
  gl.drawArrays(gl.TRIANGLES, 0, 36);

  // ── ground (dirt texture, flat) ─
  let groundM = new Matrix4();
  groundM.setTranslate(-1, -0.05, -1);
  groundM.scale(34, 0.1, 34);
  drawCubeImmediate(groundM, [1,1,1,1], 1);

  // ── walls (batched draw) ─
  gl.uniformMatrix4fv(u_ModelMatrix, false, g_identityMatrix.elements);
  gl.uniform1i(u_whichTexture, 0);
  gl.uniform4fv(u_FragColor, [1,1,1,1]);
  gl.bindBuffer(gl.ARRAY_BUFFER, g_worldBuffer);
  bindPointers();
  gl.drawArrays(gl.TRIANGLES, 0, g_worldVertCount);

  // ── animals ─
  for (let i = 0; i < 3; i++) {
    if (!g_foxFound[i]) {
      drawAnimal(g_foxPositions[i][0], g_foxPositions[i][2], g_time);
    }
  }

  // ── story: proximity check ─
  if (!g_won) {
    for (let i = 0; i < 3; i++) {
      if (!g_foxFound[i]) {
        let dx = e[0] - g_foxPositions[i][0] - 0.5;
        let dz = e[2] - g_foxPositions[i][2] - 0.5;
        if (Math.sqrt(dx*dx + dz*dz) < 1.5) {
          g_foxFound[i] = true;
          g_foxesFound++;
          document.getElementById('foxcount').textContent = g_foxesFound;
        }
      }
    }
    if (g_foxesFound === 3) {
      g_won = true;
      document.getElementById('hud').style.display = 'none';
      document.getElementById('win').style.display = 'block';
    }
  }
}

// ── Input ─────────────────────────────────────────────────────────────────────
function handleKeys() {
  if (g_keys['w'] || g_keys['W']) g_camera.moveForward();
  if (g_keys['s'] || g_keys['S']) g_camera.moveBackward();
  if (g_keys['a'] || g_keys['A']) g_camera.moveLeft();
  if (g_keys['d'] || g_keys['D']) g_camera.moveRight();
  if (g_keys['q'] || g_keys['Q']) g_camera.panLeft();
  if (g_keys['e'] || g_keys['E']) g_camera.panRight();
}

// ── Add/delete blocks ─────────────────────────────────────────────────────────
function getBlockInFront() {
  let e = g_camera.eye.elements, a = g_camera.at.elements;
  let fx = a[0] - e[0], fz = a[2] - e[2];
  let len = Math.sqrt(fx*fx + fz*fz);
  fx /= len; fz /= len;
  let bx = Math.floor(e[0] + fx * 1.5);
  let bz = Math.floor(e[2] + fz * 1.5);
  return [bx, bz];
}

// ── Main ──────────────────────────────────────────────────────────────────────
function compileShader(type, src) {
  let s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    console.error(gl.getShaderInfoLog(s));
  return s;
}

function main() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl');
  if (!gl) { alert('WebGL not supported'); return; }

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.35, 0.45, 0.85, 1);

  let vs = compileShader(gl.VERTEX_SHADER,   VSHADER_SOURCE);
  let fs = compileShader(gl.FRAGMENT_SHADER, FSHADER_SOURCE);
  let prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
    console.error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  a_Position        = gl.getAttribLocation(prog,  'a_Position');
  a_UV              = gl.getAttribLocation(prog,  'a_UV');
  u_ModelMatrix     = gl.getUniformLocation(prog, 'u_ModelMatrix');
  u_ViewMatrix      = gl.getUniformLocation(prog, 'u_ViewMatrix');
  u_ProjectionMatrix= gl.getUniformLocation(prog, 'u_ProjectionMatrix');
  u_FragColor       = gl.getUniformLocation(prog, 'u_FragColor');
  u_whichTexture    = gl.getUniformLocation(prog, 'u_whichTexture');

  initTextures();
  buildWorldBuffer();

  g_camera = new Camera();
  g_identityMatrix.setIdentity();

  // keyboard
  document.addEventListener('keydown', e => { g_keys[e.key] = true; });
  document.addEventListener('keyup',   e => { g_keys[e.key] = false; });

  // mouse look
  canvas.addEventListener('mousedown', e => {
    g_mouseDown = true;
    g_lastMouseX = e.clientX;
    g_lastMouseY = e.clientY;
  });
  document.addEventListener('mouseup',   () => { g_mouseDown = false; });
  document.addEventListener('mousemove', e => {
    if (!g_mouseDown) return;
    let dx = e.clientX - g_lastMouseX;
    let dy = e.clientY - g_lastMouseY;
    g_lastMouseX = e.clientX;
    g_lastMouseY = e.clientY;
    g_camera.rotateByMouse(dx, dy);
  });

  // add/delete blocks (left click = delete, right click = add)
  canvas.addEventListener('click', e => {
    let [bx, bz] = getBlockInFront();
    if (bx < 0 || bx > 31 || bz < 0 || bz > 31) return;
    if (g_map[bz][bx] > 0) g_map[bz][bx]--;
    buildWorldBuffer();
  });
  canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    let [bx, bz] = getBlockInFront();
    if (bx < 0 || bx > 31 || bz < 0 || bz > 31) return;
    if (g_map[bz][bx] < 4) g_map[bz][bx]++;
    buildWorldBuffer();
  });

  function tick() {
    handleKeys();
    renderScene();
    requestAnimationFrame(tick);
  }
  tick();
}
