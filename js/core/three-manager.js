/**
 * ThreeManager: Handles the lifecycle of Three.js scenes
 * to prevent memory leaks and optimize performance.
 */
class ThreeManager {
  constructor() {
    this.scenes = new Map();
    this.frameId = null;
    this.lastTime = 0;
  }

  register(id, { init, animate, dispose }) {
    if (this.scenes.has(id)) {
      this.unregister(id);
    }
    
    const context = init();
    this.scenes.set(id, { context, animate, dispose });
    
    if (!this.frameId) {
      this.startLoop();
    }
  }

  unregister(id) {
    const scene = this.scenes.get(id);
    if (scene) {
      if (scene.dispose) scene.dispose(scene.context);
      this.scenes.delete(id);
    }
    
    if (this.scenes.size === 0 && this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  startLoop() {
    const loop = (time) => {
      const delta = time - this.lastTime;
      this.lastTime = time;

      this.scenes.forEach((scene) => {
        if (scene.animate) {
          scene.animate(scene.context, delta);
        }
      });

      this.frameId = requestAnimationFrame(loop);
    };
    this.frameId = requestAnimationFrame(loop);
  }

  /**
   * Helper to dispose of common Three.js objects
   */
  static disposeHierarchy(object, callback) {
    object.traverse(child => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
      if (callback) callback(child);
    });
  }
}

export const threeManager = new ThreeManager();
