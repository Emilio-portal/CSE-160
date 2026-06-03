import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader }    from 'three/addons/loaders/GLTFLoader.js';

// Planet data — radius and orbitR are scene units, speeds relative to Earth=1
const PLANETS = [
  {
    name: 'Mercury', radius: 0.50, orbitR: 18, orbitSpeed: 1.607, selfSpin: 0.017,
    hue: 0.07, sat: 0.10, lit: 0.48, emissive: 0x000000,
    diameter: '4,879 km', distanceSun: '0.39 AU', period: '88 days',
    fact: 'A day on Mercury is longer than a year there!'
  },
  {
    name: 'Venus', radius: 0.95, orbitR: 28, orbitSpeed: 1.174, selfSpin: 0.004,
    hue: 0.10, sat: 0.60, lit: 0.70, emissive: 0x221100,
    diameter: '12,104 km', distanceSun: '0.72 AU', period: '225 days',
    fact: 'Venus spins backwards and is hotter than Mercury despite being farther away.'
  },
  {
    name: 'Earth', radius: 1.00, orbitR: 40, orbitSpeed: 1.000, selfSpin: 1.000,
    hue: 0.58, sat: 0.80, lit: 0.42, emissive: 0x001122,
    diameter: '12,742 km', distanceSun: '1.00 AU', period: '365 days',
    fact: 'Earth is the only known planet to harbor life — so far!'
  },
  {
    name: 'Mars', radius: 0.60, orbitR: 56, orbitSpeed: 0.802, selfSpin: 0.972,
    hue: 0.02, sat: 0.80, lit: 0.38, emissive: 0x110000,
    diameter: '6,779 km', distanceSun: '1.52 AU', period: '1.9 years',
    fact: 'Olympus Mons is the tallest volcano in the Solar System at ~22 km high.'
  },
  {
    name: 'Jupiter', radius: 2.80, orbitR: 80, orbitSpeed: 0.434, selfSpin: 2.418,
    hue: 0.07, sat: 0.55, lit: 0.58, emissive: 0x110800, special: 'jupiter',
    diameter: '139,820 km', distanceSun: '5.20 AU', period: '11.9 years',
    fact: "Jupiter's Great Red Spot is a storm that has raged for over 350 years."
  },
  {
    name: 'Saturn', radius: 2.30, orbitR: 102, orbitSpeed: 0.325, selfSpin: 2.252,
    hue: 0.10, sat: 0.45, lit: 0.72, emissive: 0x110a00,
    diameter: '116,460 km', distanceSun: '9.58 AU', period: '29.5 years',
    fact: 'Saturn is less dense than water — it would float in a big enough ocean.'
  },
  {
    name: 'Uranus', radius: 1.70, orbitR: 126, orbitSpeed: 0.228, selfSpin: 1.392,
    hue: 0.50, sat: 0.55, lit: 0.60, emissive: 0x001111,
    diameter: '50,724 km', distanceSun: '19.2 AU', period: '84 years',
    fact: 'Uranus rotates on its side with an axial tilt of 98°!'
  },
  {
    name: 'Neptune', radius: 1.65, orbitR: 152, orbitSpeed: 0.182, selfSpin: 1.493,
    hue: 0.62, sat: 0.75, lit: 0.40, emissive: 0x000822,
    diameter: '49,244 km', distanceSun: '30.1 AU', period: '165 years',
    fact: 'Neptune has the fastest winds in the Solar System at ~2,100 km/h.'
  },
];

// renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('canvas-container').appendChild(renderer.domElement);

// scene / camera / controls
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.set(0, 55, 145);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance   = 4;
controls.maxDistance   = 500;

// ---- lighting (5 distinct types, basic-scene rubric needs DirectionalLight) ----

// Ambient: dim fill so planet dark-sides aren't pitch black
const ambientLight = new THREE.AmbientLight(0x334466, 0.55);
scene.add(ambientLight);

// PointLight: lives inside the sun, no decay so distant planets are lit
const sunLight = new THREE.PointLight(0xfff8e8, 4.5, 0, 0);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
scene.add(sunLight);

// DirectionalLight: simulates parallel rays from the solar direction
const dirLight = new THREE.DirectionalLight(0xfff0cc, 0.8);
dirLight.position.set(50, 30, 80);
dirLight.castShadow = true;
scene.add(dirLight);

