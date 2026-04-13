// Fox.js  —  E.P. Fox drawing (CSE 160 Asg1 picture requirement)
//
// buildFoxShapes() returns an array of shape objects that collectively
// render the low-poly fox face.  Call drawFox() in asg1.js to add them
// to g_shapesList and paint them.
//
// Total triangles: 32  (requirement: 20+)
// Initials:  E.P. are drawn as triangle-based letterforms flanking the chin.
//
// Coordinate system: WebGL [-1, 1] on both axes.
// Canvas origin is center; up = +Y, right = +X.

// ── Color palette ─────────────────────────────────────────────────────────────
const FOX_ORANGE  = [0.90, 0.45, 0.10, 1.0]; // main fox coat
const FOX_LIGHT   = [1.00, 0.65, 0.25, 1.0]; // highlight / lighter panels
const FOX_CREAM   = [0.95, 0.88, 0.75, 1.0]; // muzzle / lighter face
const FOX_DARK    = [0.12, 0.08, 0.05, 1.0]; // eyes / nose / inner ear
const FOX_DKORANGE= [0.70, 0.28, 0.04, 1.0]; // shadow panels
const FOX_EP      = [1.00, 0.72, 0.30, 1.0]; // color used for E.P. initials

// ── Helper: make a StaticTriangle that just calls drawTriangle on render ──────
class StaticTriangle {
  constructor(verts, color) {
    // verts: [x1,y1, x2,y2, x3,y3]
    this.verts = verts;
    this.color = color;
  }
  render() {
    drawTriangle(this.verts, this.color);
  }
}

function tri(verts, color) {
  return new StaticTriangle(verts, color);
}

