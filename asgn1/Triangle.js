// Triangle.js  —  Triangle shape class + shared drawTriangle utility

// ── Shared utility ────────────────────────────────────────────────────────────
// drawTriangle(vertices, color)
//   vertices : flat array [x1,y1, x2,y2, x3,y3] in WebGL coords
//   color    : [r, g, b, a]
//
// This function is reused by Circle.js and Fox.js as well.
// ─────────────────────────────────────────────────────────────────────────────
function drawTriangle(vertices, color) {
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.drawArrays(gl.TRIANGLES, 0, 3);
}


// ── Triangle brush class ──────────────────────────────────────────────────────
class Triangle {
  constructor(position, color, size) {
    this.position = position; // [x, y]  — centroid
    this.color    = color;    // [r, g, b, a]
    this.size     = size;     // controls how big the triangle is
  }

  render() {
    var x = this.position[0];
    var y = this.position[1];
    var d = this.size / 200; // half-size in WebGL units

    // Equilateral-ish triangle centered on (x, y)
    drawTriangle(
      [ x,       y + d,
        x - d,   y - d,
        x + d,   y - d ],
      this.color
    );
  }
}