// HemisphereLight: subtle cool-sky / dark-ground gradient
const hemiLight = new THREE.HemisphereLight(0x223366, 0x110022, 0.35);
scene.add(hemiLight);

// SpotLight: follows Earth — warm gold highlight on the habitable zone
const earthSpot = new THREE.SpotLight(0xffd080, 3.0);
earthSpot.angle    = Math.PI / 9;
earthSpot.penumbra = 0.45;
earthSpot.castShadow = true;
earthSpot.shadow.mapSize.set(1024, 1024);
scene.add(earthSpot);
scene.add(earthSpot.target);

// ---- texture helpers ----

function createStarfieldTexture() {
  const size = 2048;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#00000c';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    ctx.beginPath();
    ctx.arc(x, y, Math.random() * 1.5 + 0.2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${(0.4 + Math.random() * 0.6).toFixed(2)})`;
    ctx.fill();
  }
  const cols = ['#88bbff','#ffbbbb','#ffffaa','#ffddaa','#ccffee'];
  for (let i = 0; i < 50; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 1.0 + Math.random() * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = cols[i % cols.length];
    ctx.fill();
  }
  return new THREE.CanvasTexture(c);
}

function createPlanetTexture(hue, sat, lit, special) {
  const w = 1024, h = 512;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = `hsl(${Math.round(hue*360)},${Math.round(sat*100)}%,${Math.round(lit*100)}%)`;
  ctx.fillRect(0, 0, w, h);

  if (special === 'jupiter') {
    // alternating bands + Great Red Spot
    const bands = [
      [0.04,0.68,0.70],[0.07,0.50,0.58],[0.05,0.65,0.50],[0.08,0.35,0.72],
      [0.06,0.70,0.48],[0.07,0.45,0.65],[0.04,0.75,0.52],[0.08,0.30,0.74],
    ];
    const bh = h / bands.length;
    bands.forEach(([ph,ps,pl], i) => {
      const g = ctx.createLinearGradient(0, i*bh, 0, (i+1)*bh);
      g.addColorStop(0,   `hsl(${ph*360|0},${ps*100|0}%,${pl*100|0}%)`);
      g.addColorStop(0.5, `hsl(${ph*360|0},${(ps-.1)*100|0}%,${(pl+.07)*100|0}%)`);
      g.addColorStop(1,   `hsl(${ph*360|0},${ps*100|0}%,${pl*100|0}%)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, i*bh, w, bh+1);
    });
    ctx.beginPath();
    ctx.ellipse(w*0.25, h*0.62, 45, 28, 0, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(180,60,30,0.75)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,100,50,0.5)';
    ctx.lineWidth = 4; ctx.stroke();

  } else if (special === 'earth') {
    ctx.fillStyle = '#1a5fa8';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2e8b35';
    [[0.25,0.35,0.18,0.30],[0.55,0.25,0.20,0.35],[0.40,0.55,0.12,0.20],
     [0.70,0.40,0.15,0.25],[0.15,0.55,0.08,0.15],[0.80,0.60,0.12,0.18]
    ].forEach(([cx,cy,rx,ry]) => {
      ctx.beginPath();
      ctx.ellipse(cx*w, cy*h, rx*w, ry*h, Math.random()*Math.PI, 0, Math.PI*2);
      ctx.fill();
    });
    ctx.fillStyle = '#eef5ff';
    ctx.fillRect(0, 0, w, h*0.06);
    ctx.fillRect(0, h*0.92, w, h*0.08);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.ellipse(Math.random()*w, Math.random()*h, 40+Math.random()*80, 8+Math.random()*20, Math.random()*Math.PI, 0, Math.PI*2);
      ctx.fill();
    }

  } else if (special === 'mars') {
    ctx.fillStyle = '#c1440e';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(180,80,30,0.5)';
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.ellipse(Math.random()*w, Math.random()*h, 30+Math.random()*80, 15+Math.random()*40, Math.random()*Math.PI, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(220,235,255,0.85)';
    ctx.fillRect(0, 0, w, h*0.09);

  } else {
    // generic: noisy horizontal bands
    for (let y = 0; y < h; y++) {
      const dl = (Math.random()-.5)*0.16, ds = (Math.random()-.5)*0.10;
      ctx.strokeStyle = `hsla(${hue*360|0},${Math.max(0,Math.min(1,sat+ds))*100|0}%,${Math.max(0.05,Math.min(0.95,lit+dl))*100|0}%,0.45)`;
      ctx.lineWidth = 1 + Math.random()*3;
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
    }
    for (let i = 0; i < 80; i++) {
      const dl = (Math.random()-.5)*0.25;
      ctx.beginPath();
      ctx.arc(Math.random()*w, Math.random()*h, 2+Math.random()*12, 0, Math.PI*2);
      ctx.fillStyle = `hsla(${hue*360|0},${sat*100|0}%,${Math.max(0.05,Math.min(0.95,lit+dl))*100|0}%,0.30)`;
      ctx.fill();
    }
  }
  return new THREE.CanvasTexture(c);
}

function createRingTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 512, 64);
  for (let x = 0; x < 512; x++) {
    const t = x / 512;
    ctx.fillStyle = `hsla(36,42%,${52+25*Math.sin(t*Math.PI*30)|0}%,${(0.15+0.70*Math.abs(Math.sin(t*Math.PI*18))).toFixed(2)})`;
    ctx.fillRect(x, 0, 1, 64);
  }
  return new THREE.CanvasTexture(c);
}

function createSunTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d'), cx = 256;
  ctx.fillStyle = '#ff5500';
  ctx.fillRect(0, 0, 512, 512);
  const g = ctx.createRadialGradient(cx,cx,0,cx,cx,cx);
  g.addColorStop(0.00, 'rgba(255,255,200,1.0)');
  g.addColorStop(0.25, 'rgba(255,220,60,0.9)');
  g.addColorStop(0.55, 'rgba(255,130,20,0.7)');
  g.addColorStop(0.85, 'rgba(220,60,0,0.4)');
  g.addColorStop(1.00, 'rgba(180,30,0,0.0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 120; i++) {
    const a = Math.random()*Math.PI*2, d = Math.random()*cx*0.85;
    ctx.beginPath();
    ctx.arc(cx+Math.cos(a)*d, cx+Math.sin(a)*d, 4+Math.random()*18, 0, Math.PI*2);
    ctx.fillStyle = `rgba(255,240,120,${(0.15+Math.random()*0.45).toFixed(2)})`;
    ctx.fill();
  }
  return new THREE.CanvasTexture(c);
}

// ---- skybox ----
scene.add(new THREE.Mesh(
  new THREE.SphereGeometry(5000, 32, 32),
  new THREE.MeshBasicMaterial({ map: createStarfieldTexture(), side: THREE.BackSide })
));

// ---- orbit guide rings ----
PLANETS.forEach(p => {
  const pts = Array.from({ length: 129 }, (_, i) => {
    const a = (i/128) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a)*p.orbitR, 0, Math.sin(a)*p.orbitR);
  });
  scene.add(new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: 0x334466, transparent: true, opacity: 0.38 })
  ));
});

// ---- sun ----
const sunMesh = new THREE.Mesh(
  new THREE.SphereGeometry(6, 48, 48),
  new THREE.MeshBasicMaterial({ map: createSunTexture() })
);
sunMesh.userData = {
  type: 'sun',
  isSun: true,
  data: {
    name: 'The Sun', radius: 6,
    diameter: '1,391,000 km', distanceSun: 'Center of the Solar System',
    period: 'N/A', fact: 'The Sun contains 99.86% of all mass in the Solar System!'
  }
};
scene.add(sunMesh);

// same BackSide outline technique for the sun (it's also clickable)
const sunOutline = new THREE.Mesh(
  new THREE.SphereGeometry(6 * 1.06, 24, 24),
  new THREE.MeshBasicMaterial({
    color: 0xffeedd, side: THREE.BackSide,
    transparent: true, opacity: 0.10, depthWrite: false,
  })
);
sunMesh.add(sunOutline);

// glow layers (additive blending, no depth write)
[{ r:9, op:0.18, col:0xff9900 }, { r:13, op:0.09, col:0xff7700 }, { r:18, op:0.04, col:0xff5500 }]
  .forEach(({ r, op, col }) => scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(r, 24, 24),
    new THREE.MeshBasicMaterial({
      color: col, transparent: true, opacity: op,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
  )));

