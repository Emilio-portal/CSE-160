// asg1.js -- CSE 160 Asg1
// WebGL paint + fox drawing

var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'uniform float u_Size;\n' +
  'void main() {\n' +
  '  gl_Position = a_Position;\n' +
  '  gl_PointSize = u_Size;\n' +
  '}\n';

var FSHADER_SOURCE =
  'precision mediump float;\n' +
  'uniform vec4 u_FragColor;\n' +
  'void main() {\n' +
  '  gl_FragColor = u_FragColor;\n' +
  '}\n';

var gl;
var canvas;
var a_Position;
var u_FragColor;
var u_Size;

var g_shapesList = [];
var g_selectedColor = [0.86, 0.24, 0.04, 1.0];
var g_selectedSize  = 10;
var g_selectedType  = 'point';
var g_segments = 12;

// track last mouse pos for smooth stroke (awesomeness)
var g_lastX = null;
var g_lastY = null;

// dropper -- remembers which brush was active so we can switch back after picking
var g_prevType = 'point';

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  setupEventHandlers();
  updateColor();
  renderAllShapes();
}

function setupWebGL() {
  canvas = document.getElementById('webgl');
  // preserveDrawingBuffer helps performance with lots of shapes
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
  gl.clearColor(0.08, 0.08, 0.08, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

function connectVariablesToGLSL() {
  // compile vertex shader
  var vShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vShader, VSHADER_SOURCE);
  gl.compileShader(vShader);
  if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
    console.log('Vertex shader failed: ' + gl.getShaderInfoLog(vShader));
    return;
  }

  // compile fragment shader
  var fShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fShader, FSHADER_SOURCE);
  gl.compileShader(fShader);
  if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
    console.log('Fragment shader failed: ' + gl.getShaderInfoLog(fShader));
    return;
  }

  // link program
  var program = gl.createProgram();
  gl.attachShader(program, vShader);
  gl.attachShader(program, fShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.log('Link failed: ' + gl.getProgramInfoLog(program));
    return;
  }
  gl.useProgram(program);
  gl.program = program;

  // get locations of GLSL variables
  a_Position = gl.getAttribLocation(program, 'a_Position');
  u_FragColor = gl.getUniformLocation(program, 'u_FragColor');
  u_Size      = gl.getUniformLocation(program, 'u_Size');
}

function setupEventHandlers() {
  canvas.onmousedown = function(ev) {
    g_lastX = null;
    g_lastY = null;
    handleClick(ev);
  };
  canvas.onmousemove = function(ev) {
    if (ev.buttons === 1) handleClick(ev);
  };
  canvas.onmouseup = function() {
    g_lastX = null;
    g_lastY = null;
  };
}

function handleClick(ev) {
  // dropper mode -- sample pixel color instead of drawing
  if (g_selectedType === 'dropper') {
    sampleColor(ev);
    return;
  }

  var rect = canvas.getBoundingClientRect();
  var x = ((ev.clientX - rect.left) - canvas.width / 2)  / (canvas.width / 2);
  var y = (canvas.height / 2 - (ev.clientY - rect.top))  / (canvas.height / 2);

  // awesomeness: fill in gaps between mouse positions so strokes look solid
  // instead of dotted when you drag fast
  if (g_lastX !== null) {
    var dx = x - g_lastX;
    var dy = y - g_lastY;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var steps = Math.floor(dist / 0.008);
    for (var i = 1; i <= steps; i++) {
      var t = i / (steps + 1);
      addShape(g_lastX + dx * t, g_lastY + dy * t);
    }
  }

  addShape(x, y);
  g_lastX = x;
  g_lastY = y;
  renderAllShapes();
}

function addShape(x, y) {
  if (g_selectedType === 'point') {
    g_shapesList.push(new Point([x, y], g_selectedColor.slice(), g_selectedSize));
  } else if (g_selectedType === 'triangle') {
    g_shapesList.push(new Triangle([x, y], g_selectedColor.slice(), g_selectedSize));
  } else {
    g_shapesList.push(new Circle([x, y], g_selectedColor.slice(), g_selectedSize, g_segments));
  }
}

function renderAllShapes() {
  gl.clear(gl.COLOR_BUFFER_BIT);
  for (var i = 0; i < g_shapesList.length; i++) {
    g_shapesList[i].render();
  }
}

function setShape(type) {
  // remember the last drawing brush so dropper can restore it after picking
  if (type === 'dropper' && g_selectedType !== 'dropper') {
    g_prevType = g_selectedType;
  }
  g_selectedType = type;
  document.getElementById('btnPoint').className    = (type === 'point')    ? 'active' : '';
  document.getElementById('btnTriangle').className = (type === 'triangle') ? 'active' : '';
  document.getElementById('btnCircle').className   = (type === 'circle')   ? 'active' : '';
  document.getElementById('btnDropper').className  = (type === 'dropper')  ? 'active' : '';
}

function sampleColor(ev) {
  var rect = canvas.getBoundingClientRect();
  // gl.readPixels origin is bottom-left, so flip Y
  var px = Math.floor(ev.clientX - rect.left);
  var py = Math.floor(canvas.height - (ev.clientY - rect.top));

  var pixel = new Uint8Array(4);
  gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

  // update color state
  g_selectedColor = [pixel[0]/255, pixel[1]/255, pixel[2]/255, 1.0];

  // sync sliders so they reflect the picked color
  document.getElementById('red').value   = pixel[0];
  document.getElementById('green').value = pixel[1];
  document.getElementById('blue').value  = pixel[2];
  document.getElementById('colorPreview').style.background =
    'rgb(' + pixel[0] + ',' + pixel[1] + ',' + pixel[2] + ')';

  // auto switch back to whatever brush was active before
  setShape(g_prevType);
}

function updateColor() {
  var r = parseInt(document.getElementById('red').value)   / 255;
  var g = parseInt(document.getElementById('green').value) / 255;
  var b = parseInt(document.getElementById('blue').value)  / 255;
  g_selectedColor = [r, g, b, 1.0];
  document.getElementById('colorPreview').style.background =
    'rgb(' + Math.round(r*255) + ',' + Math.round(g*255) + ',' + Math.round(b*255) + ')';
}

function updateSize() {
  g_selectedSize = parseFloat(document.getElementById('size').value);
}

function updateSegments() {
  g_segments = parseInt(document.getElementById('segments').value);
}

function clearCanvas() {
  g_shapesList = [];
  renderAllShapes();
}

function drawFox() {
  var foxShapes = buildFoxShapes();
  for (var i = 0; i < foxShapes.length; i++) {
    g_shapesList.push(foxShapes[i]);
  }
  renderAllShapes();
}

window.onload = main;
