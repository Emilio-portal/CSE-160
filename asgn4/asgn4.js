'use strict';

// ── Shaders ──────────────────────────────────────────────────────────────────
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_Normal;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec3 v_VertPos;
  void main() {
    vec4 worldPos = u_ModelMatrix * a_Position;
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * worldPos;
    v_UV = a_UV;
    v_Normal = normalize(mat3(u_ModelMatrix) * a_Normal);
    v_VertPos = worldPos.xyz;
  }
`;

var FSHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec3 v_VertPos;
  uniform vec4 u_FragColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform int u_whichTexture;
  uniform bool u_LightOn;
  uniform bool u_NormalViz;
  uniform vec3 u_LightPos;
  uniform vec3 u_LightColor;
  uniform vec3 u_CameraPos;
  uniform bool u_SpotOn;
  uniform vec3 u_SpotPos;
  uniform vec3 u_SpotDir;
  uniform float u_SpotCutoff;
  void main() {
    vec4 base;
    if      (u_whichTexture == -2) { base = u_FragColor; }
    else if (u_whichTexture ==  0) { base = texture2D(u_Sampler0, v_UV); }
    else if (u_whichTexture ==  1) { base = texture2D(u_Sampler1, v_UV); }
    else if (u_whichTexture ==  2) { base = texture2D(u_Sampler2, v_UV); }
    else                           { base = vec4(v_UV, 1.0, 1.0); }

    if (u_NormalViz) {
      gl_FragColor = vec4(normalize(v_Normal) * 0.5 + 0.5, 1.0);
      return;
    }

    if (!u_LightOn && !u_SpotOn) {
      gl_FragColor = base;
      return;
    }

    vec3 N = normalize(v_Normal);
    vec3 V = normalize(u_CameraPos - v_VertPos);
    vec3 light = vec3(0.2);

    if (u_LightOn) {
      vec3 L = normalize(u_LightPos - v_VertPos);
      float diff = max(dot(N, L), 0.0);
      float spec = pow(max(dot(reflect(-L, N), V), 0.0), 32.0);
      light += u_LightColor * (diff + spec * 0.5);
    }

    if (u_SpotOn) {
      vec3 Ls = normalize(u_SpotPos - v_VertPos);
      float cosA = dot(-Ls, normalize(u_SpotDir));
      if (cosA > u_SpotCutoff) {
        float sD = max(dot(N, Ls), 0.0);
        float sS = pow(max(dot(reflect(-Ls, N), V), 0.0), 32.0);
        light += vec3(1.0, 0.95, 0.7) * (sD + sS * 0.5) * smoothstep(u_SpotCutoff, 1.0, cosA);
      }
    }

    gl_FragColor = vec4(base.rgb * clamp(light, 0.0, 2.0), base.a);
  }
`;

// ── Globals ───────────────────────────────────────────────────────────────────
var gl, canvas;
var a_Position, a_UV, a_Normal;
var u_ModelMatrix, u_ViewMatrix, u_ProjectionMatrix;
var u_FragColor, u_whichTexture;
var u_LightPos, u_LightColor, u_LightOn, u_NormalViz, u_CameraPos;
var u_SpotPos, u_SpotDir, u_SpotCutoff, u_SpotOn;

var g_camera;
var g_keys = {};
var g_lastMouseX = -1, g_lastMouseY = -1, g_mouseDown = false;

var g_foxesFound = 0;
var g_foxPositions = [[9,0,9],[24,0,10],[16,0,25]];
var g_foxFound = [false, false, false];
var g_won = false;

var g_worldBuffer = null;
var g_worldVertCount = 0;

var g_sphereBuffer = null;
var g_sphereVertCount = 0;

var g_objBuffer = null;
var g_objVertCount = 0;

// lighting state
var g_lightPos    = [16, 6, 16];
var g_lightColor  = [1.0, 1.0, 1.0];
var g_lightOn     = true;
var g_normalViz   = false;
var g_lightAngle  = 0;
var g_sliderAngle = 0;
var g_spotOn      = false;
var g_spotPos     = [16, 10, 16];
var g_spotDir     = [0, -1, 0];
var g_spotCutoff  = 0.9;

// ── 32×32 map ─────────────────────────────────────────────────────────────────
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

