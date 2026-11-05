/* ExamForge core — 3D scenes (Three.js r134, loaded only when a 3D section opens).
   Each scene pauses when it scrolls off-screen or the tab is hidden, and fully cleans up on dispose(). */
(function () {
  'use strict';
  const EF = window.EF;
  const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js';
  let loading = null;

  EF.loadThree = () => {
    if (window.THREE) return Promise.resolve(window.THREE);
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = THREE_URL;
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.onload = () => (window.THREE ? resolve(window.THREE) : reject(new Error('Three.js missing')));
      s.onerror = () => { loading = null; reject(new Error('Could not load Three.js')); };
      document.head.appendChild(s);
    });
    return loading;
  };

  function webglOK() {
    try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; }
  }

  /* Shared plumbing: renderer, resize, visibility-aware render loop, drag-to-rotate, pinch/buttons zoom */
  function makeStage(container, opts) {
    const THREE = window.THREE;
    if (!webglOK()) throw new Error('WebGL is not available on this device');
    const W = container.clientWidth || 600, H = container.clientHeight || 420;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(opts.fov || 50, W / H, 0.1, 1000);
    camera.position.set(0, 0, opts.z || 20);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H);
    renderer.domElement.className = 'stage-canvas';
    container.appendChild(renderer.domElement);

    const st = { THREE, scene, camera, renderer, rotX: opts.rotX || 0, rotY: 0, auto: !EF.reducedMotion(), dragging: false, dragDist: 0, idle: 0, visible: true, raf: 0, onFrame: null, zoom: { min: opts.zMin || 6, max: opts.zMax || 36 } };
    const el = renderer.domElement;
    let last = null, pinch = null;
    const pointers = new Map();

    const onDown = (e) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = Array.from(pointers.values());
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: camera.position.z };
      }
      st.dragging = true; st.dragDist = 0; st.auto = false; st.idle = 0; last = { x: e.clientX, y: e.clientY };
      el.classList.add('is-grabbing');
    };
    const onMove = (e) => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pointers.size === 2) {
        const [a, b] = Array.from(pointers.values());
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        st.setZoom(pinch.z * (pinch.d / Math.max(d, 1)));
        return;
      }
      if (st.dragging && last) {
        const dx = e.clientX - last.x, dy = e.clientY - last.y;
        st.dragDist += Math.abs(dx) + Math.abs(dy);
        st.rotY += dx * 0.008;
        st.rotX = Math.max(-1.4, Math.min(1.4, st.rotX + dy * 0.008));
        last = { x: e.clientX, y: e.clientY };
      }
      if (opts.onHover) opts.onHover(e);
    };
    const onUp = (e) => {
      if (!pointers.has(e.pointerId)) return; // only react to presses that started on this canvas
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      const wasClick = st.dragDist < 6;
      st.dragging = pointers.size > 0;
      el.classList.remove('is-grabbing');
      if (wasClick && opts.onClick && e.type === 'pointerup') opts.onClick(e);
    };
    const onLeave = () => { if (opts.onLeave) opts.onLeave(); };
    const onWheel = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return; // let the page scroll normally
      e.preventDefault();
      st.setZoom(camera.position.z + e.deltaY * 0.02);
    };
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('wheel', onWheel, { passive: false });

    st.setZoom = (z) => { camera.position.z = Math.max(st.zoom.min, Math.min(st.zoom.max, z)); };

    const resize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    };
    const ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(container); else window.addEventListener('resize', resize);

    const io = window.IntersectionObserver ? new IntersectionObserver((ents) => { st.visible = ents[0].isIntersecting; if (st.visible) loop(); }, { threshold: 0.01 }) : null;
    if (io) io.observe(container);
    const onVis = () => { if (!document.hidden) loop(); };
    document.addEventListener('visibilitychange', onVis);

    let t = 0;
    function loop() {
      cancelAnimationFrame(st.raf);
      if (!st.visible || document.hidden || st.disposed) return;
      st.raf = requestAnimationFrame(loop);
      t += 0.016;
      if (!st.dragging) { st.idle += 0.016; if (st.idle > 4 && !EF.reducedMotion()) st.auto = true; }
      if (st.auto) st.rotY += opts.spin || 0.004;
      if (st.onFrame) st.onFrame(t);
      renderer.render(scene, camera);
    }
    st.start = loop;

    st.dispose = () => {
      st.disposed = true;
      cancelAnimationFrame(st.raf);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('wheel', onWheel);
      document.removeEventListener('visibilitychange', onVis);
      if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
      if (io) io.disconnect();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
      renderer.dispose();
      if (renderer.forceContextLoss) renderer.forceContextLoss();
      el.remove();
    };
    return st;
  }

  function disposeGroup(g) {
    g.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    });
  }

  /* ================= ATOM (Bohr model) ================= */
  EF.atomScene = (container, atom) => {
    const st = makeStage(container, { fov: 55, z: 16, rotX: 0.45, zMin: 5, zMax: 34, spin: 0.003 });
    const { THREE, scene, camera } = st;
    scene.add(new THREE.AmbientLight(0x8088a0, 0.9));
    const l1 = new THREE.PointLight(0xffffff, 1.2, 80); l1.position.set(12, 10, 12); scene.add(l1);
    const l2 = new THREE.PointLight(0x4f7cff, 0.7, 60); l2.position.set(-10, -6, 8); scene.add(l2);

    let group = null, electrons = [];
    const shellColors = [0x4fb3ff, 0x4be08a, 0xffb547, 0xff6ad5];

    function build(a) {
      if (group) { scene.remove(group); disposeGroup(group); }
      group = new THREE.Group();
      electrons = [];
      const total = a.z + a.neutrons;
      const nucR = Math.pow(total, 1 / 3) * 0.45;
      const size = Math.max(0.2, Math.min(0.45, 1.8 / Math.pow(total, 0.4)));
      const geo = new THREE.SphereGeometry(size, 18, 18);
      const pMat = new THREE.MeshPhongMaterial({ color: 0xff5a5a, emissive: 0x3a0d0d, shininess: 90 });
      const nMat = new THREE.MeshPhongMaterial({ color: 0xa6abb6, emissive: 0x1c1e22, shininess: 70 });
      // Fibonacci sphere packing, protons and neutrons interleaved so both are visible
      const order = [];
      let p = a.z, n = a.neutrons;
      while (p || n) { if (p) { order.push(1); p--; } if (n) { order.push(0); n--; } }
      for (let i = 0; i < total; i++) {
        const phi = Math.acos(1 - (2 * (i + 0.5)) / total);
        const th = Math.PI * (1 + Math.sqrt(5)) * i;
        const r = total === 1 ? 0 : nucR * Math.pow((i + 1) / total, 1 / 3);
        const m = new THREE.Mesh(geo, order[i] ? pMat : nMat);
        m.position.set(r * Math.sin(phi) * Math.cos(th), r * Math.sin(phi) * Math.sin(th), r * Math.cos(phi));
        group.add(m);
      }
      const glow = new THREE.Mesh(new THREE.SphereGeometry(nucR + 0.45, 24, 24), new THREE.MeshBasicMaterial({ color: 0xff6a2b, transparent: true, opacity: 0.08 }));
      group.add(glow);

      const base = a.z <= 2 ? 3 : 2.8, step = a.z <= 10 ? 2.6 : 2.4;
      a.shells.forEach((count, si) => {
        const r = base + si * step;
        const color = shellColors[si % shellColors.length];
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 6, 128), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 }));
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
        const eMat = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.55, shininess: 120 });
        const haloMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22 });
        const eGeo = new THREE.SphereGeometry(0.2, 14, 14), hGeo = new THREE.SphereGeometry(0.42, 10, 10);
        for (let i = 0; i < count; i++) {
          const e = new THREE.Mesh(eGeo, eMat), h = new THREE.Mesh(hGeo, haloMat);
          group.add(e); group.add(h);
          electrons.push({ e, h, r, a: (Math.PI * 2 * i) / count, s: 0.018 - si * 0.003 });
        }
      });
      scene.add(group);
      const far = base + (a.shells.length - 1) * step;
      st.setZoom(Math.max(9, far * 2.6));
    }

    st.onFrame = () => {
      if (!group) return;
      const still = EF.reducedMotion();
      electrons.forEach((o) => {
        if (!still) o.a += o.s;
        o.e.position.set(Math.cos(o.a) * o.r, 0, Math.sin(o.a) * o.r);
        o.h.position.copy(o.e.position);
      });
      group.rotation.x = st.rotX; group.rotation.y = st.rotY;
    };

    build(atom);
    st.start();
    return {
      setAtom(a) { build(a); },
      zoom(dir) { st.setZoom(camera.position.z + dir * 2.5); },
      reset() { st.rotX = 0.45; st.rotY = 0; },
      dispose: st.dispose
    };
  };

  /* ================= SKELETON ================= */
  EF.skeletonScene = (container, { onSelect, tooltip }) => {
    let hovered = null, clickables = [];
    const raycaster = { ray: null };
    const st = makeStage(container, {
      fov: 50, z: 22, zMin: 10, zMax: 36, spin: 0.004,
      onHover: (e) => hover(e),
      onLeave: () => { hovered = null; repaint(); renderer.domElement.style.cursor = ''; if (tooltip) tooltip.hidden = true; },
      onClick: (e) => { const name = pick(e); if (name) { highlight(name); onSelect && onSelect(name); } }
    });
    const { THREE, scene, camera, renderer } = st;
    raycaster.ray = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const skeleton = new THREE.Group();
    scene.add(skeleton);
    const IVORY = 0xf3e6d3, EMISSIVE = 0x1a0e08;
    const boneMat = () => new THREE.MeshPhongMaterial({ color: IVORY, emissive: EMISSIVE, shininess: 60, specular: 0x444433 });
    const jointMat = new THREE.MeshPhongMaterial({ color: 0xe8d4c0, emissive: 0x150c06, shininess: 40 });
    const socketMat = new THREE.MeshPhongMaterial({ color: 0x2a1f1a, emissive: 0x0a0705 });
    const tag = (g, name) => { g.traverse((c) => { if (c.isMesh && c.material !== socketMat) c.userData = { bone: name }; }); };
    const add = (m, name) => { if (name) m.userData = { bone: name }; skeleton.add(m); return m; };

    function longBone(radius, length, px, py, pz, rz) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.85, length, 12), boneMat()));
      const top = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.25, 12, 12), boneMat());
      top.position.y = length / 2; top.scale.set(1, 0.55, 0.85); g.add(top);
      const bot = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.15, 12, 12), boneMat());
      bot.position.y = -length / 2; bot.scale.set(1, 0.55, 0.85); g.add(bot);
      g.position.set(px, py, pz); if (rz) g.rotation.z = rz;
      skeleton.add(g); return g;
    }

    // Skull
    const skull = new THREE.Group();
    const cranium = new THREE.Mesh(new THREE.SphereGeometry(1.3, 24, 24), boneMat()); cranium.scale.set(0.88, 1.12, 0.95); skull.add(cranium);
    const brow = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.12, 16, 1, false, 0, Math.PI), boneMat()); brow.position.set(0, 0.25, 0.7); brow.scale.set(1, 1, 0.5); skull.add(brow);
    const jaw = new THREE.Group();
    const jawBase = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), boneMat()); jawBase.scale.set(0.82, 0.65, 0.75); jaw.add(jawBase);
    const chin = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), boneMat()); chin.position.set(0, -0.35, 0.45); chin.scale.set(1.2, 0.8, 0.7); jaw.add(chin);
    jaw.position.y = -0.75; skull.add(jaw);
    [-0.6, 0.6].forEach((x) => { const ck = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), boneMat()); ck.position.set(x, -0.2, 0.7); ck.scale.set(0.8, 0.6, 0.5); skull.add(ck); });
    [-0.33, 0.33].forEach((x) => { const o = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), socketMat); o.position.set(x, 0.12, 0.95); skull.add(o); });
    const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.12, 6), socketMat); nose.position.set(0, -0.2, 1.0); skull.add(nose);
    const nasal = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.08), boneMat()); nasal.position.set(0, -0.05, 1.05); skull.add(nasal);
    const teeth = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.06, 12, 1, false, 0, Math.PI), boneMat()); teeth.position.set(0, -0.6, 0.55); teeth.rotation.x = -Math.PI * 0.5; skull.add(teeth);
    skull.position.set(0, 7.8, 0); tag(skull, 'Cranium'); skeleton.add(skull);

    // Spine
    for (let i = 0; i < 24; i++) {
      const t = i / 23, y = 6.5 - t * 7.2, z = Math.sin(t * Math.PI * 2.2) * 0.18;
      const r = i < 7 ? 0.12 + i * 0.003 : i < 19 ? 0.14 + (i - 7) * 0.005 : 0.18 + (i - 19) * 0.01;
      const seg = add(new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, 0.22, 10), boneMat()), 'Vertebral Column'); seg.position.set(0, y, z);
      if (i > 1 && i < 21) {
        const sp = add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 0.3, 6), boneMat()), 'Vertebral Column'); sp.position.set(0, y, z - 0.22); sp.rotation.x = Math.PI * 0.35;
        [-1, 1].forEach((side) => { const tp = add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.2, 5), boneMat()), 'Vertebral Column'); tp.position.set(side * 0.15, y, z - 0.12); tp.rotation.z = side * 0.5; tp.rotation.x = 0.3; });
      }
    }

    // Sternum
    const man = add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.75, 0.16), boneMat()), 'Sternum'); man.position.set(0, 5.35, 0.55);
    const sb = add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.9, 0.14), boneMat()), 'Sternum'); sb.position.set(0, 3.95, 0.55);
    const xi = add(new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.45, 6), boneMat()), 'Sternum'); xi.position.set(0, 2.85, 0.55); xi.rotation.x = Math.PI;

    // Ribs
    [-1, 1].forEach((side) => {
      for (let i = 0; i < 12; i++) {
        const y = 5.5 - i * 0.34;
        const maxR = 0.95 + Math.min(i, 7) * 0.12 - Math.max(0, i - 8) * 0.15;
        const sweep = i < 7 ? 0.68 : i < 10 ? 0.55 - (i - 7) * 0.05 : 0.35;
        const pts = [];
        for (let s = 0; s <= 14; s++) {
          const a = (s / 14) * Math.PI * sweep, r = maxR * (1 - Math.pow(s / 14, 2) * 0.15);
          pts.push(new THREE.Vector3(side * Math.sin(a) * r, Math.sin(a * 0.5) * -0.08, Math.cos(a) * r * 0.5));
        }
        const rib = add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, i < 2 ? 0.05 : 0.055, 6, false), boneMat()), 'Ribs');
        rib.position.set(0, y, 0.15);
      }
    });

    // Clavicles
    [-1, 1].forEach((side) => {
      const pts = [];
      for (let s = 0; s <= 8; s++) { const t = s / 8; pts.push(new THREE.Vector3(side * t * 1.9, Math.sin(t * Math.PI) * 0.12, Math.sin(t * Math.PI * 2) * 0.1 + 0.4)); }
      const cl = add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.07, 8, false), boneMat()), 'Clavicle'); cl.position.set(0, 5.75, 0);
    });

    // Scapulae
    [-1, 1].forEach((side) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.1), boneMat()));
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.1, 0.22), boneMat()); sp.position.set(side * 0.05, 0.4, -0.05); g.add(sp);
      const ac = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.15), boneMat()); ac.position.set(side * 0.5, 0.5, 0.05); g.add(ac);
      g.position.set(side * 1.75, 4.75, -0.35); g.rotation.z = side * 0.08; tag(g, 'Scapula'); skeleton.add(g);
    });

    // Arms
    [-1, 1].forEach((side) => {
      tag(longBone(0.15, 2.5, side * 2.45, 3.75, 0, side * 0.06), 'Humerus');
      tag(longBone(0.09, 2.1, side * 2.25, 1.35, 0.12, side * 0.07), 'Radius');
      tag(longBone(0.09, 2.3, side * 2.65, 1.3, -0.08, -side * 0.04), 'Ulna');
      const hand = new THREE.Group();
      for (let row = 0; row < 2; row++) for (let col = 0; col < 4; col++) {
        const c = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), boneMat()); c.position.set((col - 1.5) * 0.12, -row * 0.12, 0); c.scale.set(1.1, 0.8, 0.9); hand.add(c);
      }
      const ang = [-0.22, -0.1, 0, 0.1, 0.25], len = [0.3, 0.42, 0.48, 0.44, 0.32], ph = [0.22, 0.3, 0.32, 0.3, 0.2];
      for (let f = 0; f < 5; f++) {
        const mx = (f - 2) * 0.13;
        const mc = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, len[f], 6), boneMat()); mc.position.set(mx, -0.3 - len[f] / 2, 0); mc.rotation.z = ang[f] * 0.3; hand.add(mc);
        const kx = mx + Math.sin(ang[f] * 0.3) * len[f], ky = -0.3 - len[f];
        const kn = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), boneMat()); kn.position.set(kx, ky, 0); hand.add(kn);
        const pp = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, ph[f], 6), boneMat()); pp.position.set(kx + Math.sin(ang[f] * 0.5) * ph[f] * 0.5, ky - ph[f] / 2, 0); pp.rotation.z = ang[f] * 0.5; hand.add(pp);
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), boneMat()); tip.position.set(kx + Math.sin(ang[f] * 0.5) * ph[f], ky - ph[f], 0); hand.add(tip);
      }
      hand.position.set(side * 2.45, 0.1, 0.02); tag(hand, 'Carpals'); skeleton.add(hand);
    });

    // Pelvis
    const pelvis = new THREE.Group();
    [-1, 1].forEach((side) => {
      const il = new THREE.Group();
      const wing = new THREE.Mesh(new THREE.SphereGeometry(1.0, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), boneMat());
      wing.scale.set(0.75, 0.95, 0.45); wing.rotation.set(0, side > 0 ? 0 : Math.PI, side * 0.25); wing.userData = { bone: 'Pelvis' }; il.add(wing);
      const ace = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 10), socketMat); ace.position.set(side * 0.35, -0.55, 0.15); il.add(ace);
      il.position.set(side * 0.55, 0, 0); pelvis.add(il);
    });
    const pubis = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.12, 8, 16, Math.PI), boneMat()); pubis.rotation.x = Math.PI; pubis.position.y = -0.55; pubis.userData = { bone: 'Pelvis' }; pelvis.add(pubis);
    const sacrum = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 8), boneMat()); sacrum.position.set(0, -0.15, -0.18); sacrum.userData = { bone: 'Vertebral Column' }; pelvis.add(sacrum);
    const coccyx = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 6), boneMat()); coccyx.position.set(0, -0.65, -0.2); coccyx.userData = { bone: 'Vertebral Column' }; pelvis.add(coccyx);
    pelvis.position.set(0, -0.3, 0); skeleton.add(pelvis);

    // Legs
    [-1, 1].forEach((side) => {
      const fg = new THREE.Group();
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), boneMat()); head.position.set(side * 0.3, 1.6, 0); fg.add(head);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.5, 8), boneMat()); neck.position.set(side * 0.15, 1.35, 0); neck.rotation.z = side * 0.6; fg.add(neck);
      fg.add(new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.17, 2.8, 12), boneMat()));
      [-0.1, 0.1].forEach((x) => { const c = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), boneMat()); c.position.set(x, -1.4, 0); c.scale.set(1, 0.6, 0.9); fg.add(c); });
      fg.position.set(side * 1.0, -2.6, 0); fg.rotation.z = side * 0.03; tag(fg, 'Femur'); skeleton.add(fg);
      const pat = add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), boneMat()), 'Patella'); pat.position.set(side * 1.0, -4.15, 0.35); pat.scale.set(0.85, 1.05, 0.5);
      tag(longBone(0.15, 2.9, side * 0.9, -5.9, 0, 0), 'Tibia');
      tag(longBone(0.07, 2.7, side * 1.25, -5.85, -0.05, 0), 'Fibula');
      const foot = new THREE.Group();
      const calc = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.28, 0.55), boneMat()); calc.position.set(0, 0, -0.2); foot.add(calc);
      const tal = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), boneMat()); tal.position.set(0, 0.1, 0.05); tal.scale.set(1.2, 0.7, 1); foot.add(tal);
      const mid = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.5), boneMat()); mid.position.set(0, -0.04, 0.35); foot.add(mid);
      const fore = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.35), boneMat()); fore.position.set(0, -0.06, 0.7); foot.add(fore);
      for (let t = 0; t < 5; t++) {
        const tl = t === 0 ? 0.35 : 0.25 - t * 0.02;
        const toe = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, tl, 6), boneMat()); toe.position.set(-0.22 + t * 0.11, -0.06, 0.95 + tl / 2); toe.rotation.x = Math.PI * 0.5; foot.add(toe);
        const tt = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), boneMat()); tt.position.set(-0.22 + t * 0.11, -0.06, 0.95 + tl); foot.add(tt);
      }
      foot.position.set(side * 0.9, -7.45, 0.2); tag(foot, 'Tarsals'); skeleton.add(foot);
    });

    // Joints
    [[0, 6.55, 0, 0.14], [-2.2, 5.75, 0, 0.18], [2.2, 5.75, 0, 0.18], [-2.45, 2.5, 0, 0.16], [2.45, 2.5, 0, 0.16], [-1.0, -0.85, 0.15, 0.2], [1.0, -0.85, 0.15, 0.2], [-1.0, -4.15, 0, 0.17], [1.0, -4.15, 0, 0.17], [-0.9, -7.3, 0, 0.13], [0.9, -7.3, 0, 0.13]]
      .forEach((j) => { const m = new THREE.Mesh(new THREE.SphereGeometry(j[3], 12, 12), jointMat); m.position.set(j[0], j[1], j[2]); skeleton.add(m); });

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(3, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -8; skeleton.add(shadow);

    scene.add(new THREE.AmbientLight(0x555566, 0.55));
    const key = new THREE.DirectionalLight(0xfff0e0, 0.95); key.position.set(5, 8, 7); scene.add(key);
    const fill = new THREE.DirectionalLight(0xb0c4de, 0.45); fill.position.set(-4, 3, 5); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xff8866, 0.55); rim.position.set(-2, -3, -6); scene.add(rim);

    skeleton.traverse((c) => { if (c.isMesh && c.userData && c.userData.bone) clickables.push(c); });

    let selected = null;
    function paint(mesh, mode) {
      if (!mesh.material || !mesh.material.emissive) return;
      if (mode === 'sel') { mesh.material.color.set(0xff5a6e); mesh.material.emissive.set(0x5a0f18); }
      else if (mode === 'hover') { mesh.material.color.set(0xffd9a8); mesh.material.emissive.set(0x3a2208); }
      else { mesh.material.color.set(IVORY); mesh.material.emissive.set(EMISSIVE); }
    }
    function repaint() {
      clickables.forEach((m) => paint(m, m.userData.bone === selected ? 'sel' : m.userData.bone === hovered ? 'hover' : null));
    }
    function highlight(name) { selected = name || null; repaint(); }
    function pick(e) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.ray.setFromCamera(mouse, camera);
      const hit = raycaster.ray.intersectObjects(clickables)[0];
      return hit ? hit.object.userData.bone : null;
    }
    function hover(e) {
      if (e.target !== renderer.domElement || st.dragging) return;
      const name = pick(e);
      if (name !== hovered) { hovered = name; repaint(); renderer.domElement.style.cursor = name ? 'pointer' : ''; }
      if (tooltip) {
        if (name) {
          const r = container.getBoundingClientRect();
          tooltip.textContent = name; tooltip.hidden = false;
          tooltip.style.left = e.clientX - r.left + 14 + 'px'; tooltip.style.top = e.clientY - r.top - 12 + 'px';
        } else tooltip.hidden = true;
      }
    }

    st.onFrame = () => { skeleton.rotation.x = st.rotX; skeleton.rotation.y = st.rotY; };
    st.start();
    return {
      highlight,
      zoom(dir) { st.setZoom(camera.position.z + dir * 2.5); },
      reset() { st.rotX = 0; st.rotY = 0; st.setZoom(22); },
      dispose: st.dispose
    };
  };
})();
