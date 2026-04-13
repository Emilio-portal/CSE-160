// asg1.js  —  CSE 160 Assignment 1
// E.P. Fox WebGL Paint Program

// =========================================================
// SHADER PROGRAMS
// =========================================================
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

// =========================================================
// GLOBAL STATE
// =========================================================
var gl;
var canvas;
var a_Position;
var u_FragColor;
var u_Size;

var g_shapesList    = [];
var g_selectedColor = [0.86, 0.24, 0.04, 1.0];
var g_selectedSize  = 10;
var g_selectedType  = 'point';
var g_segments      = 12;

// For smooth stroke interpolation (awesomeness)
var g_lastX = null;
var g_lastY = null;

// =========================================================
// ENTRY POINT
// =========================================================
function main() {
  setupWebGL();
  connectVariablesToGLSL();
  setupEventHandlers();
  updateColor(); // sync color preview
  renderAllShapes();
}

// =========================================================
// 1. SETUP WEBGL
// =========================================================
function setupWebGL() {
  canvas = document.getElementById('webgl');
  // preserveDrawingBuffer: prevents re-clear on resize, helps perf
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) {
    console.error('Failed to get WebGL rendering context');
    return;
  }
  gl.clearColor(0.08, 0.08, 0.08, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

// =========================================================
// 2. CONNECT JAVASCRIPT VARIABLES TO GLSL
// =========================================================
function connectVariablesToGLSL() {
  // -- Compile vertex shader --
  var vShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vShader, VSHADER_SOURCE);
  gl.compileShader(vShader);
  if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
    console.error('Vertex shader error:', gl.getShaderInfoLog(vShader));
    return;
  }

  // -- Compile fragment shader --
  var fShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fShader, FSHADER_SOURCE);
  gl.compileShader(fShader);
  if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
    console.error('Fragment shader error:', gl.getShaderInfoLog(fShader));
    return;
  }

  // -- Link program --
  var program = gl.createProgram();
  gl.attachShader(program, vShader);
  gl.attachShader(program, fShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    return;
  }
  gl.useProgram(program);
  gl.program = program;

  // -- Get variable locations --
  a_Position = gl.getAttribLocation(program, 'a_Position');
  u_FragColor = gl.getUniformLocation(program, 'u_FragColor');
  u_Size      = gl.getUniformLocation(program, 'u_Size');

  if (a_Position < 0 || !u_FragColor || !u_Size) {
    console.error('Failed to get GLSL variable locations');
  }
}

// =========================================================
// 3. EVENT HANDLERS
// =========================================================
function setupEventHandlers() {
  canvas.onmousedown = function(ev) {
    g_lastX = null;
    g_lastY = null;
    handleClick(ev);
  };
  canvas.onmousemove = function(ev) {
    if (ev.buttons === 1) {
      handleClick(ev);
    }
  };
  canvas.onmouseup = function() {
    g_lastX = null;
    g_lastY = null;
  };
}

// =========================================================
// 4. CLICK / DRAG HANDLER
// =========================================================
function handleClick(ev) {
  // Convert from canvas pixel coords to WebGL [-1, 1] coords
  var rect = canvas.getBoundingClientRect();
  var x = ((ev.clientX - rect.left) - canvas.width  / 2) / (canvas.width  / 2);
  var y = (canvas.height / 2 - (ev.clientY - rect.top)) / (canvas.height / 2);

  // ✨ AWESOMENESS: smooth stroke interpolation
  // Fills in the gaps when the mouse moves fast, so strokes look
  // continuous rather than dotted. Interpolates between last and
  // current mouse position.
  if (g_lastX !== null && g_lastY !== null) {
    var dx = x - g_lastX;
    var dy = y - g_lastY;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var stepSize = 0.008; // sample every 0.008 units
    var steps = Math.floor(dist / stepSize);
    for (var i = 1; i <= steps; i++) {
      var t  = i / (steps + 1);
      var ix = g_lastX + dx * t;
      var iy = g_lastY + dy * t;
      spawnShape(ix, iy);
    }
  }

  spawnShape(x, y);
  g_lastX = x;
  g_lastY = y;

  renderAllShapes();
}

function spawnShape(x, y) {
  var shape;
  if (g_selectedType === 'point') {
    shape = new Point([x, y], g_selectedColor.slice(), g_selectedSize);
  } else if (g_selectedType === 'triangle') {
    shape = new Triangle([x, y], g_selectedColor.slice(), g_selectedSize);
  } else {
    shape = new Circle([x, y], g_selectedColor.slice(), g_selectedSize, g_segments);
  }
  g_shapesList.push(shape);
}

// =========================================================
// 5. RENDER ALL SHAPES
// =========================================================
function renderAllShapes() {
  gl.clear(gl.COLOR_BUFFER_BIT);
  for (var i = 0; i < g_shapesList.length; i++) {
    g_shapesList[i].render();
  }
}

// =========================================================
// 6. UI CONTROL FUNCTIONS
// =========================================================
function setShape(type) {
  g_selectedType = type;
  document.getElementById('btnPoint').className    = type === 'point'    ? 'active' : '';
  document.getElementById('btnTriangle').className = type === 'triangle' ? 'active' : '';
  document.getElementById('btnCircle').className   = type === 'circle'   ? 'active' : '';
}

function updateColor() {
  var r = parseInt(document.getElementById('red').value)   / 255;
  var g = parseInt(document.getElementById('green').value) / 255;
  var b = parseInt(document.getElementById('blue').value)  / 255;
  g_selectedColor = [r, g, b, 1.0];
  // update the little color swatch
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

// =========================================================
// INIT
// =========================================================
window.onload = main;
