// 桑巴之夜：固定机位的夜晚舞厅 + Michelle 桑巴动捕。renderAt(t) 是 t 的纯函数，逐帧截取。
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const W = 1280, H = 720;
const Q = new URLSearchParams(location.search);
const SS = +(Q.get('ss') || 1); // 超采样倍数

function rng(seed) { // mulberry32：背景布置每次一致
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ---------- 渲染器 / 相机 ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(SS);
renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false; // 每帧在倒影通道前手动更新一次
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060309);
scene.fog = new THREE.FogExp2(0x0b0610, 0.03);

const camera = new THREE.PerspectiveCamera(28, W / H, 0.1, 60);
camera.position.set(0, 1.18, 5.7);
camera.lookAt(0, 0.9, 0);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.1;

// ---------- 拼花木地板 + 光泽倒影 ----------
function parquetTexture() {
  const N = 2048, BLOCKS = 8, STRIPS = 5; // 一张贴图 = 4 m × 4 m，方块 0.5 m，每块 5 条木条
  const c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d');
  const B = N / BLOCKS, S = B / STRIPS, r = rng(11);
  g.fillStyle = '#1c0e05'; g.fillRect(0, 0, N, N);
  for (let by = 0; by < BLOCKS; by++) for (let bx = 0; bx < BLOCKS; bx++) {
    const horiz = (bx + by) % 2 === 0;
    for (let s = 0; s < STRIPS; s++) {
      const [x, y, w, h] = horiz ? [bx * B, by * B + s * S, B, S] : [bx * B + s * S, by * B, S, B];
      const k = 0.86 + r() * 0.2, warm = r() * 10;
      g.save(); g.beginPath(); g.rect(x + 1, y + 1, w - 2, h - 2); g.clip();
      const grd = horiz ? g.createLinearGradient(x, y, x + w, y) : g.createLinearGradient(x, y, x, y + h);
      grd.addColorStop(0, `rgb(${(118 + warm) * k | 0},${68 * k | 0},${34 * k | 0})`);
      grd.addColorStop(0.5 + (r() - 0.5) * 0.6, `rgb(${(130 + warm) * k | 0},${77 * k | 0},${39 * k | 0})`);
      grd.addColorStop(1, `rgb(${(112 + warm) * k | 0},${64 * k | 0},${31 * k | 0})`);
      g.fillStyle = grd; g.fillRect(x, y, w, h);
      // 木纹：沿木条方向的细线，带轻微摆动
      const L = horiz ? w : h, T = horiz ? h : w;
      for (let i = 0; i < 18; i++) {
        const off = r() * T, amp = 0.6 + r() * 2.2, f = 0.01 + r() * 0.03, ph = r() * 6.28;
        g.strokeStyle = `rgba(${r() < 0.6 ? '50,24,10' : '170,110,60'},${0.04 + r() * 0.08})`;
        g.lineWidth = 0.6 + r() * 1.4;
        g.beginPath();
        for (let u = 0; u <= L; u += 8) {
          const v = off + Math.sin(u * f + ph) * amp;
          horiz ? g.lineTo(x + u, y + v) : g.lineTo(x + v, y + u);
        }
        g.stroke();
      }
      g.restore();
    }
  }
  // 大尺度磨损 / 蜡光不均
  for (let i = 0; i < 140; i++) {
    const x = r() * N, y = r() * N, rad = 60 + r() * 260;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    const a = 0.03 + r() * 0.05;
    grd.addColorStop(0, r() < 0.5 ? `rgba(20,8,2,${a})` : `rgba(255,210,150,${a * 0.6})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

const FLOOR_W = 20, FLOOR_D = 15, FLOOR_Z = -1.3;
const reflector = new Reflector(new THREE.PlaneGeometry(FLOOR_W, FLOOR_D), {
  textureWidth: W * SS / 2, textureHeight: H * SS / 2, multisample: 4, clipBias: 0.002,
});
reflector.rotation.x = -Math.PI / 2;
reflector.position.set(0, 0, FLOOR_Z);
reflector.visible = false;
scene.add(reflector);

const floorTex = parquetTexture();
floorTex.repeat.set(FLOOR_W / 4, FLOOR_D / 4);
const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.58, metalness: 0, envMapIntensity: 0.2 });
floorMat.onBeforeCompile = (sh) => {
  sh.uniforms.tReflect = { value: reflector.getRenderTarget().texture };
  sh.uniforms.reflMat = { value: reflector.material.uniforms.textureMatrix.value };
  sh.uniforms.reflStrength = { value: 2.3 };
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nuniform mat4 reflMat;\nvarying vec4 vRefl;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRefl = reflMat * vec4(position, 1.0);');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', '#include <common>\nuniform sampler2D tReflect;\nuniform float reflStrength;\nvarying vec4 vRefl;')
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      {
        vec2 ruv = vRefl.xy / vRefl.w;
        // 打蜡木地板：倒影轻微发虚，越远越虚
        float blur = 0.0025 + 0.004 * smoothstep(4.0, 12.0, length(vViewPosition));
        vec3 rc = texture2D(tReflect, ruv).rgb * 0.2;
        rc += texture2D(tReflect, ruv + vec2( blur, 0.0)).rgb * 0.1;
        rc += texture2D(tReflect, ruv + vec2(-blur, 0.0)).rgb * 0.1;
        rc += texture2D(tReflect, ruv + vec2(0.0,  blur * 2.0)).rgb * 0.15;
        rc += texture2D(tReflect, ruv + vec2(0.0, -blur * 2.0)).rgb * 0.15;
        rc += texture2D(tReflect, ruv + vec2(0.0,  blur * 4.0)).rgb * 0.1;
        rc += texture2D(tReflect, ruv + vec2(0.0, -blur * 4.0)).rgb * 0.1;
        rc += texture2D(tReflect, ruv + vec2( blur, blur * 3.0)).rgb * 0.05;
        rc += texture2D(tReflect, ruv + vec2(-blur, -blur * 3.0)).rgb * 0.05;
        float cosT = clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0);
        float F = 0.04 + 0.96 * pow(1.0 - cosT, 5.0);
        float gap = smoothstep(0.05, 0.16, dot(diffuseColor.rgb, vec3(0.3, 0.6, 0.1)));
        totalEmissiveRadiance += rc * reflStrength * F * gap;
      }`);
};
const floor = new THREE.Mesh(new THREE.PlaneGeometry(FLOOR_W, FLOOR_D), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.set(0, 0, FLOOR_Z);
floor.receiveShadow = true;
scene.add(floor);

// ---------- 丝绒幕布 ----------
{
  const geo = new THREE.PlaneGeometry(16, 7.5, 640, 6);
  const p = geo.attributes.position, r = rng(5);
  const ph = [...Array(8)].map(() => r() * 6.28);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const lam = 0.34 + 0.05 * Math.sin(x * 0.7 + ph[0]);
    const amp = 0.075 * (0.7 + 0.3 * Math.sin(x * 1.3 + ph[1])) * (1 + 0.12 * (y + 3.75) / 7.5);
    p.setZ(i, amp * Math.sin(x * 2 * Math.PI / lam + 0.6 * Math.sin(x * 0.9 + ph[2])));
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x3c0812, roughness: 0.82, sheen: 1, sheenRoughness: 0.32, sheenColor: 0xc23a52, envMapIntensity: 0.3,
  });
  const curtain = new THREE.Mesh(geo, mat);
  curtain.position.set(0, 3.75, -6.6);
  curtain.receiveShadow = true;
  scene.add(curtain);
}

