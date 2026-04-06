// asg0.js

function main() {
  var canvas = document.getElementById('example');
  if (!canvas) {
    console.log('Failed to retrieve the <canvas> element');
    return;
  }
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  var v1 = new Vector3([2.25, 2.25, 0]);
  drawVector(v1, 'red');
}

function drawVector(v, color) {
  var canvas = document.getElementById('example');
  var ctx = canvas.getContext('2d');

  var SCALE = 20;
  var cx = canvas.width / 2;
  var cy = canvas.height / 2;

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + v.elements[0] * SCALE, cy - v.elements[1] * SCALE);
  ctx.stroke();
}

function clearCanvas() {
  var canvas = document.getElementById('example');
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function handleDrawEvent() {
  clearCanvas();
  var v1 = new Vector3([parseFloat(document.getElementById('v1x').value), parseFloat(document.getElementById('v1y').value), 0]);
  var v2 = new Vector3([parseFloat(document.getElementById('v2x').value), parseFloat(document.getElementById('v2y').value), 0]);
  drawVector(v1, 'red');
  drawVector(v2, 'blue');
}

function handleDrawOperationEvent() {
  clearCanvas();
  var v1 = new Vector3([parseFloat(document.getElementById('v1x').value), parseFloat(document.getElementById('v1y').value), 0]);
  var v2 = new Vector3([parseFloat(document.getElementById('v2x').value), parseFloat(document.getElementById('v2y').value), 0]);
  var scalar = parseFloat(document.getElementById('scalar').value);
  var op = document.getElementById('operation').value;

  drawVector(v1, 'red');
  drawVector(v2, 'blue');

  if (op === 'add') {
    var v3 = new Vector3(v1.elements); v3.add(v2);
    drawVector(v3, 'green');
  } else if (op === 'sub') {
    var v3 = new Vector3(v1.elements); v3.sub(v2);
    drawVector(v3, 'green');
  } else if (op === 'mul') {
    var v3 = new Vector3(v1.elements); v3.mul(scalar);
    var v4 = new Vector3(v2.elements); v4.mul(scalar);
    drawVector(v3, 'green');
    drawVector(v4, 'green');
  } else if (op === 'div') {
    var v3 = new Vector3(v1.elements); v3.div(scalar);
    var v4 = new Vector3(v2.elements); v4.div(scalar);
    drawVector(v3, 'green');
    drawVector(v4, 'green');
  } else if (op === 'magnitude') {
    console.log('Magnitude of v1: ' + v1.magnitude());
    console.log('Magnitude of v2: ' + v2.magnitude());
    var n1 = new Vector3(v1.elements); n1.normalize();
    var n2 = new Vector3(v2.elements); n2.normalize();
    drawVector(n1, 'green');
    drawVector(n2, 'green');
  } else if (op === 'normalize') {
    console.log('Magnitude of v1: ' + v1.magnitude());
    console.log('Magnitude of v2: ' + v2.magnitude());
    var n1 = new Vector3(v1.elements); n1.normalize();
    var n2 = new Vector3(v2.elements); n2.normalize();
    drawVector(n1, 'green');
    drawVector(n2, 'green');
  } else if (op === 'angle') {
    console.log('Angle: ' + angleBetween(v1, v2) + ' degrees');
  } else if (op === 'area') {
    console.log('Area of the triangle: ' + areaTriangle(v1, v2));
  }
}

function angleBetween(v1, v2) {
  var dot = Vector3.dot(v1, v2);
  var cosAlpha = dot / (v1.magnitude() * v2.magnitude());
  cosAlpha = Math.max(-1, Math.min(1, cosAlpha));
  return Math.acos(cosAlpha) * (180 / Math.PI);
}

function areaTriangle(v1, v2) {
  return Vector3.cross(v1, v2).magnitude() / 2;
}