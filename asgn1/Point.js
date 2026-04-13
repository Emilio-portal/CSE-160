// Point.js  —  Point shape class

class Point {
  constructor(position, color, size) {
    this.position = position; // [x, y]
    this.color    = color;    // [r, g, b, a]
    this.size     = size;     // gl_PointSize
  }

  render() {
    // Set color and size uniforms, then draw a single point
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    gl.uniform1f(u_Size, this.size);
    gl.vertexAttrib3f(a_Position, this.position[0], this.position[1], 0.0);
    gl.drawArrays(gl.POINTS, 0, 1);
  }
}