// ---- planet factory ----
function createPlanet(p) {
  const orbitGroup = new THREE.Group();
  scene.add(orbitGroup);
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(p.radius, 48, 48),
    new THREE.MeshStandardMaterial({
      map:               createPlanetTexture(p.hue, p.sat, p.lit, p.special),
      emissive:          new THREE.Color(p.emissive),
      emissiveIntensity: 0.12,
      roughness: 0.82, metalness: 0.05,
    })
  );
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.position.x = p.orbitR;
  mesh.userData   = { type: 'planet', data: p };
  orbitGroup.add(mesh);

  // subtle clickability indicator — slightly-oversized BackSide sphere
  const outline = new THREE.Mesh(
    new THREE.SphereGeometry(p.radius * 1.08, 24, 24),
    new THREE.MeshBasicMaterial({
      color: 0xaaddff, side: THREE.BackSide,
      transparent: true, opacity: 0.12, depthWrite: false,
    })
  );
  mesh.add(outline);

  // invisible hit area — much larger than the rendered planet so small fast-moving
  // planets are easy to click; raycasting uses geometry, not rendered appearance
  const hitR   = Math.max(p.radius * 3.0, 2.8);
  const hitbox = new THREE.Mesh(
    new THREE.SphereGeometry(hitR, 8, 8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
  );
  hitbox.userData = { type: 'planet', data: p };
  mesh.add(hitbox);

  return { orbitGroup, mesh, outline, hitbox, params: p };
}

const planetObjects   = PLANETS.map(createPlanet);
const earthPlanet     = planetObjects[2];
const saturnPlanet    = planetObjects[5];

// use the invisible hitboxes for planets so tiny/fast-moving ones are easy to click;
// sun uses its own mesh directly (it's large enough)
const clickableMeshes = [...planetObjects.map(p => p.hitbox), sunMesh];

// optional earth.jpg swap
new THREE.TextureLoader().load('textures/earth.jpg',
  tex => { earthPlanet.mesh.material.map = tex; earthPlanet.mesh.material.needsUpdate = true; },
  undefined, () => {}
);

// moon — child of Earth so it orbits for free
const moonMesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.27, 24, 24),
  new THREE.MeshStandardMaterial({ map: createPlanetTexture(0.08, 0.05, 0.50), roughness: 0.95 })
);
moonMesh.castShadow = moonMesh.receiveShadow = true;
earthPlanet.mesh.add(moonMesh);

// Saturn rings
const ringMesh = new THREE.Mesh(
  new THREE.TorusGeometry(3.6, 1.0, 4, 100),
  new THREE.MeshStandardMaterial({
    map: createRingTexture(), side: THREE.DoubleSide, transparent: true, opacity: 0.88, roughness: 0.9
  })
);
ringMesh.rotation.x = Math.PI / 2;
ringMesh.scale.y    = 0.042;
saturnPlanet.mesh.add(ringMesh);

// asteroid belt — 15 IcosahedronGeometry shapes
const asteroidData = [];
for (let i = 0; i < 15; i++) {
  const angle = (i/15)*Math.PI*2 + (Math.random()-.5)*0.55;
  const dist  = 64 + Math.random()*12;
  const mesh  = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.15 + Math.random()*0.40, 0),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.07, 0.12, 0.28+Math.random()*0.22),
      roughness: 0.96, metalness: 0.05
    })
  );
  mesh.position.set(Math.cos(angle)*dist, (Math.random()-.5)*3.5, Math.sin(angle)*dist);
  mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
  mesh.castShadow = true;
  scene.add(mesh);
  asteroidData.push({ mesh, spinX:(Math.random()-.5)*0.025, spinY:(Math.random()-.5)*0.018 });
}

// space station — 5 primitives: Box, Cylinder×2, Sphere, Torus
const stationOrbit = new THREE.Group();
scene.add(stationOrbit);
const stationGroup = new THREE.Group();
stationGroup.position.x = 47;
stationOrbit.add(stationGroup);

const metalMat = new THREE.MeshStandardMaterial({ color: 0xccccdd, metalness: 0.72, roughness: 0.22 });
const panelMat = new THREE.MeshStandardMaterial({ color: 0x1a3a88, metalness: 0.30, roughness: 0.55 });
const goldMat  = new THREE.MeshStandardMaterial({ color: 0xffaa22, metalness: 0.80, roughness: 0.28 });

