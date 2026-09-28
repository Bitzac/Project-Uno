'use strict';
/* Signed-distance body builder: primitives -> sampled grid -> surface nets mesh.
   Coordinates in metres, y up, the figure faces +z, the person's left is +x. */
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const smax = (a, b, k) => k > 0 ? -smin(-a, -b, k) : Math.max(a, b);

function rotT(r) { // transpose of Rz*Ry*Rx
  const cx = Math.cos(r[0]), sx = Math.sin(r[0]), cy = Math.cos(r[1]), sy = Math.sin(r[1]), cz = Math.cos(r[2]), sz = Math.sin(r[2]);
  const R = [cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx,
             sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx,
             -sy, cy * sx, cy * cx];
  return [R[0], R[3], R[6], R[1], R[4], R[7], R[2], R[5], R[8]];
}

function compile(p, h) {
  const q = { t: p.t, op: p.op || 'u', k: p.k || 0, bb: null };
  if (p.t === 'sph') {
    q.cx = p.c[0]; q.cy = p.c[1]; q.cz = p.c[2]; q.r = p.r;
    q.bb = [q.cx - q.r, q.cy - q.r, q.cz - q.r, q.cx + q.r, q.cy + q.r, q.cz + q.r];
  } else if (p.t === 'ell') {
    q.cx = p.c[0]; q.cy = p.c[1]; q.cz = p.c[2]; [q.rx, q.ry, q.rz] = p.r;
    q.m = p.rot ? rotT(p.rot) : null;
    const e = Math.max(q.rx, q.ry, q.rz);
    q.bb = [q.cx - e, q.cy - e, q.cz - e, q.cx + e, q.cy + e, q.cz + e];
  } else if (p.t === 'rc') {
    [q.ax, q.ay, q.az] = p.a; const [bx, by, bz] = p.b;
    q.r1 = p.r1; q.r2 = p.r2;
    q.bax = bx - q.ax; q.bay = by - q.ay; q.baz = bz - q.az;
    q.l2 = q.bax * q.bax + q.bay * q.bay + q.baz * q.baz;
    q.rr = q.r1 - q.r2; q.a2 = q.l2 - q.rr * q.rr; q.il2 = 1 / q.l2;
    const e = Math.max(q.r1, q.r2);
    q.bb = [Math.min(q.ax, bx) - e, Math.min(q.ay, by) - e, Math.min(q.az, bz) - e, Math.max(q.ax, bx) + e, Math.max(q.ay, by) + e, Math.max(q.az, bz) + e];
  } else if (p.t === 'pl') {
    const l = Math.hypot(p.n[0], p.n[1], p.n[2]);
    q.nx = p.n[0] / l; q.ny = p.n[1] / l; q.nz = p.n[2] / l; [q.px, q.py, q.pz] = p.p;
  }
  q.mg = q.k + 2.5 * h;
  return q;
}

