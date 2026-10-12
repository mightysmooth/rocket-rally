// CameraManager.ts - Smooth Cinematic & Touch-Friendly Camera Transitions
import * as THREE from 'three';
import { RocketPhysics } from '../rocket/RocketPhysics';
import { SolarSystem } from '../celestial/SolarSystem';

export type CameraMode = 'BUILDER' | 'ROCKET' | 'COCKPIT' | 'MAP' | 'PLANET';

export class CameraManager {
  public camera: THREE.PerspectiveCamera;
  private mode: CameraMode = 'BUILDER';
  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  private targetLookAt: THREE.Vector3 = new THREE.Vector3();

  // Orbit angles for user drag rotation
  private orbitTheta: number = 0;
  private orbitPhi: number = Math.PI * 0.28;
  private orbitRadius: number = 24;

  // Touch & Mouse input state
  private isPointerDown: boolean = false;
  private lastPointerX: number = 0;
  private lastPointerY: number = 0;
  private touchDistance: number = 0;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.setupTouchAndPointerListeners();
  }

  public setMode(mode: CameraMode): void {
    this.mode = mode;
    if (mode === 'BUILDER') {
      this.orbitRadius = 22;
      this.orbitPhi = Math.PI * 0.28;
      this.orbitTheta = 0.5;
    } else if (mode === 'ROCKET') {
      this.orbitRadius = 28;
      this.orbitPhi = Math.PI * 0.35;
    } else if (mode === 'MAP') {
      this.orbitRadius = 2400;
      this.orbitPhi = Math.PI * 0.48; // Near top-down map view
    } else if (mode === 'PLANET') {
      this.orbitRadius = 200;
      this.orbitPhi = Math.PI * 0.3;
    }
  }

  public getMode(): CameraMode {
    return this.mode;
  }

  // Handle pointer and touch controls on the WebGL canvas
  private setupTouchAndPointerListeners(): void {
    window.addEventListener('pointerdown', (e: PointerEvent) => {
      // Only process when targeting the 3D canvas or background
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.closest('.hud-panel') || target.closest('.parts-tray')) {
        return;
      }
      this.isPointerDown = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    });

    window.addEventListener('pointermove', (e: PointerEvent) => {
      if (!this.isPointerDown) return;
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;

      const sensitivity = 0.006;
      this.orbitTheta -= dx * sensitivity;
      const maxPhi = this.mode === 'BUILDER' ? Math.PI * 0.48 : Math.PI - 0.08;
      this.orbitPhi = Math.max(0.08, Math.min(maxPhi, this.orbitPhi - dy * sensitivity));
    });

    window.addEventListener('pointerup', () => {
      this.isPointerDown = false;
    });

    // Pinch to zoom on mobile
    window.addEventListener('touchstart', (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this.touchDistance = Math.hypot(dx, dy);
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const delta = dist - this.touchDistance;
        this.touchDistance = dist;

        this.orbitRadius = Math.max(12, Math.min(4000, this.orbitRadius - delta * 0.8));
      }
    }, { passive: true });

    // Desktop Mouse wheel zoom
    window.addEventListener('wheel', (e: WheelEvent) => {
      const zoomFactor = e.deltaY > 0 ? 1.12 : 0.88;
      this.orbitRadius = Math.max(12, Math.min(4000, this.orbitRadius * zoomFactor));
    }, { passive: true });
  }

  // Update camera each frame
  public update(dt: number, physics: RocketPhysics, solarSystem: SolarSystem): void {
    const rocketPos = physics.position;
    const rocketQuat = physics.quaternion;

    if (this.mode === 'BUILDER') {
      // Orbit around rocket on launch pad
      const center = rocketPos.clone().add(new THREE.Vector3(0, 3, 0));
      this.targetLookAt.copy(center);

      const x = center.x + this.orbitRadius * Math.sin(this.orbitPhi) * Math.sin(this.orbitTheta);
      const y = center.y + this.orbitRadius * Math.cos(this.orbitPhi);
      const z = center.z + this.orbitRadius * Math.sin(this.orbitPhi) * Math.cos(this.orbitTheta);
      this.targetPosition.set(x, y, z);

    } else if (this.mode === 'ROCKET') {
      // Follow rocket closely in flight
      this.targetLookAt.copy(rocketPos);

      // Rocket direction
      const forward = new THREE.Vector3(0, 1, 0).applyQuaternion(rocketQuat);
      const camOffset = new THREE.Vector3(
        this.orbitRadius * Math.sin(this.orbitPhi) * Math.sin(this.orbitTheta),
        this.orbitRadius * Math.cos(this.orbitPhi),
        this.orbitRadius * Math.sin(this.orbitPhi) * Math.cos(this.orbitTheta)
      );

      this.targetPosition.copy(rocketPos).add(camOffset);

    } else if (this.mode === 'COCKPIT') {
      // Inside astronaut capsule bubble!
      const eyeOffset = new THREE.Vector3(0, 6.2, 0.5).applyQuaternion(rocketQuat);
      this.targetPosition.copy(rocketPos).add(eyeOffset);

      // Look forward through windshield
      const lookDir = new THREE.Vector3(0, 8.0, 6.0).applyQuaternion(rocketQuat);
      this.targetLookAt.copy(rocketPos).add(lookDir);

    } else if (this.mode === 'MAP') {
      // High-altitude solar system overview
      const center = solarSystem.sunLight.position;
      this.targetLookAt.copy(center);

      const x = center.x + this.orbitRadius * Math.sin(this.orbitPhi) * Math.sin(this.orbitTheta);
      const y = center.y + this.orbitRadius * Math.cos(this.orbitPhi);
      const z = center.z + this.orbitRadius * Math.sin(this.orbitPhi) * Math.cos(this.orbitTheta);
      this.targetPosition.set(x, y, z);

    } else if (this.mode === 'PLANET') {
      // Focus on selected target planet or dominant world
      const planet = physics.targetBodyId ? solarSystem.getBody(physics.targetBodyId) : physics.currentDominant;
      const center = planet ? planet.position : rocketPos;
      this.targetLookAt.copy(center);

      const rad = planet ? planet.config.radius * 2.8 : this.orbitRadius;
      const x = center.x + rad * Math.sin(this.orbitPhi) * Math.sin(this.orbitTheta);
      const y = center.y + rad * Math.cos(this.orbitPhi);
      const z = center.z + rad * Math.sin(this.orbitPhi) * Math.cos(this.orbitTheta);
      this.targetPosition.set(x, y, z);
    }

    // Smooth camera interpolation
    const lerpSpeed = Math.min(1.0, 8.0 * dt);
    this.camera.position.lerp(this.targetPosition, lerpSpeed);

    // Smooth lookAt target
    const currentLook = new THREE.Vector3();
    this.camera.getWorldDirection(currentLook);
    this.camera.lookAt(this.targetLookAt);
  }
}
