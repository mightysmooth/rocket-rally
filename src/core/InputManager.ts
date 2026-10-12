// InputManager.ts - Keyboard, Touch D-Pad, and Thrust Controls
import { RocketPhysics } from '../rocket/RocketPhysics';

export class InputManager {
  private physics: RocketPhysics;

  // Steering states
  public pitchUp: boolean = false;
  public pitchDown: boolean = false;
  public yawLeft: boolean = false;
  public yawRight: boolean = false;
  public thrustActive: boolean = false;

  // Callbacks
  public onStageTrigger: (() => void) | null = null;
  public onTimeWarpChange: ((warp: number) => void) | null = null;

  constructor(physics: RocketPhysics) {
    this.physics = physics;
    this.setupKeyboardListeners();
    this.setupTouchControls();
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

  // Apply continuous steering and throttle every frame
  public update(dt: number): void {
    let pitch = 0;
    let yaw = 0;

    if (this.pitchUp) pitch += 1.0;
    if (this.pitchDown) pitch -= 1.0;
    if (this.yawLeft) yaw += 1.0;
    if (this.yawRight) yaw -= 1.0;

    if (pitch !== 0 || yaw !== 0) {
      this.physics.steer(pitch, yaw, 0, dt);
    }

    // Update throttle
    if (this.physics.cruiseLocked) {
      this.physics.setThrottle(1.0);
    } else if (this.thrustActive) {
      this.physics.setThrottle(1.0);
    } else {
      this.physics.setThrottle(0.0);
    }
  }
}