function prim(q, x, y, z) {
  switch (q.t) {
    case 'sph': return Math.hypot(x - q.cx, y - q.cy, z - q.cz) - q.r;
    case 'ell': {
      let dx = x - q.cx, dy = y - q.cy, dz = z - q.cz;
      if (q.m) { const m = q.m; const a = m[0] * dx + m[1] * dy + m[2] * dz, b = m[3] * dx + m[4] * dy + m[5] * dz, c = m[6] * dx + m[7] * dy + m[8] * dz; dx = a; dy = b; dz = c; }
      const k0 = Math.hypot(dx / q.rx, dy / q.ry, dz / q.rz);
      const k1 = Math.hypot(dx / (q.rx * q.rx), dy / (q.ry * q.ry), dz / (q.rz * q.rz));
      return k1 < 1e-12 ? -Math.min(q.rx, q.ry, q.rz) : k0 * (k0 - 1) / k1;
    }
    case 'rc': {
      const pax = x - q.ax, pay = y - q.ay, paz = z - q.az;
      const Y = pax * q.bax + pay * q.bay + paz * q.baz, Z = Y - q.l2;
      const vx = pax * q.l2 - q.bax * Y, vy = pay * q.l2 - q.bay * Y, vz = paz * q.l2 - q.baz * Y;
      const x2 = vx * vx + vy * vy + vz * vz, y2 = Y * Y * q.l2, z2 = Z * Z * q.l2;
      const k = Math.sign(q.rr) * q.rr * q.rr * x2;
      if (Math.sign(Z) * q.a2 * z2 > k) return Math.sqrt(x2 + z2) * q.il2 - q.r2;
      if (Math.sign(Y) * q.a2 * y2 < k) return Math.sqrt(x2 + y2) * q.il2 - q.r1;
      return (Math.sqrt(x2 * q.a2 * q.il2) + Y * q.rr) * q.il2 - q.r1;
    }
    case 'pl': return -((x - q.px) * q.nx + (y - q.py) * q.ny + (z - q.pz) * q.nz);
  }
  return 1e9;
}

function evalShape(P, x, y, z) {
  let d = 1e9;
  for (let i = 0; i < P.length; i++) {
    const q = P[i], b = q.bb;
    if (b && q.op !== 'i' && (x < b[0] - q.mg || x > b[3] + q.mg || y < b[1] - q.mg || y > b[4] + q.mg || z < b[2] - q.mg || z > b[5] + q.mg)) {
      if (q.op === 'u') { // far away: a box distance is a safe lower bound
        const dx = Math.max(b[0] - x, 0, x - b[3]), dy = Math.max(b[1] - y, 0, y - b[4]), dz = Math.max(b[2] - z, 0, z - b[5]);
        const di = Math.sqrt(dx * dx + dy * dy + dz * dz); if (di < d) d = di;
      }
      continue;
    }
    const di = prim(q, x, y, z);
    if (q.op === 'u') d = q.k > 0 ? smin(d, di, q.k) : Math.min(d, di);
    else if (q.op === 's') d = smax(d, -di, q.k);
    else d = smax(d, di, q.k);
  }
  return d;
}

const CORNERS = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];