// ── Cube verts with normals (8 floats: x y z u v nx ny nz) ───────────────────
function cubeVertsWithNormal(x, y, z) {
  return [
    // front (z+1), normal 0,0,1
    x,y,z+1, 0,0, 0,0,1,   x+1,y,z+1, 1,0, 0,0,1,   x+1,y+1,z+1, 1,1, 0,0,1,
    x,y,z+1, 0,0, 0,0,1,   x+1,y+1,z+1, 1,1, 0,0,1, x,y+1,z+1, 0,1, 0,0,1,
    // back (z), normal 0,0,-1
    x+1,y,z, 0,0, 0,0,-1,  x,y,z, 1,0, 0,0,-1,       x,y+1,z, 1,1, 0,0,-1,
    x+1,y,z, 0,0, 0,0,-1,  x,y+1,z, 1,1, 0,0,-1,     x+1,y+1,z, 0,1, 0,0,-1,
    // left (x), normal -1,0,0
    x,y,z, 0,0, -1,0,0,    x,y,z+1, 1,0, -1,0,0,     x,y+1,z+1, 1,1, -1,0,0,
    x,y,z, 0,0, -1,0,0,    x,y+1,z+1, 1,1, -1,0,0,   x,y+1,z, 0,1, -1,0,0,
    // right (x+1), normal 1,0,0
    x+1,y,z+1, 0,0, 1,0,0, x+1,y,z, 1,0, 1,0,0,      x+1,y+1,z, 1,1, 1,0,0,
    x+1,y,z+1, 0,0, 1,0,0, x+1,y+1,z, 1,1, 1,0,0,    x+1,y+1,z+1, 0,1, 1,0,0,
    // top (y+1), normal 0,1,0
    x,y+1,z+1, 0,0, 0,1,0, x+1,y+1,z+1, 1,0, 0,1,0,  x+1,y+1,z, 1,1, 0,1,0,
    x,y+1,z+1, 0,0, 0,1,0, x+1,y+1,z, 1,1, 0,1,0,    x,y+1,z, 0,1, 0,1,0,
    // bottom (y), normal 0,-1,0
    x,y,z, 0,0, 0,-1,0,    x+1,y,z, 1,0, 0,-1,0,      x+1,y,z+1, 1,1, 0,-1,0,
    x,y,z, 0,0, 0,-1,0,    x+1,y,z+1, 1,1, 0,-1,0,    x,y,z+1, 0,1, 0,-1,0,
  ];
}

function buildWorldBuffer() {
  let verts = [];
  for (let z = 0; z < 32; z++) {
    for (let x = 0; x < 32; x++) {
      let h = g_map[z][x];
      for (let y = 0; y < h; y++) {
        verts.push(...cubeVertsWithNormal(x, y, z));
      }
    }
  }
  g_worldVertCount = verts.length / 8;
  if (!g_worldBuffer) g_worldBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_worldBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
}

// ── Sphere geometry ───────────────────────────────────────────────────────────
function buildSphereBuffer(nLat, nLon) {
  // pre-compute grid of (x,y,z) on unit sphere
  let pts = [];
  for (let i = 0; i <= nLat; i++) {
    let theta = (i / nLat) * Math.PI;
    let row = [];
    for (let j = 0; j <= nLon; j++) {
      let phi = (j / nLon) * 2 * Math.PI;
      let x = Math.sin(theta) * Math.cos(phi);
      let y = Math.cos(theta);
      let z = Math.sin(theta) * Math.sin(phi);
      row.push([x, y, z, j / nLon, i / nLat]);
    }
    pts.push(row);
  }

  let verts = [];
  function push(p) {
    // position, uv, normal (= position for unit sphere)
    verts.push(p[0], p[1], p[2], p[3], p[4], p[0], p[1], p[2]);
  }
  for (let i = 0; i < nLat; i++) {
    for (let j = 0; j < nLon; j++) {
      let a = pts[i][j], b = pts[i+1][j], c = pts[i+1][j+1], d = pts[i][j+1];
      push(a); push(b); push(c);
      push(a); push(c); push(d);
    }
  }

  g_sphereVertCount = verts.length / 8;
  g_sphereBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_sphereBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
}

