// RocketPhysics.ts - Flight Simulation, Orbital Mechanics, Gravity & Kid-Friendly Bounce
import * as THREE from 'three';
import { RocketAssembly } from './RocketAssembly';
import { SolarSystem } from '../celestial/SolarSystem';
import { CelestialBody } from '../celestial/CelestialBody';
import { ParticleEffects } from './ParticleEffects';

export type FlightStatus = 'PAD' | 'FLYING' | 'ORBIT' | 'LANDED';
export type GuidanceMode = 'OFF' | 'PROGRADE' | 'RETROGRADE' | 'TARGET';

export interface FlightTelemetry {
  status: FlightStatus;
  altitude: number;
  speed: number;
  verticalSpeed: number;
  dominantBodyName: string;
  isOrbit: boolean;
  throttle: number;
}

export class RocketPhysics {
  public assembly: RocketAssembly;
  public solarSystem: SolarSystem;
  public particleEffects: ParticleEffects;

  // Kinematic state
  public position: THREE.Vector3 = new THREE.Vector3();
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public quaternion: THREE.Quaternion = new THREE.Quaternion();
  public angularVelocity: THREE.Vector3 = new THREE.Vector3();

  // Controls & flight parameters
  public throttle: number = 0.0;
  public cruiseLocked: boolean = false;
  public flightStatus: FlightStatus = 'PAD';
  public guidanceMode: GuidanceMode = 'OFF';
  public targetBodyId: string | null = null;
  public timeWarp: number = 1.0;

  // Dominant celestial body
  public currentDominant: CelestialBody;
  public landedBody: CelestialBody | null = null;

  // Callbacks for sound and gameplay events
  public onOrbitAchieved: (() => void) | null = null;
  public onTouchdown: ((body: CelestialBody) => void) | null = null;
  public onBounce: (() => void) | null = null;

  private orbitAnnounced: boolean = false;

  constructor(assembly: RocketAssembly, solarSystem: SolarSystem, particleEffects: ParticleEffects) {
    this.assembly = assembly;
    this.solarSystem = solarSystem;
    this.particleEffects = particleEffects;
    this.currentDominant = solarSystem.getHearthstone();

    this.resetToLaunchPad();
  }

  // Position rocket standing upright on Hearthstone North Pole Launchpad
  public resetToLaunchPad(): void {
    const hearth = this.solarSystem.getHearthstone();
    this.currentDominant = hearth;
    this.landedBody = hearth;
    this.flightStatus = 'PAD';
    this.throttle = 0.0;
    this.cruiseLocked = false;
    this.guidanceMode = 'OFF';
    this.orbitAnnounced = false;

    // Hearthstone radius + launch pad height
    const padHeight = hearth.config.radius + 1.2;
    this.position.set(
      hearth.position.x,
      hearth.position.y + padHeight,
      hearth.position.z
    );
    this.velocity.copy(hearth.velocity);

    // Upright quaternion: local Y is up (0, 1, 0)
    this.quaternion.set(0, 0, 0, 1);
    this.angularVelocity.set(0, 0, 0);

    this.assembly.group.position.copy(this.position);
    this.assembly.group.quaternion.copy(this.quaternion);
    this.assembly.resetStaging();
  }