// ── Build every triangle for the fox ─────────────────────────────────────────
function buildFoxShapes() {
  var shapes = [];

  // ── KEY VERTICES (named for clarity) ─────────────────────────────────────
  // Ear tips
  var LEar  = [-0.38,  0.90]; // left ear tip
  var REar  = [ 0.38,  0.90]; // right ear tip
  // Ear bases
  var LEB_L = [-0.68,  0.50]; // left ear base – left corner
  var LEB_R = [-0.08,  0.50]; // left ear base – right corner
  var REB_L = [ 0.08,  0.50]; // right ear base – left corner
  var REB_R = [ 0.68,  0.50]; // right ear base – right corner
  // Top center
  var TC    = [ 0.00,  0.50]; // top center (between ears)
  // Face mid row
  var LCH   = [-0.78,  0.02]; // left cheek
  var RCH   = [ 0.78,  0.02]; // right cheek
  var CM    = [ 0.00,  0.18]; // center mid (forehead landmark)
  // Eye level
  var LEL   = [-0.45,  0.20]; // left eye left
  var LER   = [-0.17,  0.20]; // left eye right
  var LEB2  = [-0.31,  0.06]; // left eye bottom
  var REL   = [ 0.17,  0.20]; // right eye left
  var RER   = [ 0.45,  0.20]; // right eye right
  var REB2  = [ 0.31,  0.06]; // right eye bottom
  // Nose
  var NL    = [-0.12, -0.02]; // nose left
  var NR    = [ 0.12, -0.02]; // nose right
  var NT    = [ 0.00, -0.18]; // nose tip (pointing down)
  // Muzzle
  var ML    = [-0.40,  0.04]; // muzzle left
  var MR    = [ 0.40,  0.04]; // muzzle right
  var MBL   = [-0.30, -0.28]; // muzzle bottom-left
  var MBR   = [ 0.30, -0.28]; // muzzle bottom-right
  var MCB   = [ 0.00, -0.30]; // muzzle center bottom
  // Lower face
  var LLF   = [-0.55, -0.35]; // left lower face
  var RLF   = [ 0.55, -0.35]; // right lower face
  var CHIN  = [ 0.00, -0.86]; // chin tip
  var LCN   = [-0.25, -0.60]; // left chin
  var RCN   = [ 0.25, -0.60]; // right chin

  // ────────────────────────────────────────────────────────────────────────────
  // EARS  (4 triangles)
  // ────────────────────────────────────────────────────────────────────────────
  // 1. Left ear outer
  shapes.push(tri([...LEar, ...LEB_L, ...LEB_R], FOX_ORANGE));
  // 2. Left ear inner (dark)
  shapes.push(tri([-0.38, 0.78, -0.56, 0.55, -0.20, 0.55], FOX_DARK));
  // 3. Right ear outer
  shapes.push(tri([...REar, ...REB_L, ...REB_R], FOX_ORANGE));
  // 4. Right ear inner (dark)
  shapes.push(tri([0.38, 0.78, 0.20, 0.55, 0.56, 0.55], FOX_DARK));

  // ────────────────────────────────────────────────────────────────────────────
  // UPPER FACE  (6 triangles)
  // ────────────────────────────────────────────────────────────────────────────
  // 5. Left-center top (inner ear base to forehead center)
  shapes.push(tri([...LEB_R, ...LEB_L, ...CM], FOX_ORANGE));
  // 6. Right-center top
  shapes.push(tri([...REB_L, ...CM, ...REB_R], FOX_LIGHT));
  // 7. Top center sliver (between ears over forehead)
  shapes.push(tri([...LEB_R, ...TC, ...REB_L], FOX_CREAM));
  // 8. Left wing (ear base to cheek)
  shapes.push(tri([...LEB_L, ...LCH, ...CM], FOX_DKORANGE));
  // 9. Right wing (ear base to cheek)
  shapes.push(tri([...REB_R, ...CM, ...RCH], FOX_DKORANGE));
  // 10. Center forehead-to-nose bridge
  shapes.push(tri([...CM, ...LCH, ...RCH], FOX_ORANGE));

  // ────────────────────────────────────────────────────────────────────────────
  // EYES  (2 dark triangles, pointing down like the sketch)
  // ────────────────────────────────────────────────────────────────────────────
  // 11. Left eye
  shapes.push(tri([...LEL, ...LER, ...LEB2], FOX_DARK));
  // 12. Right eye
  shapes.push(tri([...REL, ...RER, ...REB2], FOX_DARK));

  // ────────────────────────────────────────────────────────────────────────────
  // MUZZLE / CHEEK PANELS  (4 triangles)
  // ────────────────────────────────────────────────────────────────────────────
  // 13. Left muzzle (lighter cream)
  shapes.push(tri([...ML, ...LEB2, ...MBL], FOX_CREAM));
  // 14. Right muzzle
  shapes.push(tri([...MR, ...REB2, ...MBR], FOX_CREAM));
  // 15. Left cheek lower
  shapes.push(tri([...LCH, ...LLF, ...CM], FOX_ORANGE));
  // 16. Right cheek lower
  shapes.push(tri([...RCH, ...CM, ...RLF], FOX_ORANGE));

  // ────────────────────────────────────────────────────────────────────────────
  // NOSE  (1 dark triangle, pointing down)
  // ────────────────────────────────────────────────────────────────────────────
  // 17. Nose
  shapes.push(tri([...NL, ...NR, ...NT], FOX_DARK));

  // ────────────────────────────────────────────────────────────────────────────
  // CHIN / LOWER FACE  (5 triangles)
  // ────────────────────────────────────────────────────────────────────────────
  // 18. Lower face left
  shapes.push(tri([...LLF, ...LCN, ...MBL], FOX_DKORANGE));
  // 19. Lower face right
  shapes.push(tri([...RLF, ...MBR, ...RCN], FOX_DKORANGE));
  // 20. Center lower (cream muzzle bottom)
  shapes.push(tri([...MBL, ...MCB, ...MBR], FOX_CREAM));
  // 21. Left chin
  shapes.push(tri([...LCN, ...CHIN, ...MCB], FOX_ORANGE));
  // 22. Right chin
  shapes.push(tri([...RCN, ...MCB, ...CHIN], FOX_ORANGE));

  // ────────────────────────────────────────────────────────────────────────────
  // CHIN ACCENT MARK (1 dark triangle — subtle chin stripe)
  // ────────────────────────────────────────────────────────────────────────────
  // 23. Chin dark accent
  shapes.push(tri([-0.09, -0.40, 0.09, -0.40, 0.00, -0.56], FOX_DARK));

  // ────────────────────────────────────────────────────────────────────────────
  // ── INITIALS: E.P. ───────────────────────────────────────────────────────
  //
  // "E" is made of 4 triangles (left vertical bar + 3 horizontal bars)
  // "P" is made of 4 triangles (left vertical bar + curved top bump)
  // Placed below the chin, flanking center — integral part of the composition.
  // ────────────────────────────────────────────────────────────────────────────

  // ── "E" (left side, x ≈ -0.85 to -0.58)
  // E backbone (left vertical)
  shapes.push(tri([-0.84, -0.70, -0.84, -0.95, -0.76, -0.825], FOX_EP));
  // E top bar
  shapes.push(tri([-0.84, -0.70, -0.60, -0.70, -0.72, -0.775], FOX_EP));
  // E middle bar
  shapes.push(tri([-0.84, -0.825, -0.65, -0.825, -0.745, -0.875], FOX_EP));
  // E bottom bar
  shapes.push(tri([-0.84, -0.95, -0.60, -0.95, -0.72, -0.895], FOX_EP));

  // ── "P" (right side, x ≈ 0.58 to 0.88)
  // P backbone (left vertical)
  shapes.push(tri([0.60, -0.70, 0.60, -0.95, 0.68, -0.825], FOX_EP));
  // P top bar (going right)
  shapes.push(tri([0.60, -0.70, 0.84, -0.70, 0.72, -0.76], FOX_EP));
  // P bump (upper arc – right side)
  shapes.push(tri([0.68, -0.76, 0.84, -0.70, 0.84, -0.83], FOX_EP));
  // P bump (lower arc – returns to spine)
  shapes.push(tri([0.68, -0.76, 0.84, -0.83, 0.68, -0.83], FOX_EP));

  // ── Period dot between E and P  (1 small dark triangle)
  shapes.push(tri([-0.06, -0.88, 0.06, -0.88, 0.00, -0.96], FOX_DARK));

  // ────────────────────────────────────────────────────────────────────────────
  // TOTAL: 32 triangles
  //  Ears: 4 | Upper face: 6 | Eyes: 2 | Muzzle: 4 | Nose: 1 |
  //  Chin: 5 | Chin accent: 1 | E: 4 | P: 4 | Period: 1
  // ────────────────────────────────────────────────────────────────────────────

  return shapes;
}