// ── OBJ parser ────────────────────────────────────────────────────────────────
function parseOBJ(text) {
  let positions = [], normals = [], uvs = [];
  let verts = [];

  for (let line of text.split('\n')) {
    let p = line.trim().split(/\s+/);
    if (p[0] === 'v')  { positions.push([+p[1], +p[2], +p[3]]); }
    else if (p[0] === 'vn') { normals.push([+p[1], +p[2], +p[3]]); }
    else if (p[0] === 'vt') { uvs.push([+p[1], +p[2]]); }
    else if (p[0] === 'f') {
      let face = p.slice(1).map(tok => {
        let [vi, ti, ni] = tok.split('/');
        return {
          vi: vi ? +vi - 1 : 0,
          ti: ti ? +ti - 1 : -1,
          ni: ni ? +ni - 1 : -1,
        };
      });
      // triangulate
      for (let k = 1; k < face.length - 1; k++) {
        for (let fv of [face[0], face[k], face[k+1]]) {
          let pos = positions[fv.vi] || [0,0,0];
          let uv  = (fv.ti >= 0 && uvs.length)     ? uvs[fv.ti]     : [0,0];
          let nor = (fv.ni >= 0 && normals.length)  ? normals[fv.ni] : [0,1,0];
          verts.push(pos[0], pos[1], pos[2], uv[0], uv[1], nor[0], nor[1], nor[2]);
        }
      }
    }
  }
  return new Float32Array(verts);
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
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    for (let row = 0; row < 4; row++) {
      ctx.beginPath(); ctx.moveTo(0, row*16); ctx.lineTo(64, row*16); ctx.stroke();
      let off = (row % 2) * 32;
      ctx.beginPath(); ctx.moveTo(off, row*16); ctx.lineTo(off, row*16+16); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(off+32, row*16); ctx.lineTo(off+32, row*16+16); ctx.stroke();
    }
  });
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex0);
  gl.uniform1i(gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'u_Sampler0'), 0);

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

function bindPointers() {
  let stride = 8 * 4;
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, stride, 3 * 4);
  gl.enableVertexAttribArray(a_UV);
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, stride, 5 * 4);
  gl.enableVertexAttribArray(a_Normal);
}

function setUniforms(color, texNum, M) {
  gl.uniform4fv(u_FragColor, color);
  gl.uniform1i(u_whichTexture, texNum);
  gl.uniformMatrix4fv(u_ModelMatrix, false, (M || g_identityMatrix).elements);
}

function drawCubeImmediate(M, color, texNum) {
  let buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeVertsWithNormal(0, 0, 0)), gl.STATIC_DRAW);
  bindPointers();
  setUniforms(color, texNum, M);
  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

