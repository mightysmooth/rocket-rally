// InputManager.ts - Keyboard, Touch D-Pad, and Camera-Relative Steering
import * as THREE from 'three';
import { RocketPhysics } from '../rocket/RocketPhysics';

export class InputManager {
  private physics: RocketPhysics;
  private camera: THREE.Camera;

  // Steering states
  public pitchUp: boolean = false;
  public pitchDown: boolean = false;
  public yawLeft: boolean = false;
  public yawRight: boolean = false;
  public thrustActive: boolean = false;

  // Callbacks
  public onStageTrigger: (() => void) | null = null;
  public onTimeWarpChange: ((warp: number) => void) | null = null;

  constructor(physics: RocketPhysics, camera: THREE.Camera) {
    this.physics = physics;
    this.camera = camera;
    this.setupKeyboardListeners();
    this.setupTouchControls();
  }

  public setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  private setupKeyboardListeners(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // Ignore if user is typing a rocket name
      if (document.activeElement?.tagName === 'INPUT') return;

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.pitchDown = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.pitchUp = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.yawLeft = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.yawRight = true;
          break;
        case 'Space':
        case 'ShiftLeft':
          this.thrustActive = true;
          break;
        case 'KeyC':
          this.physics.setCruise(!this.physics.cruiseLocked);
          break;
        case 'KeyX':
          if (this.onStageTrigger) this.onStageTrigger();
          break;
        case 'Digit1':
          if (this.onTimeWarpChange) this.onTimeWarpChange(1);
          break;
        case 'Digit2':
          if (this.onTimeWarpChange) this.onTimeWarpChange(2);
          break;
        case 'Digit3':
          if (this.onTimeWarpChange) this.onTimeWarpChange(5);
          break;
        case 'Digit4':
          if (this.onTimeWarpChange) this.onTimeWarpChange(20);
          break;
        case 'Digit5':
          if (this.onTimeWarpChange) this.onTimeWarpChange(100);
          break;
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.pitchDown = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.pitchUp = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.yawLeft = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.yawRight = false;
          break;
        case 'Space':
        case 'ShiftLeft':
          this.thrustActive = false;
          break;
      }
    });
  }

  // Setup tactile Touch D-Pad & Thrust buttons
  private setupTouchControls(): void {
    const bindPress = (elId: string, onPress: () => void, onRelease: () => void) => {
      const el = document.getElementById(elId);
      if (!el) return;

      const start = (e: Event) => {
        e.preventDefault();
        el.classList.add('pressed');
        onPress();
      };
      const stop = (e: Event) => {
        e.preventDefault();
        el.classList.remove('pressed');
        onRelease();
      };

      el.addEventListener('pointerdown', start);
      el.addEventListener('pointerup', stop);
      el.addEventListener('pointerleave', stop);
      el.addEventListener('pointercancel', stop);
    };

    // D-Pad buttons
    bindPress('dpad-up', () => { this.pitchDown = true; }, () => { this.pitchDown = false; });
    bindPress('dpad-down', () => { this.pitchUp = true; }, () => { this.pitchUp = false; });
    bindPress('dpad-left', () => { this.yawLeft = true; }, () => { this.yawLeft = false; });
    bindPress('dpad-right', () => { this.yawRight = true; }, () => { this.yawRight = false; });

    // Thrust button
    const thrustBtn = document.getElementById('btn-thrust');
    if (thrustBtn) {
      const startThrust = (e: Event) => {
        e.preventDefault();
        thrustBtn.classList.add('thrusting');
        this.thrustActive = true;
      };
      const stopThrust = (e: Event) => {
        e.preventDefault();
        thrustBtn.classList.remove('thrusting');
        this.thrustActive = false;
      };

      thrustBtn.addEventListener('pointerdown', startThrust);
      thrustBtn.addEventListener('pointerup', stopThrust);
      thrustBtn.addEventListener('pointerleave', stopThrust);
      thrustBtn.addEventListener('pointercancel', stopThrust);
    }
  }

  // Apply camera-relative arcade steering and active SAS every frame
  public update(dt: number): void {
    let screenX = 0;
    let screenY = 0;

    if (this.yawLeft) screenX -= 1.0;
    if (this.yawRight) screenX += 1.0;
    if (this.pitchDown) screenY += 1.0; // Upwards on screen
    if (this.pitchUp) screenY -= 1.0;   // Downwards on screen

    if (screenX !== 0 || screenY !== 0) {
      this.physics.steerScreenRelative(screenX, screenY, this.camera, dt);
    } else {
      this.physics.stabilizeSAS(dt);
    }

    // Update throttle (respects automated flight if auto-ascent or autopilot is active)
    if (!this.physics.isAutoFlying()) {
      if (this.physics.cruiseLocked) {
        this.physics.setThrottle(1.0);
      } else if (this.thrustActive) {
        this.physics.setThrottle(1.0);
      } else {
        this.physics.setThrottle(0.0);
      }
    }
  }
}