// ---------- 灯串（失焦光斑） ----------
function bokehTexture() {
  const N = 128, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
  grd.addColorStop(0.0, 'rgba(255,255,255,0.95)');
  grd.addColorStop(0.55, 'rgba(255,255,255,0.72)');
  grd.addColorStop(0.78, 'rgba(255,255,255,0.88)'); // 光斑边缘略亮，像镜头散景
  grd.addColorStop(0.9, 'rgba(255,255,255,0.25)');
  grd.addColorStop(1.0, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, N, N);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const BOKEH = bokehTexture();
function bokeh(pos, size, color, intensity) {
  const m = new THREE.SpriteMaterial({
    map: BOKEH, color: new THREE.Color(color).multiplyScalar(intensity),
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false,
  });
  const s = new THREE.Sprite(m);
  s.position.copy(pos); s.scale.setScalar(size);
  scene.add(s);
  return s;
}
{
  const r = rng(23);
  // 扇形垂挂的灯泡串
  const rows = [
    { z: -5.7, y: 3.56, span: 3.3, sag: 0.55, x0: -8.25, n: 6, size: 0.25, color: 0xffb066, k: 0.8 },
    { z: -6.35, y: 3.8, span: 2.4, sag: 0.42, x0: -7.4, n: 5, size: 0.17, color: 0xffc58a, k: 0.45 },
  ];
  const wireMat = new THREE.LineBasicMaterial({ color: 0x120a06 });
  for (const row of rows) {
    for (let x = row.x0; x < -row.x0; x += row.span) {
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const u = i / 24;
        pts.push(new THREE.Vector3(x + u * row.span, row.y - row.sag * 4 * u * (1 - u), row.z));
      }
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
      for (let i = 0; i < row.n; i++) {
        const u = (i + 0.5) / row.n;
        const p = new THREE.Vector3(x + u * row.span, row.y - row.sag * 4 * u * (1 - u) - 0.07, row.z);
        bokeh(p, row.size * (0.9 + r() * 0.25), row.color, row.k * (0.7 + r() * 0.4));
      }
    }
  }
}

