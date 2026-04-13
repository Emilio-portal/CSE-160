// Point.js -- point shape class

class Point {
  constructor(position, color, size) {
    this.position = position; // [x, y]
    this.color    = color;    // [r, g, b, a]
    this.size     = size;
  }

  render() {
    // disableVertexAttribArray so vertexAttrib3f works correctly --
    // if a Triangle was drawn before this, the attrib array is still
    // enabled and will override gl.vertexAttrib3f unless we turn it off
    gl.disableVertexAttribArray(a_Position);
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    gl.uniform1f(u_Size, this.size);
    gl.vertexAttrib3f(a_Position, this.position[0], this.position[1], 0.0);
    gl.drawArrays(gl.POINTS, 0, 1);
  }
}