function build(shape, tick) {
  const h = shape.h;
  const P = shape.prims.map(p => compile(p, h));
  let bb = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9], kmax = 0;
  for (const q of P) {
    kmax = Math.max(kmax, q.k);
    if (q.bb && q.op === 'u') for (let a = 0; a < 3; a++) { bb[a] = Math.min(bb[a], q.bb[a]); bb[a + 3] = Math.max(bb[a + 3], q.bb[a + 3]); }
  }
  const pad = kmax + 3 * h;
  const x0 = bb[0] - pad, y0 = bb[1] - pad, z0 = bb[2] - pad;
  const nx = Math.ceil((bb[3] - bb[0] + 2 * pad) / h) + 1, ny = Math.ceil((bb[4] - bb[1] + 2 * pad) / h) + 1, nz = Math.ceil((bb[5] - bb[2] + 2 * pad) / h) + 1;
  const F = new Float32Array(nx * ny * nz);
  // Blocks of B^3 nodes: evaluate only nearby primitives; fill blocks far from the surface at once.
  const B = 4, nbx = Math.ceil(nx / B), nby = Math.ceil(ny / B), nbz = Math.ceil(nz / B);
  const BC = new Array(nbx * nby * nbz);
  for (let bk = 0; bk < nz; bk += B) {
    for (let bj = 0; bj < ny; bj += B) for (let bi = 0; bi < nx; bi += B) {
      const ie = Math.min(bi + B, nx), je = Math.min(bj + B, ny), ke = Math.min(bk + B, nz);
      const lx = x0 + bi * h, ly = y0 + bj * h, lz = z0 + bk * h, ux = x0 + (ie - 1) * h, uy = y0 + (je - 1) * h, uz = z0 + (ke - 1) * h;
      const C = [];
      let solid = false;
      for (const q of P) {
        const b = q.bb;
        if (!b || q.op === 'i' || !(ux < b[0] - q.mg || lx > b[3] + q.mg || uy < b[1] - q.mg || ly > b[4] + q.mg || uz < b[2] - q.mg || lz > b[5] + q.mg)) { C.push(q); if (q.op === 'u') solid = true; }
      }
      BC[bi / B + nbx * (bj / B + nby * (bk / B))] = C;
      if (!solid) { for (let k = bk; k < ke; k++) for (let j = bj; j < je; j++) for (let i = bi; i < ie; i++) F[i + nx * (j + ny * k)] = 1; continue; }
      const mx = (lx + ux) / 2, my = (ly + uy) / 2, mz = (lz + uz) / 2;
      const hd = 0.5 * Math.hypot(ux - lx, uy - ly, uz - lz);
      const dc = evalShape(C, mx, my, mz);
      if (Math.abs(dc) > hd * 1.35 + h * 1.5) { for (let k = bk; k < ke; k++) for (let j = bj; j < je; j++) for (let i = bi; i < ie; i++) F[i + nx * (j + ny * k)] = dc; continue; }
      for (let k = bk; k < ke; k++) { const z = z0 + k * h; for (let j = bj; j < je; j++) { const y = y0 + j * h; for (let i = bi; i < ie; i++) F[i + nx * (j + ny * k)] = evalShape(C, x0 + i * h, y, z); } }
    }
    tick(nx * ny * Math.min(B, nz - bk));
  }
  // One pass: a vertex per surface cell, and a quad for each sign-changing edge at the cell's min corner.
  const cx = nx - 1, cy = ny - 1, sY = nx, sZ = nx * ny;
  const V = new Int32Array(cx * cy * (nz - 1)).fill(-1);
  let pos = new Float32Array(1 << 15), np = 0, idx = new Uint32Array(1 << 16), ni = 0;
  const val = new Float32Array(8), OFF = [0, 1, sY, sY + 1, sZ, sZ + 1, sZ + sY, sZ + sY + 1];
  const quad = (a, b, c, d, axis, outPos) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2];
    const ux = pos[b * 3] - ax, uy = pos[b * 3 + 1] - ay, uz = pos[b * 3 + 2] - az;
    const vx = pos[c * 3] - ax, vy = pos[c * 3 + 1] - ay, vz = pos[c * 3 + 2] - az;
    const nrm = axis === 0 ? uy * vz - uz * vy : axis === 1 ? uz * vx - ux * vz : ux * vy - uy * vx;
    if (ni + 6 > idx.length) { const t = new Uint32Array(idx.length * 2); t.set(idx); idx = t; }
    if ((nrm > 0) === outPos) { idx[ni++] = a; idx[ni++] = b; idx[ni++] = c; idx[ni++] = a; idx[ni++] = c; idx[ni++] = d; }
    else { idx[ni++] = a; idx[ni++] = c; idx[ni++] = b; idx[ni++] = a; idx[ni++] = d; idx[ni++] = c; }
  };
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < cy; j++) {
    const base = sY * j + sZ * k, cb = cx * (j + cy * k);
    for (let i = 0; i < cx; i++) {
      const n0 = base + i;
      let mask = 0;
      for (let c = 0; c < 8; c++) { const v = F[n0 + OFF[c]]; val[c] = v; if (v < 0) mask |= 1 << c; }
      if (mask === 0 || mask === 255) continue;
      let sx = 0, sy = 0, sz = 0, n = 0;
      for (let e = 0; e < 12; e++) {
        const a = EDGES[e][0], b = EDGES[e][1], va = val[a], vb = val[b];
        if ((va < 0) === (vb < 0)) continue;
        const t = va / (va - vb), oa = CORNERS[a], ob = CORNERS[b];
        sx += oa[0] + t * (ob[0] - oa[0]); sy += oa[1] + t * (ob[1] - oa[1]); sz += oa[2] + t * (ob[2] - oa[2]); n++;
      }
      const m = np / 3;
      if (np + 3 > pos.length) { const t = new Float32Array(pos.length * 2); t.set(pos); pos = t; }
      pos[np++] = x0 + (i + sx / n) * h; pos[np++] = y0 + (j + sy / n) * h; pos[np++] = z0 + (k + sz / n) * h;
      const ci = cb + i; V[ci] = m;
      const in0 = (mask & 1) !== 0;
      if (in0 !== ((mask & 2) !== 0) && j > 0 && k > 0) quad(V[ci - cx - cx * cy], V[ci - cx * cy], m, V[ci - cx], 0, in0);
      if (in0 !== ((mask & 4) !== 0) && i > 0 && k > 0) quad(V[ci - 1 - cx * cy], V[ci - 1], m, V[ci - cx * cy], 1, in0);
      if (in0 !== ((mask & 16) !== 0) && i > 0 && j > 0) quad(V[ci - 1 - cx], V[ci - cx], m, V[ci - 1], 2, in0);
    }
  }
  const nv = np / 3, P32 = pos.slice(0, np), N32 = new Float32Array(np), e = h * 0.35;
  for (let v = 0; v < nv; v++) {
    const x = P32[v * 3], y = P32[v * 3 + 1], z = P32[v * 3 + 2];
    const bi = Math.floor((x - x0) / h / B), bj = Math.floor((y - y0) / h / B), bk = Math.floor((z - z0) / h / B);
    const C = BC[bi + nbx * (bj + nby * bk)] || P;
    const gx = evalShape(C, x + e, y, z) - evalShape(C, x - e, y, z);
    const gy = evalShape(C, x, y + e, z) - evalShape(C, x, y - e, z);
    const gz = evalShape(C, x, y, z + e) - evalShape(C, x, y, z - e);
    const l = Math.hypot(gx, gy, gz) || 1;
    N32[v * 3] = gx / l; N32[v * 3 + 1] = gy / l; N32[v * 3 + 2] = gz / l;
  }
  const idxArr = idx.subarray(0, ni);
  const I = nv > 65535 ? idxArr.slice() : Uint16Array.from(idxArr);
  return { pos: P32, nor: N32, idx: I, nodes: nx * ny * nz };
}

