/* ---------- 3D glass body ---------- */
const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.module.min.js';
const G = { zone: 'all', yaw: OVERVIEW_CAM.yaw, pitch: 0.06, ty: OVERVIEW_CAM.y, vh: OVERVIEW_CAM.h, zoom: 1, spin: !RM, anim: null, lastInt: 0, hoverZone: 0, hoverPart: null, scale: 1, pend: null, shellA: 0, shellT: 1, rulerKey: '' };
const LAY = { W: 0, H: 0, cx: 0, cy: 0, R: 0, rw: 0, huds: [] };
const ALPHA_MUL = { hair: 0.6, face: 0.75, bones: 0.5, breasts: 0.5, vessels: 0.85 };
let THREE = null, renderer = null, scene = null, camera = null, body = null, raycaster = null, PROXM = null, SPH = null;
const TIMEU = { value: 0 };
const MATS = {}, HITS = [], ZPROX = [];
const T3 = { scene: false, built: false };
let CO = [], DRAG = null;
const PTRS = new Map();

const VS = `varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }`;
const FS_PART = `uniform vec3 uColor; uniform float uAlpha; uniform float uGlow; uniform float uPulse; uniform float uTime; uniform float uPattern;
varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){
  vec3 n = normalize(vN); if(!gl_FrontFacing) n = -n;
  vec3 v = normalize(vV);
  float ndv = clamp(dot(n, v), 0.0, 1.0);
  float fres = pow(1.0 - ndv, 2.2);
  vec3 L = normalize(vec3(-0.35, 0.65, 0.7));
  float dif = 0.66 + 0.34 * max(dot(n, L), 0.0);
  float spec = pow(max(dot(n, normalize(L + v)), 0.0), 40.0);
  float pulse = uPulse * (0.5 + 0.5 * sin(uTime * 3.4));
  vec3 base = uColor;
  if (uPattern > 0.5 && uPattern < 1.5) {
    float s = sin(vP.x * 420.0 + 3.0 * sin(vP.y * 260.0)) * sin(vP.y * 400.0 + 3.0 * sin(vP.z * 300.0)) * sin(vP.z * 380.0 + 3.0 * sin(vP.x * 280.0));
    base *= 0.74 + 0.34 * smoothstep(-0.3, 0.5, s);
  } else if (uPattern > 1.5) {
    float s = sin(atan(vP.x, vP.z) * 90.0 + vP.y * 140.0);
    base *= 0.72 + 0.34 * s * s;
  }
  vec3 col = base * dif * (0.85 + 0.4 * uGlow) + mix(base, vec3(1.0), 0.45) * fres * (0.9 + uGlow) + vec3(spec * 0.55) + base * pulse * 0.45;
  float a = uAlpha * (0.6 + 0.4 * fres) + spec * 0.25 * uAlpha + pulse * 0.18 * uAlpha + uGlow * 0.12;
  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
}`;
const FS_SHELL = `uniform float uOpacity; uniform float uScan; uniform float uHover;
varying vec3 vN; varying vec3 vV; varying vec3 vP;
float zoneOf(vec3 p){ if (p.y > 1.49) return 1.0; if (p.y > 0.86 && abs(p.x) < 0.165) return 2.0; return 3.0; }
void main(){
  vec3 n = normalize(vN); if(!gl_FrontFacing) n = -n;
  vec3 v = normalize(vV);
  float ndv = clamp(abs(dot(n, v)), 0.0, 1.0);
  float fres = pow(1.0 - ndv, 2.6);
  vec3 L = normalize(vec3(-0.35, 0.7, 0.6));
  float spec = pow(max(dot(n, normalize(L + v)), 0.0), 70.0);
  float t = vP.y * 30.0;
  float g = abs(fract(t - 0.5) - 0.5) / max(fwidth(t), 1e-4);
  float line = (1.0 - min(g, 1.0)) * (0.35 + 0.65 * fres);
  float scan = uScan > 0.0 ? smoothstep(0.035, 0.0, abs(vP.y - uScan)) : 0.0;
  float hov = (uHover > 0.5 && abs(zoneOf(vP) - uHover) < 0.1) ? 1.0 : 0.0;
  vec3 col = mix(vec3(0.75, 0.9, 1.0), vec3(0.62, 0.9, 1.0), fres) + vec3(spec) + vec3(0.55, 0.95, 1.0) * scan + vec3(0.3, 0.75, 1.0) * hov * 0.5;
  float a = uOpacity * (0.035 + fres * 0.62 + line * 0.07) + spec * 0.35 * uOpacity + scan * 0.35 * uOpacity + hov * (0.1 + fres * 0.25);
  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
}`;
const FS_FLOOR = `uniform float uTime; varying vec2 vU;
void main(){
  vec2 p = (vU - 0.5) * 2.0; float r = length(p); float an = atan(p.y, p.x);
  float ring1 = smoothstep(0.012, 0.0, abs(r - 0.9)) * 0.8;
  float ring2 = smoothstep(0.008, 0.0, abs(r - 0.62)) * 0.55;
  float ticks = step(0.93, r) * step(r, 0.99) * step(0.55, fract(an * 48.0 / 6.2832 + uTime * 0.04)) * 0.35;
  float wave = smoothstep(0.02, 0.0, abs(r - fract(uTime * 0.22))) * (1.0 - r) * 0.9;
  float glow = pow(max(1.0 - r, 0.0), 2.0) * 0.5;
  float v = ring1 + ring2 + ticks + wave + glow;
  gl_FragColor = vec4(vec3(0.45, 0.85, 1.0), v);
}`;
const VS_UV = `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

function mkPartMat(part, side) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(SEVC[0]) }, uAlpha: { value: 0 }, uGlow: { value: 0 }, uPulse: { value: 0 }, uTime: TIMEU, uPattern: { value: part === 'brain' ? 1 : part === 'hair' ? 2 : 0 } },
    vertexShader: VS, fragmentShader: FS_PART, transparent: true, depthWrite: false, side: THREE.DoubleSide
  });
  m.userData = { part, side, a: 0, g: 0, p: 0, ta: 0.3, tg: 0, tp: 0 };
  return m;
}
const matFor = (part, side) => MATS[part + ':' + side] || (MATS[part + ':' + side] = mkPartMat(part, side));
// groups: head parts and trunk organs are shared; shell, skeleton and sex-specific organs live in one group per sex
let HEADG = null, TRUNKG = null;
const SEXG = {}, SHELLM = { M: [], F: [] }, BUILT = { common: false, M: false, F: false }, BUILDING = {};
const tagOf = g => g === SEXG.M ? 'M' : g === SEXG.F ? 'F' : '';
function addPart(part, side, mesh, noHit, g) {
  g = g || HEADG;
  mesh.material = matFor(part, side); mesh.renderOrder = part === 'bones' ? 5 : 10; mesh.userData = { part, side, sex: tagOf(g) };
  g.add(mesh); if (!noHit) HITS.push(mesh); return mesh;
}
function addProxy(part, side, mesh, g) { g = g || HEADG; mesh.material = PROXM; mesh.userData = { part, side, sex: tagOf(g) }; g.add(mesh); HITS.push(mesh); }
function addZone(zone, mesh, g) { mesh.material = PROXM; mesh.userData = { zone, sex: tagOf(g) }; g.add(mesh); ZPROX.push(mesh); }
const V3 = a => new THREE.Vector3(a[0], a[1], a[2]);
const mir = (p, s) => [p[0] * s, p[1], p[2]];
const plus = (a, d) => [a[0] + d[0], a[1] + d[1], a[2] + d[2]];
function capsule(a, b, r) {
  const A = V3(a), B = V3(b), len = A.distanceTo(B);
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(len, 1e-4), 4, 10));
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return m;
}
function blob(c, s, rot) { const m = new THREE.Mesh(SPH); m.position.set(c[0], c[1], c[2]); m.scale.set(s[0], s[1], s[2]); if (rot) m.rotation.set(rot[0], rot[1], rot[2]); return m; }
function tube(pts, r) { return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(V3)), 28, r, 6, false)); }
// vessel: a tube tapering from r0 to r1 along a Catmull-Rom centre line, closed with round ends
function vesselGeos(pts, r0, r1) {
  const curve = new THREE.CatmullRomCurve3(pts.map(V3)), R = 6;
  const n = Math.max(4, Math.round(curve.getLength() / 0.01));
  const g = new THREE.TubeGeometry(curve, n, 1, R, false), pos = g.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= n; i++) {
    curve.getPointAt(i / n, c); const r = r0 + (r1 - r0) * i / n;
    for (let k = 0; k <= R; k++) { const q = i * (R + 1) + k; v.fromBufferAttribute(pos, q).sub(c).multiplyScalar(r).add(c); pos.setXYZ(q, v.x, v.y, v.z); }
  }
  const cap = (p, r) => new THREE.SphereGeometry(r, 8, 6).translate(p[0], p[1], p[2]);
  return [g, cap(pts[0], r0), cap(pts[pts.length - 1], r1)];
}
// one draw call per vessel tree
function mergeGeos(list) {
  let nv = 0, ni = 0;
  for (const g of list) { nv += g.attributes.position.count; ni += g.index.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), idx = new Uint32Array(ni);
  let ov = 0, oi = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, ov * 3); nor.set(g.attributes.normal.array, ov * 3);
    const I = g.index.array; for (let i = 0; i < I.length; i++) idx[oi + i] = I[i] + ov;
    ov += g.attributes.position.count; oi += I.length; g.dispose();
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setIndex(new THREE.BufferAttribute(idx, 1));
  m.computeBoundingSphere();
  return m;
}
function buildVessels(sex) {
  const geos = [];
  for (const [pts, r0, r1] of vesselPaths(sex)) geos.push(...vesselGeos(pts, r0, r1));
  addPart('vessels', '', new THREE.Mesh(mergeGeos(geos)), false, SEXG[sex]);
}
// coronary arteries: snap each guide point onto the heart surface along the normal of the ventricle axis
function buildCoronary(geo) {
  const probe = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })), rc = new THREE.Raycaster();
  const B = new THREE.Vector3(0, 1.286, 0.03), ax = new THREE.Vector3(0.05, 1.2, 0.065).sub(B), L2 = ax.lengthSq();
  const geos = [];
  for (const [guide, r0, r1] of CORONARY) {
    const pts = guide.map((g, i) => {
      const G = V3(g), t = clamp(G.clone().sub(B).dot(ax) / L2, 0, 1), c = B.clone().addScaledVector(ax, t), dir = G.clone().sub(c).normalize();
      rc.set(c.clone().addScaledVector(dir, 0.1), dir.clone().negate());
      const h = rc.intersectObject(probe, false)[0], r = r0 + (r1 - r0) * i / (guide.length - 1);
      // origins at the aortic root stay put: the ray there would land on the pulmonary trunk
      return h && G.y < 1.284 && h.point.distanceTo(G) < 0.035 ? h.point.addScaledVector(dir, r * 0.4).toArray() : g;
    });
    geos.push(...vesselGeos(pts, r0, r1));
  }
  probe.material.dispose();
  addPart('heart', '', new THREE.Mesh(mergeGeos(geos)), true, TRUNKG);
}

function buildCommon() {
  for (const s of [1, -1]) addProxy('eyes', s > 0 ? 'L' : 'R', blob([s * 0.031, 1.642, 0.07], [0.02, 0.02, 0.02]));
  for (const s of [1, -1]) addProxy('carotid', s > 0 ? 'L' : 'R', capsule([s * 0.025, 1.44, 0.016], [s * 0.026, 1.55, 0.006], 0.012));
  addProxy('thyroid', '', blob([0, 1.467, 0.04], [0.035, 0.028, 0.02]));
  addProxy('mouth', '', blob([0, 1.566, 0.085], [0.035, 0.02, 0.022]));
  addProxy('gallbladder', '', blob([-0.046, 1.094, 0.054], [0.02, 0.028, 0.02]), TRUNKG);
  addProxy('esophagus', '', capsule([0, 1.47, -0.022], [0, 1.3, -0.035], 0.016), TRUNKG);
  for (const y of [1.5715, 1.5595]) for (let u = 0; u < 10; u++) {
    const ang = -1.05 + u * 2.1 / 9;
    addPart('mouth', '', blob([Math.sin(ang) * 0.024, y, 0.058 + Math.cos(ang) * 0.022], [0.0036, 0.0046, 0.0028], [0, ang, 0]), true);
  }
}
function buildSkeleton(sex) {
  const g = SEXG[sex], j = JS[sex], f = sex === 'F', wk = f ? 0.92 : 1;
  const bone = m => addPart('bones', '', m, false, g);
  for (let i = 0; i < 7; i++) addPart('cervical', '', blob([0, 1.535 - i * 0.0145, -0.03 + 0.008 * Math.sin(Math.PI * i / 6)], [0.0135, 0.0055, 0.0115]), true, g);
  for (let i = 0; i < 12; i++) { const t = i / 11; bone(blob([0, 1.43 - i * 0.0245, -0.052 - 0.018 * Math.sin(Math.PI * t)], [0.0145 + 0.004 * t, 0.0085, 0.013])); }
  for (let i = 0; i < 5; i++) addPart('lumbar', '', blob([0, 1.14 - i * 0.035, -0.05 + 0.016 * Math.sin(Math.PI * i / 4)], [0.02, 0.0115, 0.017]), true, g);
  bone(blob([0, 0.95, -0.058], [0.034 * (f ? 1.12 : 1), 0.045, 0.014], [-0.45, 0, 0]));
  const RW = [0.074, 0.096, 0.11, 0.12, 0.125, 0.127, 0.126, 0.122, 0.116, 0.108];
  for (let i = 0; i < 10; i++) {
    const y0 = 1.405 - i * 0.0235, w = RW[i] * wk, dr = 0.03 + i * 0.006, fr = i < 7;
    for (const s of [1, -1]) bone(tube([[s * 0.014, y0, -0.062], [s * w * 0.55, y0 + 0.004, -0.078], [s * w, y0 - dr * 0.4, -0.012], [s * w * 0.8, y0 - dr * 0.8, 0.06 * (f ? 0.94 : 1)], [s * (fr ? 0.03 : w * 0.5), y0 - dr, (fr ? 0.092 : 0.082) * (f ? 0.94 : 1)]], 0.0042));
  }
  bone(capsule([0, 1.425, 0.094 * (f ? 0.95 : 1)], [0, 1.26, 0.1 * (f ? 0.95 : 1)], 0.009));
  const tor = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.014, 8, 40)); tor.position.set(0, 0.93, 0.005); tor.rotation.x = Math.PI / 2 - 0.35; tor.scale.set(f ? 1.32 : 1.15, 0.85, 1); bone(tor);
  const sw = j.S[0] / 0.195;
  for (const [s, sd] of [[1, 'L'], [-1, 'R']]) {
    const S = mir(j.S, s), E = mir(j.E, s), W = mir(j.W, s), H = mir(j.H, s), K = mir(j.K, s), A = mir(j.A, s);
    bone(tube([[s * 0.02, 1.44, 0.06 * wk], [s * 0.09 * sw, 1.447, 0.056 * wk], plus(S, [-s * 0.025, 0.045, 0.015])], 0.0055));
    bone(blob([s * 0.1 * sw, 1.33, -0.088 * wk], [0.05 * sw, 0.068, 0.009], [0.15, s * 0.35, 0]));
    bone(blob([s * (j.H[0] + 0.0), 0.99, -0.012], [0.055 * (f ? 1.08 : 1), 0.048, 0.012], [0, s * (f ? 0.85 : 0.75), s * 0.25]));
    bone(capsule(S, E, 0.011));
    bone(capsule(plus(E, [0, 0, 0.008]), plus(W, [0, 0, 0.008]), 0.0065));
    bone(capsule(plus(E, [0, 0, -0.008]), plus(W, [0, 0, -0.006]), 0.006));
    addPart('shoulders', sd, blob(S, [0.026, 0.026, 0.026]), true, g);
    addPart('elbows', sd, blob(E, [0.019, 0.019, 0.019]), true, g);
    addPart('wrists', sd, blob(W, [0.016, 0.014, 0.018]), true, g);
    for (const dz of [-0.021, -0.007, 0.007, 0.021]) addPart('wrists', sd, capsule(plus(W, [s * 0.007, -0.025, 0.006 + dz]), plus(W, [s * 0.019, -0.16 * (f ? 0.94 : 1) + Math.abs(dz) * 1.4, 0.01 + dz * 1.25]), 0.0042), true, g);
    addPart('wrists', sd, capsule(plus(W, [s * 0.003, -0.023, 0.026]), plus(W, [s * 0.003, -0.079, 0.056]), 0.0045), true, g);
    bone(capsule(H, K, 0.0135));
    addPart('hips', sd, blob(H, [0.024, 0.024, 0.024]), true, g);
    addPart('hips', sd, capsule(H, plus(H, [s * 0.04, -0.025, -0.004]), 0.012), true, g);
    addPart('knees', sd, blob(K, [0.025, 0.022, 0.024]), true, g);
    addPart('knees', sd, blob(plus(K, [0, 0, 0.033]), [0.017, 0.021, 0.008]), true, g);
    bone(capsule(plus(K, [0, -0.022, -0.006]), A, 0.0115));
    bone(capsule(plus(K, [s * 0.022, -0.03, -0.022]), plus(A, [s * 0.013, 0.015, -0.004]), 0.006));
    addPart('ankles', sd, blob(A, [0.018, 0.016, 0.018]), true, g);
    addPart('ankles', sd, capsule(plus(A, [0, -0.025, 0]), plus(A, [0, -0.055, -0.035]), 0.013), true, g);
    for (let m = 0; m < 5; m++) { const dx = (m - 2) * 0.011; addPart('ankles', sd, capsule(plus(A, [s * (0.002 + dx * 0.4), -0.03, 0.03]), plus(A, [s * (0.005 + dx), -0.065, (0.15 - Math.abs(dx) * 1.6) * (f ? 0.9 : 1)]), 0.0045), true, g); }
    addProxy('shoulders', sd, blob(S, [0.05, 0.05, 0.05]), g);
    addProxy('elbows', sd, blob(E, [0.042, 0.042, 0.042]), g);
    addProxy('wrists', sd, blob(plus(W, [s * 0.01, -0.065, 0.012]), [0.04, 0.085, 0.05]), g);
    addProxy('hips', sd, blob(H, [0.05, 0.05, 0.05]), g);
    addProxy('knees', sd, blob(K, [0.055, 0.055, 0.055]), g);
    addProxy('ankles', sd, blob(plus(A, [s * 0.002, -0.035, 0.06]), [0.045, 0.05, 0.11]), g);
    addZone('frame', blob(plus(S, [-s * 0.005, 0.005, 0.003]), [0.07, 0.07, 0.07]), g);
    addZone('frame', capsule(S, E, 0.055), g); addZone('frame', capsule(E, W, 0.045), g);
    addZone('frame', blob(plus(W, [s * 0.015, -0.095, 0.012]), [0.03, 0.085, 0.05]), g);
    addZone('frame', capsule(plus(H, [0, -0.045, -0.004]), K, 0.085), g); addZone('frame', capsule(K, A, 0.06), g);
    addZone('frame', blob(plus(A, [s * 0.003, -0.045, 0.065]), [0.045, 0.045, 0.11]), g);
  }
  addProxy('cervical', '', capsule([0, 1.54, -0.03], [0, 1.44, -0.03], 0.03), g);
  addProxy('lumbar', '', capsule([0, 1.15, -0.045], [0, 0.98, -0.045], 0.035), g);
  addZone('head', blob([0, 1.64, 0.008], [0.092, 0.12, 0.11]), g);
  addZone('head', capsule([0, 1.54, -0.005], [0, 1.44, -0.005], f ? 0.055 : 0.062), g);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(f ? 0.148 : 0.16, f ? 0.148 : 0.16, 0.6, 24)); torso.position.set(0, 1.16, 0); torso.scale.set(1, 1, 0.72); addZone('organs', torso, g);
  if (f) {
    for (const s of [1, -1]) addProxy('breasts', s > 0 ? 'L' : 'R', blob([s * 0.064, 1.27, 0.08], [0.055, 0.052, 0.045]), g);
    for (const s of [1, -1]) addProxy('ovaries', s > 0 ? 'L' : 'R', blob([s * 0.056, 0.958, 0.004], [0.02, 0.018, 0.018]), g);
  }
}

function buildFloor() {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.ShaderMaterial({ uniforms: { uTime: TIMEU }, vertexShader: VS_UV, fragmentShader: FS_FLOOR, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.0015; m.renderOrder = 1; scene.add(m);
}

function geomFrom(m) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(m.pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(m.nor, 3));
  g.setIndex(new THREE.BufferAttribute(m.idx, 1));
  g.computeBoundingSphere(); g.computeBoundingBox();
  return g;
}
function onMesh(m) {
  const g = geomFrom(m);
  if (m.id.startsWith('shell-')) {
    const sx = m.id.slice(6);
    const mk = side => new THREE.ShaderMaterial({ uniforms: { uOpacity: { value: 0 }, uScan: { value: -1 }, uHover: { value: 0 } }, vertexShader: VS, fragmentShader: FS_SHELL, transparent: true, depthWrite: false, side });
    const back = new THREE.Mesh(g, mk(THREE.BackSide)), front = new THREE.Mesh(g, mk(THREE.FrontSide));
    back.renderOrder = 20; front.renderOrder = 21; SEXG[sx].add(back, front); SHELLM[sx] = [back.material, front.material];
  } else {
    const [part, side = ''] = m.id.split(':'), p = PART[part];
    addPart(part, side, new THREE.Mesh(g), false, p.sex ? SEXG[p.sex] : TRUNK.has(part) ? TRUNKG : HEADG);
    if (part === 'heart') buildCoronary(g);
  }
  refreshTargets();
}
function runWorker(shapes, onProgress) {
  return new Promise((res, rej) => {
    let got = 0, heard = false, fell = false;
    const handle = m => {
      heard = true;
      if (m.type === 'progress') onProgress(m.p, m.verts);
      else if (m.type === 'mesh') { got++; onMesh(m); }
      else if (m.type === 'done') { onProgress(1, m.verts); res(m.verts); }
    };
    const inline = () => { if (fell) return; fell = true; setTimeout(() => { try { run(shapes, handle); } catch (e) { rej(e); } }, 30); };
    let w, url;
    try { url = URL.createObjectURL(new Blob([$('sdfWorker').textContent], { type: 'text/javascript' })); w = new Worker(url); }
    catch { inline(); return; }
    w.onmessage = e => { handle(e.data); if (e.data.type === 'done') { w.terminate(); URL.revokeObjectURL(url); } };
    w.onerror = e => { e.preventDefault && e.preventDefault(); w.terminate(); if (!got) inline(); else rej(e); };
    w.postMessage({ shapes });
    setTimeout(() => { if (!heard) { w.terminate(); inline(); } }, 4000); // a worker that never starts
  });
}
// build the other sex's shell the first time a person of that sex is opened
async function ensureSex(sx) {
  if (BUILT[sx] || BUILDING[sx] || !T3.scene) return;
  BUILDING[sx] = true;
  const b = $('building'); b.textContent = `正在生成${sx === 'F' ? '女性' : '男性'}玻璃人体…`; b.hidden = false;
  try { await runWorker(sdfSpecs(sx), () => { }); BUILT[sx] = true; } catch { glFail('生成人体模型失败，请刷新页面重试。'); }
  BUILDING[sx] = false;
  if (BUILT[sx]) b.hidden = true;
}
function applySex() {
  if (!T3.scene) return;
  const sx = SEX();
  SEXG.M.visible = sx === 'M'; SEXG.F.visible = sx === 'F';
  TRUNKG.scale.x = sx === 'F' ? TRUNK_F : 1;
  if (BUILT.common && !BUILT[sx]) ensureSex(sx);
  refreshTargets(); renderCallouts(); G.rulerKey = '';
}
function onPersonChange() {
  G.zone = 'all'; ST.sel = null;
  if (T3.scene) { applySex(); flyTo({ ...OVERVIEW_CAM, yaw: 0 }); }
}

function glFail(msg) { const m = $('glMsg'); m.textContent = msg; m.hidden = false; $('building').hidden = true; SPL.mesh = 1; }
async function init3D(onProgress) {
  try { THREE = await import(THREE_URL); }
  catch { glFail('3D 引擎没能加载（网络或浏览器限制），左侧数据不受影响。刷新页面可以重试。'); return false; }
  try { renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch { glFail('这台设备不支持 WebGL，无法显示 3D 人体。左侧数据不受影响。'); return false; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setClearColor(0x000000, 0);
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(28, 1, 0.01, 20);
  body = new THREE.Group(); scene.add(body); raycaster = new THREE.Raycaster();
  HEADG = new THREE.Group(); TRUNKG = new THREE.Group(); SEXG.M = new THREE.Group(); SEXG.F = new THREE.Group();
  body.add(HEADG, TRUNKG, SEXG.M, SEXG.F);
  PROXM = new THREE.MeshBasicMaterial({ visible: false });
  SPH = new THREE.SphereGeometry(1, 18, 12);
  buildCommon(); buildSkeleton('M'); buildSkeleton('F'); buildVessels('M'); buildVessels('F'); buildFloor();
  T3.scene = true; layout(); applySex();
  requestAnimationFrame(loop);
  const sx = SEX();
  try {
    const v = await runWorker([...sdfSpecs('common'), ...sdfSpecs(sx)], onProgress);
    BUILT.common = true; BUILT[sx] = true; T3.built = true; $('building').hidden = true;
    applySex(); // the person may have changed while building
    return v;
  } catch { glFail('生成人体模型失败，请刷新页面重试。'); return false; }
}

/* layout: an open scan field; the body is centred in the space left of the profile panel */
function layout() {
  const st = $('stage'), r = st.getBoundingClientRect(), W = r.width, H = r.height;
  if (!W || !H) return;
  const mobile = matchMedia('(max-width:860px)').matches;
  const rightW = mobile ? 0 : 330, top = mobile ? 112 : 72, bottom = 14;
  const aw = W - rightW, ah = H - top - bottom;
  // P = pixels spanned by the camera's view height; R = half of it, the unit for label columns
  const P = Math.max(160, Math.min(ah * 0.96, aw * 1.15)), R = P / 2;
  const cx = mobile ? W / 2 : aw / 2, cy = top + ah / 2;
  Object.assign(LAY, { W, H, cx, cy, R, rw: rightW });
  st.classList.toggle('narrow', W < 820);
  st.style.setProperty('--cx', cx.toFixed(1) + 'px'); st.style.setProperty('--cy', cy.toFixed(1) + 'px');
  const bl = $('bloom'), bw = R * 0.8, bh = R * 1.9;
  Object.assign(bl.style, { left: (cx - bw / 2) + 'px', top: (cy - bh / 2) + 'px', width: bw + 'px', height: bh + 'px' });
  $('building').style.left = cx + 'px';
  if (renderer) { renderer.setSize(W, H, false); camera.aspect = W / H; camera.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H); camera.updateProjectionMatrix(); }
  G.rulerKey = '';
  measureHud();
  if (CO.length) measureCallouts();
}
// floating panels at the top of the stage: callouts stay below any panel they would overlap
function measureHud() {
  const sr = $('stage').getBoundingClientRect();
  LAY.huds = [$('zoneHud'), document.querySelector('.hud-tr')].map(el => el.getBoundingClientRect()).filter(b => b.width && b.height)
    .map(b => ({ l: b.left - sr.left, r: b.right - sr.left, b: b.bottom - sr.top }));
  G.rulerKey = '';
}

function applyCam() {
  const s = G.scale, f = camera.fov * Math.PI / 180;
  const Dd = (G.vh * s) * LAY.H / (2 * LAY.R * 2 * Math.tan(f / 2)) / G.zoom;
  const ty = G.ty * s;
  camera.position.set(0, ty + Math.sin(G.pitch) * Dd, Math.cos(G.pitch) * Dd);
  camera.lookAt(0, ty, 0);
  body.rotation.y = G.yaw;
}
function flyTo(t) {
  if (!t) return;
  const from = { yaw: G.yaw, pitch: G.pitch, ty: G.ty, vh: G.vh, zoom: G.zoom };
  const ty = t.yaw ?? 0, dy = ((ty - from.yaw) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
  const to = { yaw: from.yaw + dy, pitch: t.pitch ?? 0.06, ty: t.y, vh: t.h, zoom: 1 };
  if (!T3.scene) { Object.assign(G, to); return; }
  G.anim = { from, to, t0: performance.now(), dur: RM ? 1 : 950 };
  G.lastInt = performance.now();
  setZoom(1);
}
function setZoom(z) { G.zoom = clamp(z, 0.6, 3.5); $('zv').textContent = Math.round(G.zoom * 100) + '%'; }

function refreshTargets() {
  if (!T3.scene) return;
  const z = G.zone, selId = ST.sel && ST.sel.id, hov = G.hoverPart;
  for (const k in MATS) {
    const m = MATS[k], u = m.userData, p = PART[u.part]; if (!p) continue;
    const s = sideSev(u.part, u.side), focus = z === 'all' || p.zone === z;
    let a = z === 'all' ? (s ? 0.82 : 0.32) : focus ? (s ? 0.9 : 0.55) : (s ? 0.14 : 0.05);
    a *= ALPHA_MUL[u.part] || 1;
    if (selId === u.part) a = Math.max(a, 0.95 * (ALPHA_MUL[u.part] ? 0.7 : 1));
    u.ta = a; u.tg = selId === u.part ? 1 : hov === u.part ? 0.65 : 0; u.tp = s >= 3 && !RM ? (focus ? 1 : 0.35) : 0;
    m.uniforms.uColor.value.set(SEVC[s]);
  }
  G.shellT = z === 'all' ? 1 : z === 'frame' ? 0.55 : 0.72;
  const h = (D.profile && D.profile.height) || (SEX() === 'F' ? 160 : 176); // average adult height when unknown
  G.scale = clamp(h / 176, 0.8, 1.15);
  body.scale.setScalar(G.scale);
}
function refresh3D() { refreshTargets(); renderCallouts(); G.rulerKey = ''; }

let lastT = 0;
function loop(t) {
  requestAnimationFrame(loop);
  if (document.hidden || !T3.scene || !LAY.W) { lastT = t; return; }
  const dt = Math.min(64, t - (lastT || t)); lastT = t;
  TIMEU.value = t / 1000;
  if (G.anim) {
    const a = G.anim, k = Math.min(1, (t - a.t0) / a.dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    for (const key in a.to) G[key] = a.from[key] + (a.to[key] - a.from[key]) * e;
    if (k >= 1) G.anim = null;
  } else if (G.spin && G.zone === 'all' && !DRAG && t - G.lastInt > 2500 && !RM) G.yaw += dt * 0.00018;
  if (G.pend) { hoverAt(G.pend); G.pend = null; }
  applyCam();
  const k = 1 - Math.exp(-dt / 140);
  for (const key in MATS) {
    const m = MATS[key], u = m.userData;
    u.a += (u.ta - u.a) * k; u.g += (u.tg - u.g) * k; u.p += (u.tp - u.p) * k;
    m.uniforms.uAlpha.value = u.a; m.uniforms.uGlow.value = u.g; m.uniforms.uPulse.value = u.p; m.depthWrite = u.a > 0.6;
  }
  G.shellA += (G.shellT - G.shellA) * k;
  const ph = (t / 1000 % 6) / 6, scanY = RM || ph > 0.55 ? -1 : 1.8 - ph / 0.55 * 1.85;
  SHELLM[SEX()].forEach((m, i) => { m.uniforms.uOpacity.value = G.shellA * (i === 0 ? 0.5 : 1); m.uniforms.uHover.value = G.hoverZone; m.uniforms.uScan.value = scanY; });
  renderer.render(scene, camera);
  positionCallouts(); drawRuler();
}

/* picking */
function pickAt(e) {
  if (!T3.scene) return null;
  const r = $('hit').getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  raycaster.setFromCamera(new THREE.Vector2(x / r.width * 2 - 1, -(y / r.height) * 2 + 1), camera);
  if (G.zone !== 'all') {
    const sx = SEX(), list = HITS.filter(m => PART[m.userData.part].zone === G.zone && (!m.userData.sex || m.userData.sex === sx));
    const h = raycaster.intersectObjects(list, false)[0];
    if (h) return { part: h.object.userData.part, side: h.object.userData.side };
  }
  const z = raycaster.intersectObjects(ZPROX.filter(m => m.userData.sex === SEX()), false)[0];
  return z ? { zone: z.object.userData.zone } : null;
}
function hoverAt(e) {
  const r = pickAt(e);
  let hz = 0, hp = null, tip = null;
  if (r && r.part) {
    hp = r.part;
    const p = PART[r.part], s = sideSev(r.part, r.side), n = D.issues.filter(i => i.part === r.part && i.status !== 'resolved' && (!r.side || !i.side || i.side === r.side)).length;
    tip = `<b>${p.name}${p.pair && r.side ? '（' + SIDEN[r.side] + '）' : ''}</b> · ${SEVN[s]}<small>${n ? n + ' 个未解决问题' : '暂无问题'} · 点击查看</small>`;
  } else if (r && r.zone && r.zone !== G.zone) {
    hz = { head: 1, organs: 2, frame: 3 }[r.zone];
    const ps = curParts().filter(p => p.zone === r.zone);
    tip = `<b>${ZONES[r.zone].name}</b><small>${ps.length} 个部位 · 需关注 ${ps.filter(p => partSev(p.id)).length} 处 · 点击进入</small>`;
  }
  if (hz !== G.hoverZone || hp !== G.hoverPart) { G.hoverZone = hz; G.hoverPart = hp; refreshTargets(); markCalloutHover(); }
  $('hit').classList.toggle('pt', !!tip);
  const ct = $('captip');
  if (tip) {
    ct.innerHTML = tip; ct.hidden = false;
    const sr = $('stage').getBoundingClientRect();
    const x = Math.min(e.clientX - sr.left + 14, sr.width - ct.offsetWidth - 8), y = Math.min(e.clientY - sr.top + 14, sr.height - ct.offsetHeight - 8);
    ct.style.transform = `translate(${x}px,${y}px)`;
  } else ct.hidden = true;
}
function clickAt(e) {
  const r = pickAt(e);
  if (!r) { if (ST.sel) clearSel(); return; }
  if (r.part) selectPart(r.part, r.side);
  else if (r.zone && r.zone !== G.zone) setZone(r.zone);
  else if (ST.sel) clearSel();
}

/* callouts: labelled leader lines to each part of the current zone */
function renderCallouts() {
  const box = $('callouts');
  CO = [];
  if (!T3.scene) { box.innerHTML = ''; $('leaders').innerHTML = ''; return; }
  let html = '';
  if (G.zone === 'all') {
    for (const [z, info] of Object.entries(ZONES)) {
      const ps = curParts().filter(p => p.zone === z), n = ps.filter(p => partSev(p.id)).length, w = Math.max(0, ...ps.map(p => partSev(p.id)));
      CO.push({ id: z, a: info.anchor, ls: info.side });
      html += `<button class="co zn" data-z="${z}" aria-label="进入${info.name}，${n} 处需关注"><i class="d" style="background:${SEVC[w]}"></i>${info.name}<small>${n ? n + ' 处需关注' : '状态良好'}</small></button>`;
    }
  } else {
    for (const p of curParts().filter(p => p.zone === G.zone)) {
      const s = SM[p.id], sv = partSev(p.id), n = s ? s.n : 0;
      let side = '', a = p.a;
      if (p.pair) { side = s && s.R > s.L ? 'R' : 'L'; if (side === 'R') a = [-a[0], a[1], a[2]]; }
      if (TRUNK.has(p.id) && SEX() === 'F') a = [a[0] * TRUNK_F, a[1], a[2]];
      CO.push({ id: p.id, side, a, ls: side === 'R' ? 'l' : p.ls });
      const cur = !!(ST.sel && ST.sel.id === p.id);
      html += `<button class="co" data-p="${p.id}" data-side="${side}" aria-current="${cur}" aria-label="${p.name}，${SEVN[sv]}${n ? '，' + n + ' 个未解决问题' : ''}"><i class="d" style="background:${SEVC[sv]}"></i>${p.name}${n ? `<span class="c">${n}</span>` : ''}</button>`;
    }
  }
  box.innerHTML = html;
  CO.forEach((c, i) => { c.el = box.children[i]; });
  measureCallouts(); markCalloutHover();
}
function measureCallouts() { for (const c of CO) { c.w = c.el.offsetWidth; c.h = c.el.offsetHeight; } }
function markCalloutHover() { for (const c of CO) c.el.classList.toggle('hov', c.id === G.hoverPart || (G.hoverZone && c.id === ['', 'head', 'organs', 'frame'][G.hoverZone])); }
const PV = {};
function positionCallouts() {
  if (!CO.length) return;
  const { W, H, cx, R } = LAY, v = PV.v || (PV.v = new THREE.Vector3());
  body.updateMatrixWorld();
  const pts = CO.map(c => { v.set(c.a[0], c.a[1], c.a[2]).applyMatrix4(body.matrixWorld).project(camera); return { c, x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H }; });
  const selId = ST.sel && ST.sel.id;
  for (const p of pts) {
    p.side = p.x < cx - 4 ? 'l' : p.x > cx + 4 ? 'r' : p.c.ls;
    p.out = (p.x < 6 || p.x > W - LAY.rw - 6 || p.y < 6 || p.y > H - 6) && p.c.id !== selId; // anchor off screen or under the profile panel: hide the label
    p.c.el.style.visibility = p.out ? 'hidden' : '';
  }
  pts.splice(0, pts.length, ...pts.filter(p => !p.out));
  const gap = W < 560 ? 27 : 33, off = R * 0.74;
  let d = '', dots = '';
  for (const side of ['l', 'r']) {
    const col = pts.filter(p => p.side === side).sort((a, b) => a.y - b.y);
    const colX = side === 'l' ? cx - off : cx + off;
    for (const p of col) {
      p.lx = clamp(side === 'l' ? colX - p.c.w : colX, 8, W - LAY.rw - p.c.w - 8);
      p.min = 18;
      for (const h of LAY.huds) if (p.lx < h.r && p.lx + p.c.w > h.l) p.min = Math.max(p.min, h.b + 8 + p.c.h / 2);
    }
    let prev = -1e9;
    for (const p of col) { p.ly = Math.max(p.y, prev + gap, p.min); prev = p.ly; }
    const maxY = H - 18;
    if (col.length && col[col.length - 1].ly > maxY) { const sh = col[col.length - 1].ly - maxY; for (const p of col) p.ly -= sh; for (let i = 1; i < col.length; i++) if (col[i].ly < col[i - 1].ly + gap) col[i].ly = col[i - 1].ly + gap; }
    for (const p of col) {
      p.ly = Math.max(p.min, p.ly);
      const x = p.lx;
      const lx = side === 'l' ? x + p.c.w : x, ex = side === 'l' ? lx + 14 : lx - 14;
      p.c.el.style.transform = `translate(${x.toFixed(1)}px,${(p.ly - p.c.h / 2).toFixed(1)}px)`;
      d += `M${p.x.toFixed(1)},${p.y.toFixed(1)}L${ex.toFixed(1)},${p.ly.toFixed(1)}L${lx.toFixed(1)},${p.ly.toFixed(1)}`;
      dots += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.6"/>`;
    }
  }
  $('leaders').innerHTML = `<path d="${d}"/>${dots}`;
}

