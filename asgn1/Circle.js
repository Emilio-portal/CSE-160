// Circle.js -- circle shape class (drawn as a triangle fan)

class Circle {
  constructor(position, color, size, segments) {
    this.position = position; // [x, y]
    this.color    = color;
    this.size     = size;
    this.segments = segments;
  }

  render() {
    var x    = this.position[0];
    var y    = this.position[1];
    var r    = this.size / 200;
    var segs = this.segments;

    for (var i = 0; i < segs; i++) {
      var a1 = (i       / segs) * 2 * Math.PI;
      var a2 = ((i + 1) / segs) * 2 * Math.PI;
      drawTriangle(
        [ x, y,
          x + r * Math.cos(a1), y + r * Math.sin(a1),
          x + r * Math.cos(a2), y + r * Math.sin(a2) ],
        this.color
      );
    }
  }
}
