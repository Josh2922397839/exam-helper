/* ExamForge core — 3D stage + atom scene (Three.js r134, loaded only when a 3D section opens).
   The skeleton lives in skeleton.js and reuses EF.makeStage from here.
   Every scene pauses when off-screen or when the tab is hidden, and fully cleans up on dispose(). */
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

  const TAU = Math.PI * 2;
  const lerp = (a, b, t) => a + (b - a) * t;

  /* Shared stage: renderer, resize, visibility-aware loop, drag with inertia, damped zoom/pan, pinch, focus */
  EF.makeStage = function makeStage(container, opts) {
    const THREE = window.THREE;
    if (!webglOK()) throw new Error('3D isn’t available on this device');
    const W = container.clientWidth || 600, H = container.clientHeight || 420;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(opts.fov || 50, W / H, 0.1, 500);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H);
    if (opts.pbr) {
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = opts.exposure || 1;
    }
    renderer.domElement.className = 'stage-canvas';
    container.appendChild(renderer.domElement);

    const still = EF.reducedMotion();
    const st = {
      THREE, scene, camera, renderer,
      tgt: { x: opts.rotX || 0, y: opts.rotY || 0 },   // where the model is heading
      view: { x: opts.rotX || 0, y: opts.rotY || 0 },  // where it is drawn (eased)
      vel: 0, dragging: false, dragDist: 0, idle: 0,
      autoSpin: !still, spin: opts.spin || 0.003,
      zoom: { t: opts.z || 20, min: opts.zMin || 6, max: opts.zMax || 36 },
      look: { t: opts.lookY || 0, c: opts.lookY || 0 },
      visible: true, raf: 0, onFrame: null, disposed: false
    };
    camera.position.set(0, st.look.c, st.zoom.t);
    camera.lookAt(0, st.look.c, 0);

    const el = renderer.domElement;
    let last = null, pinch = null;
    const pointers = new Map();

    const onDown = (e) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = Array.from(pointers.values());
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: st.zoom.t };
      }
      st.dragging = true; st.dragDist = 0; st.idle = 0; st.vel = 0;
      last = { x: e.clientX, y: e.clientY, t: performance.now() };
      el.classList.add('is-grabbing');
    };
    const onMove = (e) => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pointers.size === 2) {
        const [a, b] = Array.from(pointers.values());
        st.setZoom(pinch.z * (pinch.d / Math.max(Math.hypot(a.x - b.x, a.y - b.y), 1)));
        return;
      }
      if (st.dragging && last) {
        const dx = e.clientX - last.x, dy = e.clientY - last.y;
        st.dragDist += Math.abs(dx) + Math.abs(dy);
        st.tgt.y += dx * 0.009;
        if (!opts.lockX) st.tgt.x = Math.max(-1.2, Math.min(1.2, st.tgt.x + dy * 0.007));
        st.vel = st.vel * 0.4 + dx * 0.009 * 0.6;
        last = { x: e.clientX, y: e.clientY, t: performance.now() };
      }
      if (opts.onHover) opts.onHover(e);
    };
    const onUp = (e) => {
      if (!pointers.has(e.pointerId)) return; // only presses that started on this canvas
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      const wasClick = st.dragDist < 6;
      if (last && performance.now() - last.t > 90) st.vel = 0; // held still before letting go: no fling
      st.dragging = pointers.size > 0;
      el.classList.remove('is-grabbing');
      if (wasClick && opts.onClick && e.type === 'pointerup') opts.onClick(e);
    };
    const onLeave = () => { if (opts.onLeave) opts.onLeave(); };
    const onWheel = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return; // plain scrolling keeps scrolling the page
      e.preventDefault();
      st.setZoom(st.zoom.t * (1 + e.deltaY * 0.0015));
    };
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('wheel', onWheel, { passive: false });

    st.setZoom = (z) => { st.zoom.t = Math.max(st.zoom.min, Math.min(st.zoom.max, z)); };
    st.setLook = (y) => { st.look.t = y; };
    // Ease to a viewing angle, taking the short way round
    st.rotateTo = (y, x) => {
      st.vel = 0;
      const base = Math.round((st.tgt.y - y) / TAU) * TAU;
      st.tgt.y = base + y;
      if (x != null) st.tgt.x = x;
    };

    const resize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
      if (opts.onResize) opts.onResize(w, h);
      if (!st.raf) renderer.render(scene, camera);
    };
    const ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(container); else window.addEventListener('resize', resize);

    const io = window.IntersectionObserver ? new IntersectionObserver((ents) => { st.visible = ents[0].isIntersecting; if (st.visible) loop(); }, { threshold: 0.01 }) : null;
    if (io) io.observe(container);
    const onVis = () => { if (!document.hidden) loop(); };
    document.addEventListener('visibilitychange', onVis);

    let t = 0, prev = performance.now();
    function loop() {
      cancelAnimationFrame(st.raf); st.raf = 0;
      if (!st.visible || document.hidden || st.disposed) return;
      st.raf = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
      const k = 1 - Math.pow(0.001, dt);             // frame-rate independent easing
      t += dt;
      if (!st.dragging) {
        st.idle += dt;
        if (Math.abs(st.vel) > 0.00005) { st.tgt.y += st.vel; st.vel *= Math.pow(0.04, dt); }
        else st.vel = 0;
        if (st.autoSpin && st.idle > 4 && !still) st.tgt.y += st.spin * dt * 60;
      }
      st.view.x = lerp(st.view.x, st.tgt.x, k);
      st.view.y = lerp(st.view.y, st.tgt.y, k);
      camera.position.z = lerp(camera.position.z, st.zoom.t, k * 0.8);
      st.look.c = lerp(st.look.c, st.look.t, k * 0.8);
      camera.position.y = st.look.c;
      camera.lookAt(0, st.look.c, 0);
      if (st.onFrame) st.onFrame(t, dt);
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
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
      });
      renderer.dispose();
      if (renderer.forceContextLoss) renderer.forceContextLoss();
      el.remove();
    };
    return st;
  };

  EF.disposeGroup = (g) => {
    g.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    });
  };

  /* ================= ATOM (Bohr model) ================= */
  EF.atomScene = (container, atom) => {
    const st = EF.makeStage(container, { fov: 50, z: 16, rotX: 0.45, zMin: 5, zMax: 40, spin: 0.003 });
    const { THREE, scene } = st;
    scene.add(new THREE.AmbientLight(0x8088a0, 0.9));
    const l1 = new THREE.PointLight(0xffffff, 1.2, 80); l1.position.set(12, 10, 12); scene.add(l1);
    const l2 = new THREE.PointLight(0x4f7cff, 0.7, 60); l2.position.set(-10, -6, 8); scene.add(l2);

    let group = null, electrons = [], grow = 1, fitZ = 16;
    const shellColors = [0x4fb3ff, 0x4be08a, 0xffb547, 0xff6ad5];

    function build(a) {
      if (group) { scene.remove(group); EF.disposeGroup(group); }
      group = new THREE.Group();
      electrons = [];
      const total = a.z + a.neutrons;
      const nucR = Math.pow(total, 1 / 3) * 0.45;
      const size = Math.max(0.2, Math.min(0.45, 1.8 / Math.pow(total, 0.4)));
      const geo = new THREE.SphereGeometry(size, 18, 18);
      const pMat = new THREE.MeshPhongMaterial({ color: 0xff5a5a, emissive: 0x3a0d0d, shininess: 90 });
      const nMat = new THREE.MeshPhongMaterial({ color: 0xa6abb6, emissive: 0x1c1e22, shininess: 70 });
      // Fibonacci-sphere packing, protons and neutrons interleaved so both colours show
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
      group.add(new THREE.Mesh(new THREE.SphereGeometry(nucR + 0.45, 24, 24), new THREE.MeshBasicMaterial({ color: 0xff6a2b, transparent: true, opacity: 0.08 })));

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
          electrons.push({ e, h, r, a: (TAU * i) / count, s: 0.018 - si * 0.003 });
        }
      });
      scene.add(group);
      fitZ = Math.max(9, (base + (a.shells.length - 1) * step) * 2.6);
      st.setZoom(fitZ);
      grow = EF.reducedMotion() ? 1 : 0.6; // pop in when switching elements
    }

    st.onFrame = (t, dt) => {
      if (!group) return;
      const moving = !EF.reducedMotion();
      grow += (1 - grow) * Math.min(1, dt * 9);
      group.scale.setScalar(grow);
      electrons.forEach((o) => {
        if (moving) o.a += o.s * dt * 60;
        o.e.position.set(Math.cos(o.a) * o.r, 0, Math.sin(o.a) * o.r);
        o.h.position.copy(o.e.position);
      });
      group.rotation.x = st.view.x; group.rotation.y = st.view.y;
    };

    build(atom);
    st.start();
    return {
      setAtom(a) { build(a); },
      zoom(dir) { st.setZoom(st.zoom.t * (dir > 0 ? 1.18 : 0.85)); },
      reset() { st.rotateTo(0, 0.45); st.setZoom(fitZ); },
      dispose: st.dispose
    };
  };
})();