// ── Animal: blocky fox (5 cubes) ──────────────────────────────────────────────
function drawAnimal(wx, wz, t) {
  let bob = Math.sin(t * 2) * 0.05;

  let bodyM = new Matrix4();
  bodyM.setTranslate(wx + 0.25, 0.5 + bob, wz + 0.25);
  bodyM.scale(0.5, 0.4, 0.7);
  drawCubeImmediate(bodyM, [0.90, 0.45, 0.10, 1], -2);

  let headM = new Matrix4();
  headM.setTranslate(wx + 0.3, 0.9 + bob, wz + 0.7);
  headM.scale(0.4, 0.4, 0.4);
  drawCubeImmediate(headM, [0.90, 0.45, 0.10, 1], -2);

  for (let lx of [0.27, 0.47]) {
    for (let lz of [0.28, 0.55]) {
      let swing = (lx + lz > 1) ? Math.sin(t * 4) * 0.08 : Math.sin(t * 4 + Math.PI) * 0.08;
      let legM = new Matrix4();
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

function uploadLightingUniforms() {
  gl.uniform3fv(u_LightPos,   g_lightPos);
  gl.uniform3fv(u_LightColor, g_lightColor);
  gl.uniform1i(u_LightOn,    g_lightOn ? 1 : 0);
  gl.uniform1i(u_NormalViz,  g_normalViz ? 1 : 0);
  gl.uniform1i(u_SpotOn,     g_spotOn ? 1 : 0);
  gl.uniform3fv(u_SpotPos,   g_spotPos);
  gl.uniform3fv(u_SpotDir,   g_spotDir);
  gl.uniform1f(u_SpotCutoff, g_spotCutoff);
  let e = g_camera.eye.elements;
  gl.uniform3f(u_CameraPos, e[0], e[1], e[2]);
}

function renderScene() {
  let now = performance.now() / 1000;
  g_time = now - g_startTime;

  g_frameCount++;
  if (now - g_lastFpsTime >= 1.0) {
    g_fps = g_frameCount;
    g_frameCount = 0;
    g_lastFpsTime = now;
    document.getElementById('fps').textContent = g_fps;
  }

  // update orbiting light
  g_lightAngle = g_time * 0.8 + g_sliderAngle;
  g_lightPos[0] = 16 + 8 * Math.cos(g_lightAngle);
  g_lightPos[2] = 16 + 8 * Math.sin(g_lightAngle);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(u_ViewMatrix,       false, g_camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projMatrix.elements);

  uploadLightingUniforms();

  // ── sky (no lighting) ─
  gl.uniform1i(u_LightOn, 0);
  gl.uniform1i(u_NormalViz, 0);
  let e = g_camera.eye.elements;
  let skyM = new Matrix4();
  skyM.setTranslate(e[0]-500, e[1]-500, e[2]-500);
  skyM.scale(1000, 1000, 1000);
  let skyBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeVertsWithNormal(0,0,0)), gl.STATIC_DRAW);
  bindPointers();
  setUniforms([0.20, 0.30, 0.60, 1], -2, skyM);
  gl.drawArrays(gl.TRIANGLES, 0, 36);
  // restore lighting state
  uploadLightingUniforms();

  // ── ground ─
  let groundM = new Matrix4();
  groundM.setTranslate(-1, -0.05, -1);
  groundM.scale(34, 0.1, 34);
  drawCubeImmediate(groundM, [1,1,1,1], 1);

  // ── walls (batched) ─
  gl.uniformMatrix4fv(u_ModelMatrix, false, g_identityMatrix.elements);
  gl.uniform1i(u_whichTexture, 0);
  gl.uniform4fv(u_FragColor, [1,1,1,1]);
  gl.bindBuffer(gl.ARRAY_BUFFER, g_worldBuffer);
  bindPointers();
  gl.drawArrays(gl.TRIANGLES, 0, g_worldVertCount);

  // ── animals ─
  for (let i = 0; i < 3; i++) {
    if (!g_foxFound[i]) drawAnimal(g_foxPositions[i][0], g_foxPositions[i][2], g_time);
  }

  // ── spheres ─
  gl.bindBuffer(gl.ARRAY_BUFFER, g_sphereBuffer);
  bindPointers();

  let sM1 = new Matrix4();
  sM1.setTranslate(5, 1.5, 5);
  sM1.scale(1.5, 1.5, 1.5);
  setUniforms([0.8, 0.15, 0.1, 1], -2, sM1);
  gl.drawArrays(gl.TRIANGLES, 0, g_sphereVertCount);

  let sM2 = new Matrix4();
  sM2.setTranslate(27, 1.5, 5);
  sM2.scale(1.2, 1.2, 1.2);
  setUniforms([0.1, 0.3, 0.8, 1], -2, sM2);
  gl.drawArrays(gl.TRIANGLES, 0, g_sphereVertCount);

  // ── OBJ model (gem) ─
  if (g_objBuffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, g_objBuffer);
    bindPointers();
    let gemM = new Matrix4();
    gemM.setTranslate(20, 1.5, 5);
    gemM.scale(1.2, 1.2, 1.2);
    setUniforms([0.3, 0.9, 0.5, 1], -2, gemM);
    gl.drawArrays(gl.TRIANGLES, 0, g_objVertCount);
  }

  // ── light marker (yellow cube, no lighting) ─
  gl.uniform1i(u_LightOn, 0);
  gl.uniform1i(u_NormalViz, 0);
  let lmM = new Matrix4();
  lmM.setTranslate(g_lightPos[0] - 0.15, g_lightPos[1] - 0.15, g_lightPos[2] - 0.15);
  lmM.scale(0.3, 0.3, 0.3);
  drawCubeImmediate(lmM, [1.0, 1.0, 0.0, 1], -2);

  // ── spotlight marker (orange cube, no lighting) ─
  let smM = new Matrix4();
  smM.setTranslate(g_spotPos[0] - 0.15, g_spotPos[1] - 0.15, g_spotPos[2] - 0.15);
  smM.scale(0.3, 0.3, 0.3);
  drawCubeImmediate(smM, [1.0, 0.5, 0.0, 1], -2);
  // restore
  uploadLightingUniforms();

  // ── fox proximity / win ─
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

function getBlockInFront() {
  let e = g_camera.eye.elements, a = g_camera.at.elements;
  let fx = a[0]-e[0], fz = a[2]-e[2];
  let len = Math.sqrt(fx*fx+fz*fz);
  fx /= len; fz /= len;
  return [Math.floor(e[0]+fx*1.5), Math.floor(e[2]+fz*1.5)];
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
  gl.clearColor(0.20, 0.30, 0.60, 1);

  let vs = compileShader(gl.VERTEX_SHADER,   VSHADER_SOURCE);
  let fs = compileShader(gl.FRAGMENT_SHADER, FSHADER_SOURCE);
  let prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
    console.error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  a_Position         = gl.getAttribLocation(prog,  'a_Position');
  a_UV               = gl.getAttribLocation(prog,  'a_UV');
  a_Normal           = gl.getAttribLocation(prog,  'a_Normal');
  u_ModelMatrix      = gl.getUniformLocation(prog, 'u_ModelMatrix');
  u_ViewMatrix       = gl.getUniformLocation(prog, 'u_ViewMatrix');
  u_ProjectionMatrix = gl.getUniformLocation(prog, 'u_ProjectionMatrix');
  u_FragColor        = gl.getUniformLocation(prog, 'u_FragColor');
  u_whichTexture     = gl.getUniformLocation(prog, 'u_whichTexture');
  u_LightPos         = gl.getUniformLocation(prog, 'u_LightPos');
  u_LightColor       = gl.getUniformLocation(prog, 'u_LightColor');
  u_LightOn          = gl.getUniformLocation(prog, 'u_LightOn');
  u_NormalViz        = gl.getUniformLocation(prog, 'u_NormalViz');
  u_CameraPos        = gl.getUniformLocation(prog, 'u_CameraPos');
  u_SpotOn           = gl.getUniformLocation(prog, 'u_SpotOn');
  u_SpotPos          = gl.getUniformLocation(prog, 'u_SpotPos');
  u_SpotDir          = gl.getUniformLocation(prog, 'u_SpotDir');
  u_SpotCutoff       = gl.getUniformLocation(prog, 'u_SpotCutoff');

  initTextures();
  buildWorldBuffer();
  buildSphereBuffer(16, 24);

  fetch('models/gem.obj')
    .then(r => r.text())
    .then(text => {
      let data = parseOBJ(text);
      g_objVertCount = data.length / 8;
      g_objBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, g_objBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    });

  g_camera = new Camera();
  g_identityMatrix.setIdentity();

  document.addEventListener('keydown', ev => { g_keys[ev.key] = true; });
  document.addEventListener('keyup',   ev => { g_keys[ev.key] = false; });

  canvas.addEventListener('mousedown', ev => {
    g_mouseDown = true;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
  });
  document.addEventListener('mouseup', () => { g_mouseDown = false; });
  document.addEventListener('mousemove', ev => {
    if (!g_mouseDown) return;
    let dx = ev.clientX - g_lastMouseX;
    let dy = ev.clientY - g_lastMouseY;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
    g_camera.rotateByMouse(dx, dy);
  });

  canvas.addEventListener('click', ev => {
    let [bx, bz] = getBlockInFront();
    if (bx < 0 || bx > 31 || bz < 0 || bz > 31) return;
    if (g_map[bz][bx] > 0) g_map[bz][bx]--;
    buildWorldBuffer();
  });
  canvas.addEventListener('contextmenu', ev => {
    ev.preventDefault();
    let [bx, bz] = getBlockInFront();
    if (bx < 0 || bx > 31 || bz < 0 || bz > 31) return;
    if (g_map[bz][bx] < 4) g_map[bz][bx]++;
    buildWorldBuffer();
  });

  // UI wiring
  document.getElementById('btnLight').addEventListener('click', () => {
    g_lightOn = !g_lightOn;
    document.getElementById('btnLight').textContent = g_lightOn ? 'Light: ON' : 'Light: OFF';
  });
  document.getElementById('btnNorm').addEventListener('click', () => {
    g_normalViz = !g_normalViz;
    document.getElementById('btnNorm').textContent = g_normalViz ? 'Normals: ON' : 'Normals: OFF';
  });
  document.getElementById('btnSpot').addEventListener('click', () => {
    g_spotOn = !g_spotOn;
    document.getElementById('btnSpot').textContent = g_spotOn ? 'Spotlight: ON' : 'Spotlight: OFF';
  });
  document.getElementById('sliderAngle').addEventListener('input', ev => {
    g_sliderAngle = (+ev.target.value / 180) * Math.PI;
  });
  document.getElementById('sliderHeight').addEventListener('input', ev => {
    g_lightPos[1] = +ev.target.value;
  });
  document.getElementById('sliderR').addEventListener('input', ev => { g_lightColor[0] = +ev.target.value; });
  document.getElementById('sliderG').addEventListener('input', ev => { g_lightColor[1] = +ev.target.value; });
  document.getElementById('sliderB').addEventListener('input', ev => { g_lightColor[2] = +ev.target.value; });

  function tick() {
    handleKeys();
    renderScene();
    requestAnimationFrame(tick);
  }
  tick();
}