/* stadiometer: a centimetre ruler standing beside the body in world space; it leaves the view in close-ups */
function drawRuler() {
  const hcm = D.profile && D.profile.height;
  const key = [G.ty, G.vh, G.zoom, G.pitch, LAY.W, LAY.H, G.scale].map(x => x.toFixed(4)).join('|') + hcm;
  if (key === G.rulerKey) return;
  G.rulerKey = key;
  const { W, H, cx } = LAY, v = PV.v || (PV.v = new THREE.Vector3());
  const sy = y => { v.set(0, y, 0).project(camera); return (1 - v.y) / 2 * H; };
  v.set(-0.4 * G.scale, G.ty * G.scale, 0).project(camera);
  const x0 = (v.x + 1) / 2 * W, ppm = Math.abs(sy(0) - sy(1));
  if (x0 < 24) { $('ruler').innerHTML = ''; return; }
  let y0 = 6; // the ruler stops below any floating panel above it
  for (const h of LAY.huds) if (x0 - 4 < h.r && x0 + 48 > h.l) y0 = Math.max(y0, h.b + 12);
  const minor = [0.01, 0.02, 0.05, 0.1].find(s => s * ppm >= 6) || 0.1;
  const major = [0.05, 0.1, 0.2, 0.5].find(s => s * ppm >= 34 && s >= minor * 2) || 0.5;
  let tk = '', lb = '';
  const N = Math.round(2.2 / minor), Yh = hcm ? sy(hcm / 100) : -1e9;
  for (let i = 0; i <= N; i++) {
    const y = i * minor, Y = sy(y);
    if (Y < y0 || Y > H - 6) continue;
    const isM = Math.abs(y / major - Math.round(y / major)) < 1e-6;
    tk += `M${x0.toFixed(1)},${Y.toFixed(1)}h${isM ? 12 : 6}`;
    if (isM && Math.abs(Y - Yh) > 14) lb += `<text x="${(x0 + 16).toFixed(1)}" y="${(Y + 3.5).toFixed(1)}">${Math.round(y * 100)}</text>`;
  }
  let mk = '';
  if (hcm) { const Y = sy(hcm / 100); mk = `<path class="hm" d="M${x0.toFixed(1)},${Y.toFixed(1)}H${cx.toFixed(1)}"/><text class="hl" x="${(x0 + 16).toFixed(1)}" y="${(Y - 6).toFixed(1)}">身高 ${hcm} cm</text>`; }
  $('ruler').innerHTML = `<path class="tk" d="M${x0.toFixed(1)},${sy(0).toFixed(1)}V${Math.max(sy(2.2), y0).toFixed(1)}${tk}"/><g class="lb">${lb}</g>${mk}`;
}
