/* Zing — anatomical 3D skeleton.
   Built from simple shapes placed on real landmarks (1 unit ≈ 10 cm, standing in the anatomical position:
   facing forward, palms forward). Every bone's pieces are merged into one mesh per bone name, so it renders
   fast and highlighting a bone is just changing one material. Bone names must match assets/js/content/pe.js. */
(function () {
  'use strict';
  const EF = window.EF;

  /* Where each label's leader line points (front view), plus the best angle to look at each bone from. */
  const ANCHORS = {
    'Cranium': [0.55, 7.85, 0.35], 'Mandible': [-0.3, 6.18, 0.62], 'Clavicle': [-1.05, 4.98, 0.86], 'Scapula': [1.62, 4.86, -0.1],
    'Sternum': [0, 3.7, 0.95], 'Ribs': [-1.2, 3.25, 0.45], 'Humerus': [2.0, 3.1, -0.2], 'Vertebral Column': [0, 0.9, -0.12],
    'Radius': [-2.36, 0.45, -0.08], 'Ulna': [2.07, 0.6, -0.22], 'Pelvis': [-1.15, 0.12, 0.05], 'Carpals': [2.33, -0.93, 0.0],
    'Metacarpals': [-2.34, -1.4, 0.06], 'Phalanges': [2.3, -2.1, 0.12], 'Femur': [-1.0, -3.0, 0.05], 'Patella': [0.67, -5.0, 0.34],
    'Tibia': [-0.66, -7.0, 0.1], 'Fibula': [0.92, -7.1, -0.08], 'Tarsals': [-0.62, -9.0, 0.32], 'Metatarsals': [0.68, -9.12, 0.85]
  };
  const VIEW = { 'Scapula': Math.PI, 'Vertebral Column': Math.PI / 2 };
  EF.SKELETON_BONES = Object.keys(ANCHORS);
  EF.SKELETON_ANCHORS = ANCHORS;

  function buildSkeleton(THREE) {
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const Y = V(0, 1, 0);
    const parts = {};
    const tmp = new THREE.Object3D();

    function put(key, geo, pos, rot, scl, quat) {
      tmp.position.copy(pos || V(0, 0, 0));
      if (quat) tmp.quaternion.copy(quat); else tmp.rotation.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0);
      if (scl) tmp.scale.set(scl[0], scl[1], scl[2]); else tmp.scale.set(1, 1, 1);
      tmp.updateMatrix();
      geo.applyMatrix4(tmp.matrix);
      const g = geo.index ? geo.toNonIndexed() : geo;
      if (g !== geo) geo.dispose();
      (parts[key] = parts[key] || []).push(g);
    }
    const ell = (key, p, r, rot) => put(key, new THREE.SphereGeometry(1, 18, 14), p, rot, r);
    const tube = (key, pts, radius, seg, radial) => put(key, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg || 24, radius, radial || 8, false));
    // A long bone: lathe a radius profile [[t 0→1 from a to b, radius]] and point it from a to b
    function bone(key, a, b, profile, flat) {
      const dir = b.clone().sub(a), len = dir.length();
      const g = new THREE.LatheGeometry(profile.map(([t, r]) => new THREE.Vector2(Math.max(0.002, r), t * len)), 16);
      if (flat) g.scale(flat[0], 1, flat[1]);
      put(key, g, a, null, null, new THREE.Quaternion().setFromUnitVectors(Y, dir.normalize()));
    }
    const scaled = (r, prof) => prof.map(([t, m]) => [t, m * r]);
    const SMALL = [[0, 0.3], [0.06, 1.15], [0.16, 0.85], [0.84, 0.78], [0.94, 1.05], [1, 0.3]]; // little bones of hands & feet
    function plate(key, pts, depth, pos, rot, bevel) {
      const shape = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
      const b = bevel == null ? 0.03 : bevel;
      const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 10 });
      g.translate(0, 0, -depth / 2);
      put(key, g, pos, rot);
    }

    /* ---------- spine: S-curve centre line ---------- */
    const spineCurve = new THREE.CatmullRomCurve3([V(0, 6.62, -0.2), V(0, 5.8, -0.06), V(0, 5.0, -0.27), V(0, 3.7, -0.6), V(0, 2.4, -0.55), V(0, 1.55, -0.36), V(0, 0.8, -0.13), V(0, 0.08, -0.28)]);
    const samples = spineCurve.getPoints(240);
    const spineZ = (y) => { let best = samples[0], d = 1e9; for (const p of samples) { const e = Math.abs(p.y - y); if (e < d) { d = e; best = p; } } return best.z; };
    const sternumZ = (y) => 0.74 + (4.62 - y) * 0.13;

    /* ---------- skull ---------- */
    ell('Cranium', V(0, 7.56, -0.03), [0.74, 0.8, 0.95]);                    // braincase
    ell('Cranium', V(0, 7.5, -0.36), [0.68, 0.72, 0.66]);                    // back of the skull, blended into the braincase
    ell('Cranium', V(0, 6.93, 0.42), [0.5, 0.43, 0.47]);                     // maxilla / mid-face
    ell('Cranium', V(0, 7.31, 0.64), [0.5, 0.08, 0.13]);                     // brow ridge
    ell('Cranium', V(0, 6.64, 0.5), [0.35, 0.13, 0.34]);                     // upper dental arch
    ell('Cranium', V(0, 7.03, 0.86), [0.06, 0.1, 0.06]);                     // nasal bones
    [-1, 1].forEach((s) => {
      ell('Cranium', V(s * 0.42, 6.96, 0.64), [0.13, 0.1, 0.12]);             // cheekbones
      tube('Cranium', [V(s * 0.5, 6.96, 0.52), V(s * 0.64, 6.99, 0.25), V(s * 0.66, 6.95, -0.06)], 0.04, 10, 6); // zygomatic arch
      ell('socket', V(s * 0.25, 7.12, 0.72), [0.2, 0.17, 0.1]);              // eye socket
      put('Cranium', new THREE.TorusGeometry(0.19, 0.024, 8, 28), V(s * 0.25, 7.12, 0.77), [0, s * 0.2, 0], [1.08, 0.92, 1]); // orbital rim
      ell('Cranium', V(s * 0.6, 6.98, -0.12), [0.05, 0.1, 0.07]);             // mastoid process
    });
    put('socket', new THREE.ConeGeometry(0.095, 0.24, 3), V(0, 6.85, 0.87), [0, Math.PI, 0], [1, 1, 0.35]); // nasal opening
    for (let i = 0; i < 12; i++) {                                           // upper teeth
      const a = -1.05 + (i / 11) * 2.1;
      put('Cranium', new THREE.BoxGeometry(0.07, 0.11, 0.05), V(Math.sin(a) * 0.32, 6.6, 0.48 + Math.cos(a) * 0.32), [0, a, 0]);
    }
    // mandible: a rounded horseshoe (tube with a tall oval cross-section) plus flat rami up to the jaw joint
    const jawG = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-0.47, 0.06, -0.04), V(-0.43, 0.02, 0.3), V(-0.29, -0.02, 0.6), V(0, -0.04, 0.76), V(0.29, -0.02, 0.6), V(0.43, 0.02, 0.3), V(0.47, 0.06, -0.04)]), 40, 0.07, 10, false);
    jawG.scale(1, 1.75, 1);
    put('Mandible', jawG, V(0, 6.27, 0));
    [-1, 1].forEach((s) => {
      const ramus = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, -0.02, 0.02), V(0, 0.26, -0.02), V(0, 0.52, -0.07)]), 12, 0.055, 10, false);
      ramus.scale(0.75, 1, 2.3);
      put('Mandible', ramus, V(s * 0.46, 6.33, 0.0));
      ell('Mandible', V(s * 0.46, 6.87, -0.12), [0.06, 0.05, 0.08]);          // condyle (jaw joint)
      ell('Mandible', V(s * 0.45, 6.76, 0.12), [0.04, 0.08, 0.05]);           // coronoid process
    });
    ell('Mandible', V(0, 6.18, 0.77), [0.12, 0.07, 0.06]);                    // chin
    for (let i = 0; i < 12; i++) {
      const a = -1.0 + (i / 11) * 2.0;
      put('Mandible', new THREE.BoxGeometry(0.065, 0.1, 0.05), V(Math.sin(a) * 0.3, 6.43, 0.44 + Math.cos(a) * 0.3), [0, a, 0]);
    }

    /* ---------- vertebrae + discs ---------- */
    const segs = [];
    for (let i = 0; i < 7; i++) segs.push({ y: 6.48 - i * 0.212, h: 0.212, r: 0.12 + i * 0.006, k: 'c', i });
    for (let i = 0; i < 12; i++) segs.push({ y: 4.98 - i * 0.283, h: 0.283, r: 0.165 + i * 0.007, k: 't', i });
    for (let i = 0; i < 5; i++) segs.push({ y: 1.58 - i * 0.29, h: 0.29, r: 0.25 + i * 0.012, k: 'l', i });
    segs.forEach((sg) => {
      const cy = sg.y - sg.h * 0.42, z = spineZ(cy), r = sg.r;
      const tilt = Math.atan2(spineZ(cy + 0.06) - spineZ(cy - 0.06), 0.12);
      put('Vertebral Column', new THREE.CylinderGeometry(r, r * 1.04, sg.h * 0.7, 16), V(0, cy, z), [tilt, 0, 0], [1.18, 1, 0.92]);
      put('disc', new THREE.CylinderGeometry(r * 1.0, r * 1.0, sg.h * 0.24, 16), V(0, sg.y - sg.h * 0.89, spineZ(sg.y - sg.h * 0.89)), [tilt, 0, 0], [1.16, 1, 0.9]);
      // neural arch behind the body
      const ar = r * 0.68, az = z - r * 0.8;
      put('Vertebral Column', new THREE.TorusGeometry(ar, 0.032, 6, 14, Math.PI), V(0, cy, az), [-Math.PI / 2 + tilt, 0, 0]);
      // spinous process (C7 sticks out: "vertebra prominens"), pointing back and down
      const prom = sg.k === 'c' && sg.i === 6;
      const len = sg.k === 'c' ? (prom ? 0.34 : 0.2) : sg.k === 't' ? 0.42 : 0.3;
      const ang = sg.k === 'c' ? 0.35 : sg.k === 't' ? 0.8 - sg.i * 0.03 : 0.08;
      const sz0 = az - ar, dir = V(0, -Math.sin(ang), -Math.cos(ang));
      put('Vertebral Column', new THREE.BoxGeometry(0.06, sg.k === 'l' ? 0.15 : 0.08, len), V(0, cy, sz0).addScaledVector(dir, len / 2), [-ang, 0, 0]);
      // transverse processes
      const tl = sg.k === 'c' ? 0.15 : sg.k === 't' ? 0.24 : 0.3;
      [-1, 1].forEach((s) => put('Vertebral Column', new THREE.BoxGeometry(tl, 0.06, 0.07), V(s * (r * 0.75 + tl / 2), cy, az - 0.02), [0, s * (sg.k === 't' ? 0.45 : 0.15), 0]));
    });
    // sacrum (fused wedge tilting back) and coccyx
    plate('Vertebral Column', [[-0.44, 0], [0.44, 0], [0.3, -0.48], [0.1, -0.92], [-0.1, -0.92], [-0.3, -0.48]], 0.2, V(0, 0.02, -0.46), [0.62, 0, 0], 0.05);
    [[0, -0.92, -0.86, 0.08], [0, -1.04, -0.84, 0.065], [0, -1.14, -0.79, 0.05]].forEach((c) => ell('Vertebral Column', V(c[0], c[1], c[2]), [c[3] * 1.3, c[3], c[3]]));

    /* ---------- sternum + rib cage + costal cartilage ---------- */
    plate('Sternum', [[-0.27, 0.27], [0.27, 0.27], [0.19, -0.27], [-0.19, -0.27]], 0.1, V(0, 4.56, sternumZ(4.56)), [-0.13, 0, 0]);
    plate('Sternum', [[-0.15, 0.74], [0.15, 0.74], [0.2, 0.1], [0.15, -0.74], [-0.15, -0.74], [-0.2, 0.1]], 0.09, V(0, 3.52, sternumZ(3.52)), [-0.13, 0, 0]);
    put('Sternum', new THREE.ConeGeometry(0.08, 0.32, 8), V(0, 2.66, sternumZ(2.66)), [Math.PI, 0, 0], [1, 1, 0.5]);

    const A = [0.6, 0.84, 1.0, 1.1, 1.18, 1.24, 1.27, 1.27, 1.24, 1.17, 1.05, 0.92];
    for (let i = 0; i < 12; i++) {
      const yb = 4.86 - i * 0.27;
      const zb = spineZ(yb) - 0.04;
      const trueRib = i < 7, falseRib = i >= 7 && i < 10;
      const yAtt = trueRib ? 4.62 - i * 0.29 : 2.62 - (i - 7) * 0.2;
      const zf = trueRib ? sternumZ(yAtt) : sternumZ(2.7) - 0.06 - (i - 7) * 0.08;
      const b = (zf - zb) / 2, zc = (zf + zb) / 2, a = A[i];
      const bend = 0.12 + i * 0.035;
      const yAt = (phi) => yb + (yAtt - yb) * (phi / Math.PI) - bend * Math.sin(phi);
      const end = trueRib ? 0.8 : falseRib ? 0.7 : i === 10 ? 0.52 : 0.4;
      [-1, 1].forEach((s) => {
        const P = (phi) => V(s * a * Math.sin(phi), yAt(phi), zc - b * Math.cos(phi));
        const pts = [];
        for (let k = 0; k <= 14; k++) pts.push(P(Math.PI * (0.06 + (end - 0.06) * (k / 14))));
        tube('Ribs', pts, i === 0 ? 0.05 : 0.045, 30, 6);
        if (trueRib) {
          const c = [];
          for (let k = 0; k <= 5; k++) c.push(P(Math.PI * (end + (0.95 - end) * (k / 5))));
          c.push(V(s * 0.17, yAtt, sternumZ(yAtt) - 0.02));
          tube('cartilage', c, 0.04, 14, 6);
        } else if (falseRib) {
          const m = V(s * (0.32 + (i - 7) * 0.16), 2.72 - (i - 7) * 0.17, sternumZ(2.72) - 0.06 - (i - 7) * 0.09);
          tube('cartilage', [P(Math.PI * end), P(Math.PI * (end + 0.08)), m.clone().add(V(s * 0.06, -0.08, 0)), m], 0.035, 12, 6);
        }
      });
    }

    /* ---------- shoulder girdle ---------- */
    [-1, 1].forEach((s) => {
      tube('Clavicle', [V(s * 0.2, 4.84, 0.98), V(s * 0.55, 4.92, 1.02), V(s * 0.95, 4.96, 0.84), V(s * 1.3, 4.99, 0.46), V(s * 1.62, 4.97, 0.08)], 0.056, 28, 8);
      ell('Clavicle', V(s * 0.2, 4.84, 0.98), [0.07, 0.07, 0.07]);
      // scapula blade lying on the back of the rib cage, spine of scapula, acromion and coracoid
      const shape = [[-0.5, 0.38], [0.2, 0.46], [0.42, 0.3], [0.4, 0.1], [-0.02, -0.62], [-0.18, -0.98], [-0.3, -0.84], [-0.56, 0.04]].map((p) => [p[0] * s, p[1]]);
      plate('Scapula', shape, 0.03, V(s * 1.0, 4.08, -0.8), [0, -s * 0.5, 0], 0.025);
      tube('Scapula', [V(s * 0.6, 4.44, -0.94), V(s * 1.05, 4.55, -0.82), V(s * 1.42, 4.68, -0.5), V(s * 1.6, 4.82, -0.12)], 0.045, 16, 6);
      ell('Scapula', V(s * 1.6, 4.83, -0.1), [0.14, 0.05, 0.15]);
      tube('Scapula', [V(s * 1.3, 4.52, -0.32), V(s * 1.36, 4.58, -0.08), V(s * 1.34, 4.55, 0.12)], 0.035, 8, 6);
      ell('Scapula', V(s * 1.55, 4.42, -0.26), [0.09, 0.14, 0.09]);          // glenoid rim

      /* ---------- arm ---------- */
      ell('Humerus', V(s * 1.74, 4.43, -0.2), [0.21, 0.21, 0.21]);          // head
      ell('Humerus', V(s * 1.9, 4.5, -0.08), [0.11, 0.12, 0.11]);            // greater tubercle
      bone('Humerus', V(s * 2.04, 1.8, -0.22), V(s * 1.8, 4.36, -0.17), [[0, 0.02], [0.03, 0.15], [0.08, 0.16], [0.16, 0.105], [0.4, 0.09], [0.75, 0.105], [0.9, 0.145], [0.97, 0.16], [1, 0.03]], [1.12, 0.9]);
      ell('Humerus', V(s * 2.04, 1.78, -0.22), [0.25, 0.1, 0.12]);           // epicondyles
      bone('Ulna', V(s * 2.15, -0.8, -0.13), V(s * 1.98, 1.92, -0.34), [[0, 0.02], [0.02, 0.07], [0.06, 0.06], [0.15, 0.05], [0.7, 0.06], [0.87, 0.095], [0.95, 0.125], [1, 0.04]]);
      bone('Radius', V(s * 2.42, -0.82, -0.03), V(s * 2.27, 1.64, -0.16), [[0, 0.02], [0.03, 0.14], [0.08, 0.13], [0.2, 0.08], [0.7, 0.064], [0.86, 0.058], [0.92, 0.085], [0.97, 0.085], [1, 0.02]], [1.18, 0.82]);

      /* ---------- hand (palm forward, thumb on the outside) ---------- */
      for (let row = 0; row < 2; row++) for (let c = 0; c < 4; c++) ell('Carpals', V(s * (2.14 + c * 0.12), -0.9 - row * 0.14, -0.03 + row * 0.01), [0.064, 0.06, 0.058]);
      const tB = V(s * 2.52, -1.02, 0.03), tH = V(s * 2.66, -1.38, 0.17);
      bone('Metacarpals', tB, tH, scaled(0.045, SMALL));
      let p = tH, d = tH.clone().sub(tB).normalize();
      [0.27, 0.2].forEach((L, k) => { const q = p.clone().addScaledVector(d, L); bone('Phalanges', p, q, scaled(0.04 - k * 0.006, SMALL)); p = q; });
      const baseX = [2.44, 2.33, 2.22, 2.12], headX = [2.47, 2.35, 2.23, 2.12], headY = [-1.68, -1.72, -1.67, -1.6];
      const lens = [[0.36, 0.22, 0.16], [0.4, 0.25, 0.17], [0.37, 0.23, 0.16], [0.29, 0.17, 0.14]];
      for (let f = 0; f < 4; f++) {
        const b0 = V(s * baseX[f], -1.08, 0.0), h0 = V(s * headX[f], headY[f], 0.03);
        bone('Metacarpals', b0, h0, scaled(0.046, SMALL));
        let pos = h0, dir = h0.clone().sub(b0).normalize();
        lens[f].forEach((L, k) => {
          dir = dir.clone().applyAxisAngle(V(s, 0, 0), 0.12).normalize();  // relaxed curl
          const q = pos.clone().addScaledVector(dir, L);
          bone('Phalanges', pos, q, scaled(0.04 - k * 0.005, SMALL));
          pos = q;
        });
      }

      /* ---------- hip bone: fan-shaped ilium blade + acetabulum + pubis + ischium ---------- */
      const ilO = V(s * 0.88, -0.22, -0.1);
      const ilQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-s * 0.38, Math.atan2(-0.772, s * 0.636), 0, 'YXZ'));
      const IL = (u, v) => V(u, v, 0).applyQuaternion(ilQ).add(ilO);
      const blade = [[-0.16, -0.56], [0.2, -0.56], [0.44, -0.24], [0.6, 0.12], [0.63, 0.24], [0.5, 0.42], [0.25, 0.54], [0, 0.57], [-0.28, 0.52], [-0.5, 0.38], [-0.6, 0.2], [-0.52, -0.02], [-0.34, -0.3]];
      const bshape = new THREE.Shape(blade.map((q) => new THREE.Vector2(q[0], q[1])));
      const bg = new THREE.ExtrudeGeometry(bshape, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 3, curveSegments: 10 });
      bg.translate(0, 0, -0.035);
      put('Pelvis', bg, ilO, null, null, ilQ);
      tube('Pelvis', [[-0.6, 0.2], [-0.5, 0.38], [-0.28, 0.52], [0, 0.57], [0.25, 0.54], [0.5, 0.42], [0.63, 0.24]].map((q) => IL(q[0], q[1])), 0.055, 24, 7); // iliac crest
      tube('Pelvis', [V(s * 0.46, -0.12, -0.43), V(s * 0.72, -0.48, -0.12), V(s * 0.66, -0.78, 0.24), V(s * 0.38, -0.92, 0.48), V(s * 0.1, -0.98, 0.54)], 0.045, 20, 6); // pelvic brim
      ell('Pelvis', V(s * 0.82, -0.83, 0.03), [0.25, 0.3, 0.3]);
      tube('Pelvis', [V(s * 0.84, -0.78, 0.22), V(s * 0.55, -0.87, 0.45), V(s * 0.22, -0.97, 0.55), V(s * 0.07, -1.02, 0.55)], 0.1, 14, 7);
      tube('Pelvis', [V(s * 0.07, -1.13, 0.52), V(s * 0.3, -1.3, 0.37), V(s * 0.6, -1.42, 0.06), V(s * 0.82, -1.22, -0.1), V(s * 0.86, -0.96, -0.06)], 0.1, 18, 7);
      ell('Pelvis', V(s * 0.6, -1.43, 0.0), [0.13, 0.1, 0.13]);              // ischial tuberosity ("sit bone")

      /* ---------- leg ---------- */
      ell('Femur', V(s * 0.93, -0.86, 0.05), [0.22, 0.22, 0.22]);           // head in the socket
      bone('Femur', V(s * 0.95, -0.88, 0.04), V(s * 1.2, -1.1, 0.0), [[0, 0.11], [0.5, 0.1], [1, 0.12]]);
      ell('Femur', V(s * 1.24, -1.0, -0.05), [0.15, 0.2, 0.16]);             // greater trochanter
      ell('Femur', V(s * 1.02, -1.31, -0.07), [0.07, 0.07, 0.07]);           // lesser trochanter
      bone('Femur', V(s * 0.66, -5.12, 0.02), V(s * 1.17, -1.03, 0.0), [[0, 0.02], [0.02, 0.21], [0.06, 0.26], [0.12, 0.18], [0.22, 0.135], [0.5, 0.12], [0.8, 0.13], [0.92, 0.155], [0.98, 0.165], [1, 0.03]], [1, 0.92]);
      ell('Femur', V(s * 0.57, -5.18, -0.04), [0.12, 0.13, 0.18]);            // condyles
      ell('Femur', V(s * 0.76, -5.18, -0.04), [0.12, 0.13, 0.18]);
      ell('Patella', V(s * 0.67, -5.0, 0.27), [0.15, 0.19, 0.07]);
      bone('Tibia', V(s * 0.63, -8.72, 0.0), V(s * 0.66, -5.36, 0.0), [[0, 0.03], [0.02, 0.15], [0.06, 0.16], [0.15, 0.12], [0.45, 0.105], [0.75, 0.13], [0.88, 0.2], [0.96, 0.27], [1, 0.04]], [1.15, 0.95]);
      ell('Tibia', V(s * 0.66, -5.66, 0.16), [0.07, 0.09, 0.06]);            // tibial tuberosity
      ell('Tibia', V(s * 0.52, -8.76, 0.02), [0.07, 0.1, 0.08]);             // medial malleolus (inner ankle)
      bone('Fibula', V(s * 0.86, -8.72, -0.08), V(s * 0.92, -5.45, -0.1), [[0, 0.02], [0.02, 0.07], [0.06, 0.075], [0.12, 0.045], [0.85, 0.042], [0.94, 0.072], [1, 0.02]]);
      ell('Fibula', V(s * 0.88, -8.8, -0.07), [0.07, 0.11, 0.08]);           // lateral malleolus (outer ankle)

      /* ---------- foot (arch, toes pointing forward) ---------- */
      ell('Tarsals', V(s * 0.68, -8.95, 0.0), [0.15, 0.1, 0.2]);             // talus
      ell('Tarsals', V(s * 0.7, -9.12, -0.25), [0.15, 0.16, 0.3], [-0.25, 0, 0]); // calcaneus (heel)
      ell('Tarsals', V(s * 0.6, -9.0, 0.26), [0.1, 0.08, 0.08]);              // navicular
      ell('Tarsals', V(s * 0.83, -9.1, 0.2), [0.1, 0.08, 0.12]);              // cuboid
      [0.5, 0.6, 0.7].forEach((x) => ell('Tarsals', V(s * x, -9.03, 0.39), [0.06, 0.07, 0.08])); // cuneiforms
      const mbx = [0.5, 0.6, 0.7, 0.8, 0.88], mhx = [0.45, 0.57, 0.68, 0.79, 0.9], mhz = [1.15, 1.13, 1.08, 1.0, 0.92], mr = [0.075, 0.055, 0.052, 0.05, 0.048];
      const toes = [[0.26, 0.2], [0.2, 0.1, 0.08], [0.18, 0.09, 0.08], [0.16, 0.08, 0.07], [0.14, 0.07, 0.06]];
      for (let t = 0; t < 5; t++) {
        const b0 = V(s * mbx[t], -9.04, 0.46), h0 = V(s * mhx[t], -9.2, mhz[t]);
        bone('Metatarsals', b0, h0, scaled(mr[t], SMALL));
        let pos = h0;
        toes[t].forEach((L, k) => {
          const q = pos.clone().add(V(0, -0.025, L));
          bone('Phalanges', pos, q, scaled(mr[t] * (0.82 - k * 0.12), SMALL));
          pos = q;
        });
      }
    });

    /* ---------- merge every bone's pieces into one mesh ---------- */
    function merge(list) {
      let n = 0;
      list.forEach((g) => { n += g.attributes.position.count; });
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
      let o = 0;
      list.forEach((g) => { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; g.dispose(); });
      const m = new THREE.BufferGeometry();
      m.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      m.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      m.computeBoundingSphere();
      m.computeBoundingBox();
      return m;
    }
    return { geos: Object.fromEntries(Object.keys(parts).map((k) => [k, merge(parts[k])])) };
  }

  /* Soft contact shadow under the feet */
  function shadowTexture(THREE) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(0,0,0,0.6)'); grd.addColorStop(0.45, 'rgba(0,0,0,0.25)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  /* ================= the scene ================= */
  EF.skeletonScene = (container, opts) => {
    opts = opts || {};
    const FULL = { z: 38, look: -0.48 };
    const fit = () => { const h = container.clientHeight || 600; FULL.z = (18.2 * h / Math.max(200, h - 130)) / 2 / Math.tan(16 * Math.PI / 180); FULL.look = -0.48 - 0.25 * (130 / h); };
    fit();
    let hovered = null, mode = 'explore';
    const state = {};      // bone → 'sel' | 'good' | 'bad'
    const st = EF.makeStage(container, {
      fov: 32, z: FULL.z, lookY: FULL.look, zMin: 9, zMax: 60, spin: 0.0035, pbr: true, exposure: 1.0,
      onResize: () => { const wasFull = Math.abs(st.zoom.t - FULL.z) < 0.5; fit(); if (wasFull) { st.setZoom(FULL.z); st.setLook(FULL.look); } },
      onHover: (e) => hover(e),
      onLeave: () => { setHover(null); },
      onClick: (e) => { const name = pick(e); if (opts.onPick) opts.onPick(name); }
    });
    const { THREE, scene, camera, renderer } = st;
    const lin = (hex) => new THREE.Color(hex).convertSRGBToLinear();

    const built = buildSkeleton(THREE);
    const group = new THREE.Group();
    scene.add(group);
    const mats = {}, meshes = [];
    Object.keys(built.geos).forEach((key) => {
      let mat;
      if (key === 'socket') mat = new THREE.MeshStandardMaterial({ color: lin(0x1c130d), roughness: 1, side: THREE.DoubleSide });
      else if (key === 'cartilage') mat = new THREE.MeshStandardMaterial({ color: lin(0xb9d2dc), roughness: 0.35, transparent: true, opacity: 0.88 });
      else if (key === 'disc') mat = new THREE.MeshStandardMaterial({ color: lin(0x9fb8c8), roughness: 0.45 });
      else mat = mats[key] = new THREE.MeshStandardMaterial({ color: lin(0xe9dfcc), roughness: 0.58, metalness: 0, side: THREE.DoubleSide, emissive: lin(0x000000) });
      const mesh = new THREE.Mesh(built.geos[key], mat);
      mesh.userData.bone = mats[key] ? key : null;
      group.add(mesh);
      if (mats[key]) meshes.push(mesh);
    });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.2), new THREE.MeshBasicMaterial({ map: shadowTexture(THREE), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, -9.32, 0.35);
    group.add(shadow);

    scene.add(new THREE.HemisphereLight(0xfff1e0, 0x1d1830, 0.85));
    const key = new THREE.DirectionalLight(0xffffff, 1.15); key.position.set(6, 10, 9); scene.add(key);
    const fill = new THREE.DirectionalLight(0xa8c0ff, 0.45); fill.position.set(-8, 3, 5); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffa66b, 0.85); rim.position.set(-3, 5, -10); scene.add(rim);
    const under = new THREE.DirectionalLight(0x9a7cff, 0.22); under.position.set(0, -8, 4); scene.add(under);

    /* ---- colours for selection, hover and quiz feedback ---- */
    const C = { base: lin(0xe9dfcc), sel: lin(0xff6b7d), good: lin(0x4ade80), bad: lin(0xff5a5a), hover: lin(0xffe2b0) };
    const E = { none: lin(0x000000), sel: lin(0x4a0d18), good: lin(0x0b3d1d), bad: lin(0x4a0b0b), hover: lin(0x2a1a06) };
    function paint() {
      Object.keys(mats).forEach((n) => {
        const s = state[n] || (n === hovered ? 'hover' : null);
        mats[n].color.copy(s ? C[s] : C.base);
        mats[n].emissive.copy(s ? E[s] : E.none);
      });
    }
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    function pick(e) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hit = raycaster.intersectObjects(meshes, false)[0];
      return hit ? hit.object.userData.bone : null;
    }
    function setHover(name) {
      if (name === hovered) return;
      hovered = name; paint();
      renderer.domElement.style.cursor = name ? 'pointer' : '';
      if (opts.onHover) opts.onHover(name);
    }
    function hover(e) {
      if (e.target !== renderer.domElement || st.dragging) return;
      const name = pick(e);
      setHover(name);
      if (opts.tooltip) {
        const tip = opts.tooltip;
        if (name && mode !== 'find') {
          const r = container.getBoundingClientRect();
          tip.textContent = name; tip.hidden = false;
          tip.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top - 14}px)`;
        } else tip.hidden = true;
      }
    }

    /* ---- label anchors projected to screen space ---- */
    const anchors = Object.keys(ANCHORS).map((n) => ({ name: n, v: new THREE.Vector3().fromArray(ANCHORS[n]) }));
    const tmpV = new THREE.Vector3();
    function project() {
      const w = container.clientWidth, h = container.clientHeight;
      group.updateMatrixWorld();
      return anchors.map((a) => {
        tmpV.copy(a.v).applyMatrix4(group.matrixWorld).project(camera);
        return { name: a.name, x: (tmpV.x + 1) / 2 * w, y: (1 - tmpV.y) / 2 * h };
      });
    }

    st.onFrame = (t) => {
      group.rotation.x = st.view.x;
      group.rotation.y = st.view.y;
      // gentle pulse on whatever is selected
      const pulse = 0.55 + 0.45 * Math.sin(t * 4);
      Object.keys(state).forEach((n) => { if (state[n] === 'sel' && mats[n]) mats[n].emissiveIntensity = 0.6 + pulse * 0.9; });
      Object.keys(mats).forEach((n) => { if (state[n] !== 'sel') mats[n].emissiveIntensity = 1; });
      if (opts.afterFrame) opts.afterFrame(project);
    };
    st.start();

    const api = {
      bones: EF.SKELETON_BONES,
      set(name, how) { Object.keys(state).forEach((k) => { if (!how || state[k] === how) delete state[k]; }); if (name) state[name] = how || 'sel'; paint(); },
      flash(name, how) { if (name) { state[name] = how; paint(); } },
      clear() { Object.keys(state).forEach((k) => delete state[k]); paint(); },
      focus(name) {
        const a = ANCHORS[name];
        if (!a) return;
        st.autoSpin = false; st.idle = 0;
        st.rotateTo(VIEW[name] != null ? VIEW[name] : 0, 0);
        const y = Math.max(-7.5, Math.min(6.8, a[1]));
        st.setLook(y); st.setZoom(name === 'Vertebral Column' || name === 'Ribs' ? 22 : 15);
      },
      setMode(m) {
        mode = m;
        st.autoSpin = m === 'explore' && !EF.reducedMotion();
        if (m !== 'explore') { st.rotateTo(0, 0); st.setLook(FULL.look); st.setZoom(FULL.z); }
        if (opts.tooltip) opts.tooltip.hidden = true;
      },
      zoom(dir) { st.setZoom(st.zoom.t * (dir > 0 ? 1.18 : 0.85)); },
      reset() { st.rotateTo(0, 0); st.setLook(FULL.look); st.setZoom(FULL.z); st.idle = 0; },
      dispose: st.dispose,
      _st: st
    };
    EF._skeleton = api;
    return api;
  };
})();