// ---------- 灯光 ----------
scene.add(new THREE.HemisphereLight(0x4a3a6a, 0x1a0c06, 0.12));
const fill = new THREE.DirectionalLight(0xa8b4ff, 0.1);
fill.position.set(-2, 2.2, 6);
scene.add(fill);

function spot(color, intensity, pos, target, angle, penumbra, distance = 0) {
  const s = new THREE.SpotLight(color, intensity, distance, angle, penumbra, 2);
  s.position.copy(pos); s.target.position.copy(target);
  scene.add(s, s.target);
  return s;
}
const KEY_POS = new THREE.Vector3(2.0, 6.6, 3.6), KEY_TGT = new THREE.Vector3(0, 0.6, 0), KEY_ANGLE = 0.2;
const key = spot(0xffe0bc, 260, KEY_POS, KEY_TGT, KEY_ANGLE, 0.55);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 3; key.shadow.camera.far = 14;
key.shadow.bias = -0.0002; key.shadow.normalBias = 0.02; key.shadow.radius = 5;
// 逆光轮廓（限定照射距离，避免在前景地板上留下大片色斑）
spot(0xff4d8c, 110, new THREE.Vector3(-2.6, 5.2, -3.4), new THREE.Vector3(0, 1.3, 0), 0.2, 0.7, 7.8);
spot(0xffaa55, 100, new THREE.Vector3(2.7, 5.0, -3.2), new THREE.Vector3(0, 1.3, 0), 0.2, 0.7, 7.6);
// 幕布上的扇形光
spot(0xff9a55, 80, new THREE.Vector3(-4.0, 6.0, -3.6), new THREE.Vector3(-4.0, 2.0, -6.6), 0.36, 0.9);
spot(0xff5a86, 70, new THREE.Vector3(0, 6.0, -3.8), new THREE.Vector3(0, 1.8, -6.6), 0.36, 0.9);
spot(0xff9a55, 80, new THREE.Vector3(4.0, 6.0, -3.6), new THREE.Vector3(4.0, 2.0, -6.6), 0.36, 0.9);

