// Circle.js  —  Circle shape class

class Circle {
  constructor(position, color, size, segments) {
    this.position = position; // [x, y]
    this.color    = color;    // [r, g, b, a]
    this.size     = size;     // radius in "size units"
    this.segments = segments; // number of triangle slices
  }

  render() {
    var x    = this.position[0];
    var y    = this.position[1];
    var r    = this.size / 200; // radius in WebGL units
    var segs = this.segments;

    // Draw circle as a fan of triangles from center
    for (var i = 0; i < segs; i++) {
      var a1 = (i       / segs) * 2 * Math.PI;
      var a2 = ((i + 1) / segs) * 2 * Math.PI;

      drawTriangle(
        [ x, y,
          x + r * Math.cos(a1),  y + r * Math.sin(a1),
          x + r * Math.cos(a2),  y + r * Math.sin(a2) ],
        this.color
      );
    }
  }
}