function run(shapes, post) {
  const est = s => {
    let bb = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
    for (const p of s.prims) {
      const c = p.c || p.a; if (!c) continue;
      const e = p.r ? (Array.isArray(p.r) ? Math.max(...p.r) : p.r) : Math.max(p.r1 || 0, p.r2 || 0);
      const pts = p.b ? [c, p.b] : [c];
      for (const q of pts) for (let a = 0; a < 3; a++) { bb[a] = Math.min(bb[a], q[a] - e); bb[a + 3] = Math.max(bb[a + 3], q[a] + e); }
    }
    return ((bb[3] - bb[0]) / s.h + 8) * ((bb[4] - bb[1]) / s.h + 8) * ((bb[5] - bb[2]) / s.h + 8);
  };
  const total = shapes.reduce((a, s) => a + est(s), 0);
  let done = 0, last = 0, verts = 0;
  for (const s of shapes) {
    const m = build(s, n => { done += n; const p = Math.min(0.99, done / total); if (p - last > 0.01) { last = p; post({ type: 'progress', p, verts }); } });
    verts += m.pos.length / 3;
    post({ type: 'mesh', id: s.id, pos: m.pos, nor: m.nor, idx: m.idx }, [m.pos.buffer, m.nor.buffer, m.idx.buffer]);
  }
  post({ type: 'done', verts });
}

if (typeof self !== 'undefined' && typeof document === 'undefined') {
  self.onmessage = e => run(e.data.shapes, (m, tr) => self.postMessage(m, tr || []));
}
