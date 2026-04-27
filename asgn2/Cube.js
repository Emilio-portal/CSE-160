'use strict';

var g_cubeBuffer   = null;
var g_cylBuffer    = null;
var g_cylVertCount = 0;
var g_pyrBuffer    = null;

// unit cube (0,0,0) -> (1,1,1)
var CUBE_VERTS = new Float32Array([
  0,0,1,  1,0,1,  1,1,1,   0,0,1,  1,1,1,  0,1,1,  // front
  1,0,0,  0,0,0,  0,1,0,   1,0,0,  0,1,0,  1,1,0,  // back
  0,0,0,  0,0,1,  0,1,1,   0,0,0,  0,1,1,  0,1,0,  // left
  1,0,1,  1,0,0,  1,1,0,   1,0,1,  1,1,0,  1,1,1,  // right
  0,1,1,  1,1,1,  1,1,0,   0,1,1,  1,1,0,  0,1,0,  // top
  0,0,0,  1,0,0,  1,0,1,   0,0,0,  1,0,1,  0,0,1,  // bottom
]);

// unit pyramid: base (0,0,0)->(1,0,1), tip at (0.5,1,0.5)
var PYRAMID_VERTS = new Float32Array([
  0,0,0,  1,0,0,  0.5,1,0.5,  // front face
  1,0,0,  1,0,1,  0.5,1,0.5,  // right face
  1,0,1,  0,0,1,  0.5,1,0.5,  // back face
  0,0,1,  0,0,0,  0.5,1,0.5,  // left face
  0,0,0,  1,0,1,  1,0,0,      // base tri 1
  0,0,0,  0,0,1,  1,0,1,      // base tri 2
]);

function initPrimitiveBuffers() {
  // cube buffer
  g_cubeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, CUBE_VERTS, gl.STATIC_DRAW);

  // pyramid buffer
  g_pyrBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_pyrBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, PYRAMID_VERTS, gl.STATIC_DRAW);

  // cylinder buffer (Y-axis, radius 0.5, centered at (0.5,*,0.5) in XZ)
  var SEG   = 16;
  var verts = [];
  for (var i = 0; i < SEG; i++) {
    var a1 = (i / SEG) * 2 * Math.PI;
    var a2 = ((i + 1) / SEG) * 2 * Math.PI;
    var x1 = 0.5 + 0.5 * Math.cos(a1), z1 = 0.5 + 0.5 * Math.sin(a1);
    var x2 = 0.5 + 0.5 * Math.cos(a2), z2 = 0.5 + 0.5 * Math.sin(a2);
    verts.push(x1,0,z1, x2,0,z2, x2,1,z2);
    verts.push(x1,0,z1, x2,1,z2, x1,1,z1);
    verts.push(0.5,1,0.5, x1,1,z1, x2,1,z2); // top cap
    verts.push(0.5,0,0.5, x2,0,z2, x1,0,z1); // bottom cap
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

function drawPyramid(M, color) {
  gl.uniform4fv(u_FragColor, color);
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.bindBuffer(gl.ARRAY_BUFFER, g_pyrBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.drawArrays(gl.TRIANGLES, 0, 18);
}
