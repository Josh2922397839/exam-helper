import * as THREE from 'https://cdn.skypack.dev/three@0.150.1';
import { threeManager } from '../core/three-manager.js';

export function initAtomComponent() {
  return {
    init() {
      const container = this.$refs.atomContainer;
      if (!container) return;

      const init = () => {
        const atom = this.getSelectedAtom();
        const W = container.offsetWidth || 600;
        const H = container.offsetHeight || 420;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 1000);
        const baseZoom = atom.z <= 2 ? 10 : atom.z <= 10 ? 14 : atom.z <= 18 ? 18 : 20;
        camera.position.z = baseZoom;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(W, H);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        const nucleusGroup = new THREE.Group();
        const protons = atom.z;
        const neutrons = atom.neutrons;
        const total = protons + neutrons;
        const nucRadius = Math.pow(total, 1/3) * 0.45;
        
        const protonMat = new THREE.MeshPhongMaterial({ color: 0xff4444, shininess: 100, emissive: 0x441111 });
        const neutronMat = new THREE.MeshPhongMaterial({ color: 0x999999, shininess: 80, emissive: 0x222222 });
        const particleSize = Math.max(0.2, Math.min(0.45, 1.8 / Math.pow(total, 0.4)));
        const sphereGeo = new THREE.SphereGeometry(particleSize, 16, 16);

        for (let i = 0; i < total; i++) {
          const phi = Math.acos(1 - 2 * (i + 0.5) / total);
          const theta = Math.PI * (1 + Math.sqrt(5)) * i;
          const r = nucRadius * Math.pow((i + 1) / total, 1/3);
          const mesh = new THREE.Mesh(sphereGeo, i < protons ? protonMat : neutronMat);
          mesh.position.set(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
          nucleusGroup.add(mesh);
        }
        scene.add(nucleusGroup);

        const shellColors = [0x00aaff, 0x44ff88, 0xffaa00, 0xff44aa];
        const electrons = [];
        const baseR = atom.z <= 2 ? 3 : 2.8;
        const shellStep = atom.z <= 2 ? 0 : (atom.z <= 10 ? 2.8 : 2.5);

        atom.shells.forEach((count, si) => {
          const r = baseR + si * shellStep;
          const color = shellColors[si % shellColors.length];
          const eGeo = new THREE.SphereGeometry(Math.max(0.12, 0.22 - atom.z * 0.004), 12, 12);
          const eMat = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.4, shininess: 120 });

          for (let i = 0; i < count; i++) {
            const e = new THREE.Mesh(eGeo, eMat);
            const baseAngle = (Math.PI * 2 / count) * i;
            const speed = (0.02 - si * 0.003) + (Math.random() * 0.005);
            electrons.push({ mesh: e, radius: r, speed, angle: baseAngle });
            scene.add(e);
          }
        });

        scene.add(new THREE.AmbientLight(0x606060, 1));
        const light = new THREE.PointLight(0xffffff, 1.2, 60);
        light.position.set(12, 10, 10);
        scene.add(light);

        return { scene, camera, renderer, electrons, rotation: { x: 0.3, y: 0 } };
      };

      const animate = (ctx) => {
        ctx.electrons.forEach(e => {
          e.angle += e.speed;
          e.mesh.position.x = Math.cos(e.angle) * e.radius;
          e.mesh.position.z = Math.sin(e.angle) * e.radius;
        });
        ctx.scene.rotation.x = ctx.rotation.x;
        ctx.scene.rotation.y = ctx.rotation.y;
        ctx.rotation.y += 0.003;
        ctx.renderer.render(ctx.scene, ctx.camera);
      };

      const dispose = (ctx) => {
        ctx.renderer.dispose();
        threeManager.disposeHierarchy(ctx.scene);
      };

      threeManager.register('atom-viewer', { init, animate, dispose });

      window.addEventListener('atom-selected', (e) => {
        threeManager.unregister('atom-viewer');
        threeManager.register('atom-viewer', { init, animate, dispose });
      });
    }
  };
}
