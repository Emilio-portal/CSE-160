// Triangle.js -- triangle brush class
// drawTriangle is also used by Circle.js and Fox.js

function drawTriangle(vertices, color) {
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

class Triangle {
  constructor(position, color, size) {
    this.position = position; // center [x, y]
    this.color    = color;
    this.size     = size;
  }

  render() {
    var x = this.position[0];
    var y = this.position[1];
    var d = this.size / 200;
    drawTriangle(
      [ x,     y + d,
        x - d, y - d,
        x + d, y - d ],
      this.color
    );
  }
}
