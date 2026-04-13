// Fox.js -- E.P. fox face, CSE 160 Asg1
// 28 triangles, coords mapped from graph paper sketch to [-1,1] WebGL space
// E initial = two pointed ears, P initial = :P mouth + tongue

class FoxTri {
  constructor(verts, color) {
    this.verts = verts;
    this.color = color;
  }
  render() {
    drawTriangle(this.verts, this.color);
  }
}

var C_ORG  = [0.90, 0.45, 0.10, 1.0]; // orange
var C_LT   = [1.00, 0.65, 0.25, 1.0]; // light orange
var C_CRM  = [0.95, 0.88, 0.75, 1.0]; // cream
var C_DRK  = [0.12, 0.08, 0.05, 1.0]; // dark brown
var C_SHD  = [0.70, 0.28, 0.04, 1.0]; // shadow
var C_TONG = [0.96, 0.68, 0.62, 1.0]; // pink

function buildFoxShapes() {
  var s = [];

  var LEar  = [-0.38,  0.90];
  var REar  = [ 0.38,  0.90];
  var LEB_L = [-0.68,  0.50];
  var LEB_R = [-0.08,  0.50];
  var REB_L = [ 0.08,  0.50];
  var REB_R = [ 0.68,  0.50];
  var TC    = [ 0.00,  0.50];
  var LCH   = [-0.78,  0.02];
  var RCH   = [ 0.78,  0.02];
  var CM    = [ 0.00,  0.18];
  var LEL   = [-0.45,  0.20];
  var LER   = [-0.17,  0.20];
  var LEB2  = [-0.31,  0.06];
  var REL   = [ 0.17,  0.20];
  var RER   = [ 0.45,  0.20];
  var REB2  = [ 0.31,  0.06];
  var NL    = [-0.12, -0.02];
  var NR    = [ 0.12, -0.02];
  var NT    = [ 0.00, -0.18];
  var MBL   = [-0.30, -0.28];
  var MBR   = [ 0.30, -0.28];
  var MCB   = [ 0.00, -0.30];
  var LLF   = [-0.55, -0.35];
  var RLF   = [ 0.55, -0.35];
  var CHIN  = [ 0.00, -0.86];
  var LCN   = [-0.25, -0.60];
  var RCN   = [ 0.25, -0.60];

  // ears (outer orange + inner cream)
  s.push(new FoxTri([...LEar, ...LEB_L, ...LEB_R], C_ORG));
  s.push(new FoxTri([-0.38, 0.78, -0.56, 0.55, -0.20, 0.55], C_CRM));
  s.push(new FoxTri([...REar, ...REB_L, ...REB_R], C_ORG));
  s.push(new FoxTri([ 0.38, 0.78,  0.20, 0.55,  0.56, 0.55], C_CRM));

  // upper face
  s.push(new FoxTri([...LEB_R, ...LEB_L, ...CM], C_ORG));
  s.push(new FoxTri([...REB_L, ...CM, ...REB_R], C_LT));
  s.push(new FoxTri([...LEB_R, ...TC,  ...REB_L], C_CRM));
  s.push(new FoxTri([...LEB_L, ...LCH, ...CM], C_SHD));
  s.push(new FoxTri([...REB_R, ...CM,  ...RCH], C_SHD));
  s.push(new FoxTri([...CM,    ...LCH, ...RCH], C_ORG));

  // muzzle cream (drawn first so eyes/nose layer on top)
  s.push(new FoxTri([-0.50, 0.04,  0.50, 0.04, -0.30, -0.28], C_CRM));
  s.push(new FoxTri([ 0.50, 0.04,  0.30, -0.28, -0.30, -0.28], C_CRM));

  // eyes
  s.push(new FoxTri([...LEL, ...LER, ...LEB2], C_DRK));
  s.push(new FoxTri([...REL, ...RER, ...REB2], C_DRK));

  // cheeks
  s.push(new FoxTri([...LCH, ...LLF, ...CM],  C_ORG));
  s.push(new FoxTri([...RCH, ...CM,  ...RLF], C_ORG));

  // nose
  s.push(new FoxTri([...NL, ...NR, ...NT], C_DRK));

  // muzzle bottom
  s.push(new FoxTri([...MBL, ...MCB, ...MBR], C_CRM));

  // lower face / chin
  s.push(new FoxTri([...LLF, ...LCN, ...MBL], C_SHD));
  s.push(new FoxTri([...RLF, ...MBR, ...RCN], C_SHD));
  s.push(new FoxTri([...LCN, ...CHIN, ...MCB], C_ORG));
  s.push(new FoxTri([...RCN, ...MCB,  ...CHIN], C_ORG));
  s.push(new FoxTri([...MBL, ...MCB, ...LCN], C_SHD));
  s.push(new FoxTri([...MBR, ...RCN, ...MCB], C_SHD));

  // :P mouth
  s.push(new FoxTri([-0.16, -0.21,  0.12, -0.21,  0.00, -0.28], C_TONG)); // lip bar
  s.push(new FoxTri([-0.15, -0.22,  0.08, -0.21,  0.00, -0.27], C_DRK));  // slit
  s.push(new FoxTri([-0.05, -0.23,  0.04, -0.23,  0.00, -0.27], C_CRM));  // teeth
  s.push(new FoxTri([ 0.04, -0.21,  0.20, -0.20,  0.16, -0.28], C_TONG)); // tongue

  return s; // 28 triangles
}
