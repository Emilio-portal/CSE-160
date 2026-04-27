// Cube.js — unit cube (0,0,0)→(1,1,1) and cylinder primitive
// Buffer allocated once in initCubeBuffer(); reused every frame for performance.

'use strict';

let g_cubeBuffer = null;
let g_cylBuffer  = null;
let g_cylVertCount = 0;

// prettier-ignore
const CUBE_VERTS = new Float32Array([
  // Front face  (z=1)
  0,0,1,  1,0,1,  1,1,1,
  0,0,1,  1,1,1,  0,1,1,
  // Back face   (z=0)
  1,0,0,  0,0,0,  0,1,0,
  1,0,0,  0,1,0,  1,1,0,
  // Left face   (x=0)
  0,0,0,  0,0,1,  0,1,1,
  0,0,0,  0,1,1,  0,1,0,
  // Right face  (x=1)
  1,0,1,  1,0,0,  1,1,0,
  1,0,1,  1,1,0,  1,1,1,
  // Top face    (y=1)
  0,1,1,  1,1,1,  1,1,0,
  0,1,1,  1,1,0,  0,1,0,
  // Bottom face (y=0)
  0,0,0,  1,0,0,  1,0,1,
  0,0,0,  1,0,1,  0,0,1,
]);

function initPrimitiveBuffers() {
  // ── Cube ──
  g_cubeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, CUBE_VERTS, gl.STATIC_DRAW);

  // ── Cylinder  (axis along Y, radius 0.5, center at (0.5, 0, 0.5) in XZ) ──
  const SEG = 16;
  const verts = [];
  for (let i = 0; i < SEG; i++) {
    const a1 = (i / SEG) * 2 * Math.PI;
    const a2 = ((i + 1) / SEG) * 2 * Math.PI;
    const x1 = 0.5 + 0.5 * Math.cos(a1), z1 = 0.5 + 0.5 * Math.sin(a1);
    const x2 = 0.5 + 0.5 * Math.cos(a2), z2 = 0.5 + 0.5 * Math.sin(a2);
    // Side quad (two tris)
    verts.push(x1,0,z1, x2,0,z2, x2,1,z2);
    verts.push(x1,0,z1, x2,1,z2, x1,1,z1);
    // Top cap
    verts.push(0.5,1,0.5, x1,1,z1, x2,1,z2);
    // Bottom cap
    verts.push(0.5,0,0.5, x2,0,z2, x1,0,z1);
  }
  g_cylVertCount = verts.length / 3;
  g_cylBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cylBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
}

function drawCube(M, color) {
  gl.uniform4fv(u_FragColor, color);
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

function drawCylinder(M, color) {
  gl.uniform4fv(u_FragColor, color);
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cylBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.drawArrays(gl.TRIANGLES, 0, g_cylVertCount);
}