  // Lift off!
  public launch(): void {
    if (this.flightStatus === 'PAD' || this.flightStatus === 'LANDED') {
      this.flightStatus = 'FLYING';
      this.landedBody = null;
      this.throttle = 1.0;

      // Small initial upward push
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion);
      this.velocity.addScaledVector(up, 6.0);
    }
  }

  // User Steering input
  public steer(pitch: number, yaw: number, roll: number, dt: number): void {
    if (this.flightStatus === 'PAD') return;

    // Apply torque directly to angular velocity
    const steerSpeed = 2.4;
    this.angularVelocity.x += pitch * steerSpeed * dt;
    this.angularVelocity.y += yaw * steerSpeed * dt;
    this.angularVelocity.z += roll * steerSpeed * dt;

    if (pitch !== 0 || yaw !== 0 || roll !== 0) {
      this.guidanceMode = 'OFF'; // Manual override disables autopilot
    }
  }

  public setThrottle(t: number): void {
    this.throttle = Math.max(0, Math.min(1, t));
  }

  public setCruise(active: boolean): void {
    this.cruiseLocked = active;
    if (active) {
      this.throttle = 1.0;
    }
  }

  public setGuidanceMode(mode: GuidanceMode): void {
    this.guidanceMode = mode;
  }

  public setTargetBody(id: string | null): void {
    this.targetBodyId = id;
  }

  // Main physics tick
  public update(realDt: number): void {
    // If on pad or landed, keep rocket attached to planet surface
    if (this.flightStatus === 'PAD' || this.flightStatus === 'LANDED') {
      if (this.landedBody) {
        // Rocket position moves along with the planet
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion);
        this.position.copy(this.landedBody.position).addScaledVector(up, this.landedBody.config.radius + 1.2);
        this.velocity.copy(this.landedBody.velocity);
      }
      this.assembly.group.position.copy(this.position);
      this.assembly.group.quaternion.copy(this.quaternion);
      return;
    }

    // Dynamic sub-stepping for smooth physics at high time warps
    const effectiveDt = realDt * this.timeWarp;
    const maxSubStep = 0.033;
    const steps = Math.min(10, Math.ceil(effectiveDt / maxSubStep));
    const subDt = effectiveDt / steps;

    for (let step = 0; step < steps; step++) {
      this.physicsSubStep(subDt);
    }

    // Update 3D visual mesh
    this.assembly.group.position.copy(this.position);
    this.assembly.group.quaternion.copy(this.quaternion);

    // Emit flame particles if thrusting
    if (this.throttle > 0.05) {
      const rocketDir = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion);
      this.assembly.exhaustPoints.forEach(offset => {
        const worldExhaust = offset.clone().applyQuaternion(this.quaternion).add(this.position);
        this.particleEffects.emitThrust(worldExhaust, rocketDir, this.throttle);
      });
    }
  }

  private physicsSubStep(dt: number): void {
    // 1. Identify dominant gravity source
    const { body: dominant } = this.solarSystem.getDominantBody(this.position);
    this.currentDominant = dominant;

    // Vector to dominant planet center
    const toPlanet = dominant.position.clone().sub(this.position);
    const distToCenter = toPlanet.length();
    const surfaceRadius = dominant.config.radius;
    const altitude = Math.max(0, distToCenter - surfaceRadius);

    // 2. Gravitational force
    const G = 1.0;
    const gravMag = (G * dominant.config.mass) / Math.max(surfaceRadius * surfaceRadius * 0.5, distToCenter * distToCenter);
    const gravForce = toPlanet.clone().normalize().multiplyScalar(gravMag);

    // 3. Thrust force
    const rocketForward = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion);
    const totalThrust = this.assembly.getActiveThrust() * this.throttle;
    const thrustAcc = rocketForward.clone().multiplyScalar(totalThrust / this.assembly.totalMass);

    // 4. Atmospheric Drag
    let dragAcc = new THREE.Vector3();
    if (dominant.config.hasAtmosphere && dominant.config.atmosphereRadius) {
      const atmoHeight = dominant.config.atmosphereRadius - surfaceRadius;
      if (altitude < atmoHeight) {
        const atmoDensity = Math.exp(-altitude / (atmoHeight * 0.35));
        const relativeVel = this.velocity.clone().sub(dominant.velocity);
        const speed = relativeVel.length();
        const dragMag = 0.5 * 0.015 * atmoDensity * speed * speed;
        dragAcc = relativeVel.normalize().multiplyScalar(-dragMag);
      }
    }

    // Total Acceleration
    const totalAcc = gravForce.clone().add(thrustAcc).add(dragAcc);

    // 5. Integrate Velocity & Position
    this.velocity.addScaledVector(totalAcc, dt);
    this.position.addScaledVector(this.velocity, dt);

    // 6. Autopilot guidance rotation
    this.applyGuidance(dt, dominant);

    // 7. Angular damping & rotation integration
    this.angularVelocity.multiplyScalar(0.94); // RCS stabilizer damping
    const deltaRot = new THREE.Quaternion().setFromAxisAngle(
      this.angularVelocity.clone().normalize(),
      this.angularVelocity.length() * dt
    );
    if (this.angularVelocity.lengthSq() > 0.000001) {
      this.quaternion.multiply(deltaRot);
    }

    // 8. Surface collision detection & Kid-Friendly Bounce
    if (distToCenter <= surfaceRadius + 0.8) {
      const planetNormal = this.position.clone().sub(dominant.position).normalize();
      const relativeVel = this.velocity.clone().sub(dominant.velocity);
      const impactSpeed = relativeVel.length();
      const verticalSpeed = relativeVel.dot(planetNormal);

      if (impactSpeed < 24.0 && verticalSpeed < 0) {
        // Safe Touchdown!
        this.flightStatus = 'LANDED';
        this.landedBody = dominant;
        this.throttle = 0.0;
        this.cruiseLocked = false;
        this.position.copy(dominant.position).addScaledVector(planetNormal, surfaceRadius + 1.2);
        this.velocity.copy(dominant.velocity);
        this.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), planetNormal);

        this.particleEffects.emitTouchdownDust(this.position, planetNormal);
        this.particleEffects.emitCelebration(this.position);

        if (this.onTouchdown) {
          this.onTouchdown(dominant);
        }
      } else {
        // High-Speed Kid-Friendly Cartoon Bounce!
        // Rocket comically bounces off the planet like a rubber ball!
        const bounceVel = relativeVel.clone().reflect(planetNormal).multiplyScalar(0.5);
        this.velocity.copy(dominant.velocity).add(bounceVel);
        this.position.copy(dominant.position).addScaledVector(planetNormal, surfaceRadius + 1.8);

        this.particleEffects.emitTouchdownDust(this.position, planetNormal);
        if (this.onBounce) {
          this.onBounce();
        }
      }
    }
  }

  // Smooth autopilot orientation
  private applyGuidance(dt: number, dominant: CelestialBody): void {
    if (this.guidanceMode === 'OFF') return;

    let targetDir: THREE.Vector3 | null = null;
    const relVel = this.velocity.clone().sub(dominant.velocity);

    if (this.guidanceMode === 'PROGRADE') {
      if (relVel.lengthSq() > 0.1) {
        targetDir = relVel.clone().normalize();
      }
    } else if (this.guidanceMode === 'RETROGRADE') {
      if (relVel.lengthSq() > 0.1) {
        targetDir = relVel.clone().normalize().negate();
      }
    } else if (this.guidanceMode === 'TARGET' && this.targetBodyId) {
      const targetBody = this.solarSystem.getBody(this.targetBodyId);
      if (targetBody) {
        targetDir = targetBody.position.clone().sub(this.position).normalize();
      }
    }

    if (targetDir) {
      // Rotate rocket nose (local Y axis) smoothly towards target direction
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), targetDir);
      this.quaternion.slerp(targetQuat, 3.5 * dt);
    }
  }

  // Get telemetry readings for HUD
  public getTelemetry(): FlightTelemetry {
    const relVel = this.velocity.clone().sub(this.currentDominant.velocity);
    const speed = relVel.length();
    const toPlanet = this.position.clone().sub(this.currentDominant.position);
    const dist = toPlanet.length();
    const altitude = Math.max(0, dist - this.currentDominant.config.radius);
    const normal = toPlanet.clone().normalize();
    const verticalSpeed = relVel.dot(normal);

    // Orbit detection
    const isOrbit = altitude > 50 && speed > 22 && Math.abs(verticalSpeed) < 8;
    if (isOrbit && !this.orbitAnnounced && this.flightStatus === 'FLYING') {
      this.orbitAnnounced = true;
      if (this.onOrbitAchieved) {
        this.onOrbitAchieved();
      }
    }

    return {
      status: this.flightStatus,
      altitude,
      speed,
      verticalSpeed,
      dominantBodyName: this.currentDominant.config.name,
      isOrbit,
      throttle: this.throttle
    };
  }
}