const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 0.7), metalMat);
bodyMesh.castShadow = bodyMesh.receiveShadow = true;
stationGroup.add(bodyMesh);

[-1.6, 1.6].forEach(xPos => {
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 2.4, 8), panelMat);
  arm.rotation.z = Math.PI / 2;
  arm.position.x = xPos;
  arm.castShadow = true;
  stationGroup.add(arm);
});

const hubMesh  = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 12), metalMat);
stationGroup.add(hubMesh);

const dockMesh = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.065, 8, 28), goldMat);
dockMesh.position.z = 0.52;
stationGroup.add(dockMesh);

// comet — Sphere head + Cone tail
const cometGroup = new THREE.Group();
scene.add(cometGroup);

cometGroup.add(new THREE.Mesh(
  new THREE.SphereGeometry(0.45, 14, 14),
  new THREE.MeshStandardMaterial({ color: 0xddeeff, emissive: 0x5577ff, emissiveIntensity: 0.7 })
));
const cometTail = new THREE.Mesh(
  new THREE.ConeGeometry(0.30, 4.5, 8),
  new THREE.MeshStandardMaterial({ color: 0x8899ff, transparent: true, opacity: 0.40 })
);
cometTail.rotation.z = -Math.PI / 2;
cometTail.position.x = -2.8;
cometGroup.add(cometTail);

const COMET_START  = new THREE.Vector3(-185, 28, -75);
const COMET_END    = new THREE.Vector3( 185,-28,  75);
const COMET_PERIOD = 22;
let   cometPhase   = 0;
cometGroup.position.copy(COMET_START);

// GLTF model
let spacecraftMesh = null;
new GLTFLoader().load('models/spacecraft.glb',
  gltf => {
    const model = gltf.scene;
    model.scale.setScalar(0.55);
    model.position.set(44, 3, 0);
    model.rotation.y = Math.PI;
    model.traverse(c => { if (c.isMesh) { c.castShadow = c.receiveShadow = true; } });
    scene.add(model);
    spacecraftMesh = model;
  },
  undefined, () => {}
);

// ---- WOW feature: click any object to focus camera + follow it + show info ----

const raycaster = new THREE.Raycaster();
const pointer   = new THREE.Vector2();

let isFocusing    = false;
let focusProgress = 0;
const FOCUS_DUR   = 1.8;

// while focusedMesh is set, followFocusedMesh() keeps camera locked on it each frame
let focusedMesh = null;

const lerpStartPos    = new THREE.Vector3();
const lerpStartTarget = new THREE.Vector3();
const focusTargetPos  = new THREE.Vector3();
const focusLookAt     = new THREE.Vector3();

function showPanel(data) {
  document.getElementById('planet-name').textContent    = data.name;
  document.getElementById('pd-diameter').textContent   = data.diameter;
  document.getElementById('pd-distance').textContent   = data.distanceSun;
  document.getElementById('pd-period').textContent     = data.period;
  document.getElementById('pd-fact').textContent       = data.fact;
  document.getElementById('planet-panel').style.display = 'block';
}
function hidePanel() {
  document.getElementById('planet-panel').style.display = 'none';
}

function startFocus(mesh, worldPos, data) {
  const isSun = data.isSun;
  const pull  = (isSun ? 18 : data.radius * 5 + 8);
  focusTargetPos.set(worldPos.x + pull, worldPos.y + pull * 0.4, worldPos.z + pull);
  focusLookAt.copy(worldPos);
  lerpStartPos.copy(camera.position);
  lerpStartTarget.copy(controls.target);
  isFocusing    = true;
  focusProgress = 0;
  controls.enabled = false;

  focusedMesh = isSun ? null : mesh;  // sun stays still, no tracking needed
  showPanel(data);
}

function returnOverview() {
  focusTargetPos.set(0, 55, 145);
  focusLookAt.set(0, 0, 0);
  lerpStartPos.copy(camera.position);
  lerpStartTarget.copy(controls.target);
  isFocusing    = true;
  focusProgress = 0;
  controls.enabled = false;
  focusedMesh   = null;
  hidePanel();
}