// 主光可见光柱（雾中的体积光近似）
{
  const dir = KEY_TGT.clone().sub(KEY_POS), len = dir.length() * 1.15;
  const geo = new THREE.CylinderGeometry(0.02, len * Math.tan(KEY_ANGLE) * 1.05, len, 64, 24, true);
  geo.translate(0, -len / 2, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(0xffd9b0) }, len: { value: len }, strength: { value: 0.16 } },
    vertexShader: /* glsl */`
      varying vec3 vN; varying vec3 vV; varying float vT; varying float vY;
      uniform float len;
      void main() {
        vT = -position.y / len;
        vec4 w = modelMatrix * vec4(position, 1.0); vY = w.y;
        vec4 mv = viewMatrix * w; vV = -mv.xyz;
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vN; varying vec3 vV; varying float vT; varying float vY;
      uniform vec3 color; uniform float strength;
      void main() {
        float edge = pow(abs(dot(normalize(vN), normalize(vV))), 2.2);
        float a = edge * smoothstep(0.0, 0.25, vT) * (1.0 - 0.45 * vT) * smoothstep(0.0, 0.9, vY);
        gl_FragColor = vec4(color * a * strength, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(geo, mat);
  beam.position.copy(KEY_POS);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize());
  scene.add(beam);
}

// ---------- 角色 ----------
let mixer, model, clip, SYNC = null;
const BONES = ['Hips', 'Head', 'LeftFoot', 'LeftToeBase', 'RightFoot', 'RightToeBase', 'LeftHand', 'RightHand'];

async function init() {
  try { SYNC = await (await fetch('../build/sync.json', { cache: 'no-store' })).json(); } catch (e) { /* 未分析时按原速播放 */ }
  const gltf = await new GLTFLoader().loadAsync('vendor/models/Michelle.glb');
  model = gltf.scene;
  model.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    }
  });
  scene.add(model);
  clip = gltf.animations.find((a) => a.name === 'SambaDance');
  mixer = new THREE.AnimationMixer(model);
  mixer.clipAction(clip).play();
  window.CLIP_DURATION = clip.duration;
  renderAt(0);
  window.READY = true;
}

// 视频时间 -> 动画时间：音乐第 k 拍（t = k·beat）对应动画时间 warp[k]，拍间用 Catmull-Rom 平滑插值
function animTime(t) {
  if (!SYNC) return t;
  const g = SYNC.warp, N = g.length, D = SYNC.loop;
  const G = (j) => g[((j % N) + N) % N] + D * Math.floor(j / N);
  const u = t / SYNC.beat, k = Math.floor(u), f = u - k;
  const p0 = G(k - 1), p1 = G(k), p2 = G(k + 1), p3 = G(k + 2);
  return 0.5 * (2 * p1 + (p2 - p0) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (3 * p1 - p0 - 3 * p2 + p3) * f * f * f);
}

function renderAt(t) {
  mixer.setTime(animTime(t));
  scene.updateMatrixWorld();
  renderer.shadowMap.needsUpdate = true; // 阴影在倒影通道中按当前姿态更新，主通道复用
  reflector.onBeforeRender(renderer, scene, camera);
  reflector.visible = false;
  renderer.render(scene, camera);
}

// 动作分析：按 fps 采样整段动画中关键骨骼的世界坐标（米）
function sampleMotion(fps = 120) {
  const objs = BONES.map((b) => model.getObjectByName('mixamorig' + b));
  const out = { fps, duration: clip.duration, bones: BONES, frames: [] };
  const v = new THREE.Vector3();
  for (let i = 0; i * (1 / fps) < clip.duration; i++) {
    mixer.setTime(i / fps);
    model.updateMatrixWorld(true);
    out.frames.push(objs.map((o) => o.getWorldPosition(v).toArray().map((x) => +x.toFixed(5))));
  }
  return out;
}

// 视频时间 t 下若干骨骼的世界坐标（米），供照片木偶版本驱动 2D 部件
function bonesAt(t, names) {
  mixer.setTime(animTime(t));
  model.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  return names.map((n) => model.getObjectByName('mixamorig' + n).getWorldPosition(v).toArray().map((x) => +x.toFixed(5)));
}

Object.assign(window, { renderAt, animTime, sampleMotion, bonesAt, THREE, scene, camera, renderer });
init().then(() => { if (Q.has('t')) renderAt(+Q.get('t')); });
