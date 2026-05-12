import * as THREE from 'https://cdn.skypack.dev/three@0.150.1';
import { threeManager } from '../core/three-manager.js';

export function initSkeletonComponent() {
  return {
    init() {
      const container = this.$refs.skeletonContainer;
      if (!container) return;

      const init = () => {
        const W = container.offsetWidth || 500;
        const H = container.offsetHeight || 540;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 1000);
        camera.position.set(0, 0, 22);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(W, H);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        const skeletonGroup = new THREE.Group();
        scene.add(skeletonGroup);

        const IVORY = 0xF5E6D3;
        const BONE_EMISSIVE = 0x1A0E08;
        const boneMat = new THREE.MeshPhongMaterial({ color: IVORY, emissive: BONE_EMISSIVE, shininess: 60, specular: 0x444433 });

        // Simplified skeleton for now (Cranium + Spine)
        const cranium = new THREE.Mesh(new THREE.SphereGeometry(1.3, 24, 24), boneMat);
        cranium.scale.set(0.88, 1.12, 0.95);
        cranium.position.y = 7.8;
        skeletonGroup.add(cranium);

        for (let i = 0; i < 24; i++) {
          const y = 6.5 - (i / 23) * 7.2;
          const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.22, 10), boneMat);
          seg.position.set(0, y, 0);
          skeletonGroup.add(seg);
        }

        scene.add(new THREE.AmbientLight(0x555566, 0.5));
        const keyLight = new THREE.DirectionalLight(0xFFF0E0, 0.9);
        keyLight.position.set(5, 8, 7);
        scene.add(keyLight);

        return { scene, camera, renderer, skeletonGroup, rotation: { x: 0, y: 0 } };
      };

      const animate = (ctx) => {
        ctx.rotation.y += 0.005;
        ctx.skeletonGroup.rotation.y = ctx.rotation.y;
        ctx.renderer.render(ctx.scene, ctx.camera);
      };

      const dispose = (ctx) => {
        ctx.renderer.dispose();
        threeManager.disposeHierarchy(ctx.scene);
      };

      threeManager.register('skeleton-viewer', { init, animate, dispose });
    }
  };
}