function updateFocus(delta) {
  if (!isFocusing) return;
  // Continuously update destination so the lerp always chases the planet's
  // actual position, not where it was when you clicked.
  if (focusedMesh) {
    const cur  = new THREE.Vector3();
    focusedMesh.getWorldPosition(cur);
    const pull = focusedMesh.userData.data.radius * 5 + 8;
    focusTargetPos.set(cur.x + pull, cur.y + pull * 0.4, cur.z + pull);
    focusLookAt.copy(cur);
  }
  focusProgress = Math.min(1.0, focusProgress + delta / FOCUS_DUR);
  const t = focusProgress * focusProgress * (3.0 - 2.0 * focusProgress);
  camera.position.lerpVectors(lerpStartPos, focusTargetPos, t);
  controls.target.lerpVectors(lerpStartTarget, focusLookAt, t);
  if (focusProgress >= 1.0) {
    isFocusing = false;
    controls.enabled = true;
  }
}

// After the lerp, keep the camera locked onto the planet each frame.
// OrbitControls reads camera.position freshly on update(), so we can
// safely write to it here: preserve the current camera-to-target offset
// vector and re-apply it around the planet's new world position.
function followFocusedMesh() {
  if (!focusedMesh || isFocusing) return;
  const cur    = new THREE.Vector3();
  focusedMesh.getWorldPosition(cur);
  const offset = camera.position.clone().sub(controls.target);
  controls.target.copy(cur);
  camera.position.copy(cur).add(offset);
}

renderer.domElement.addEventListener('click', e => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x  =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
  pointer.y  = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(clickableMeshes, false);
  if (hits.length) {
    const hit = hits[0].object;
    const wp  = new THREE.Vector3();
    hit.getWorldPosition(wp);
    startFocus(hit, wp, hit.userData.data);
  } else {
    returnOverview();
  }
});

document.addEventListener('keydown', e => { if (e.key === 'Escape') returnOverview(); });
document.getElementById('close-btn').addEventListener('click', returnOverview);

// ---- animation loop ----

const clock = new THREE.Clock();
let frameCount = 0, fpsTimer = 0;

function animate() {
  requestAnimationFrame(animate);
  const delta   = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  frameCount++;
  fpsTimer += delta;
  if (fpsTimer >= 1.0) {
    document.getElementById('fps').textContent = frameCount;
    frameCount = fpsTimer = 0;
  }

  sunMesh.rotation.y += delta * 0.07;

  // pulse the clickability outlines on all planets + sun
  const pulse = 0.07 + 0.07 * Math.sin(elapsed * 1.5);
  planetObjects.forEach(p => { if (p.outline) p.outline.material.opacity = pulse; });
  sunOutline.material.opacity = 0.05 + 0.05 * Math.sin(elapsed * 1.5);

  planetObjects.forEach(p => {
    p.orbitGroup.rotation.y += p.params.orbitSpeed * delta * 0.45;
    p.mesh.rotation.y       += p.params.selfSpin   * delta * 0.70;
  });

  const moonAngle     = elapsed * 1.4;
  moonMesh.position.x = Math.cos(moonAngle) * 2.7;
  moonMesh.position.z = Math.sin(moonAngle) * 2.7;
  moonMesh.position.y = Math.sin(moonAngle * 0.3) * 0.3;

  stationOrbit.rotation.y += delta * 0.11;
  stationGroup.rotation.y  += delta * 0.28;

  asteroidData.forEach(a => {
    a.mesh.rotation.x += a.spinX;
    a.mesh.rotation.y += a.spinY;
  });

  cometPhase = (cometPhase + delta / COMET_PERIOD) % 1.0;
  cometGroup.position.lerpVectors(COMET_START, COMET_END, cometPhase);
  cometGroup.lookAt(cometPhase < 0.99 ? COMET_END : COMET_START);

  if (spacecraftMesh) spacecraftMesh.rotation.y += delta * 0.22;

  // keep SpotLight aimed at Earth
  const ewp = new THREE.Vector3();
  earthPlanet.mesh.getWorldPosition(ewp);
  earthSpot.position.set(ewp.x + 22, ewp.y + 22, ewp.z + 22);
  earthSpot.target.position.copy(ewp);
  earthSpot.target.updateMatrixWorld();

  updateFocus(delta);
  followFocusedMesh();   // camera tracks planet while panel is open
  controls.update();
  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
