import * as THREE from 'three';
import { RocketAssembly } from './RocketAssembly';
import { SolarSystem } from '../celestial/SolarSystem';
import { CelestialBody } from '../celestial/CelestialBody';
import { ParticleEffects } from './ParticleEffects';
import { HighwayInfo } from '../celestial/TrajectoryRenderer';

export type FlightStatus = 'PAD' | 'FLYING' | 'ORBIT' | 'LANDED';
export type AutoAscentState = 'INACTIVE' | 'VERTICAL' | 'GRAVITY_TURN' | 'CIRCULARIZING';
export type AutopilotState = 'IDLE' | 'ALIGNING' | 'TRANSFERRING' | 'CAPTURING';
export type AutoLandingState = 'IDLE' | 'DEORBITING' | 'DESCENDING';
export type GuidanceMode = 'OFF' | 'PROGRADE' | 'RETROGRADE' | 'TARGET';

export interface FlightTelemetry {
  status: FlightStatus;
  altitude: number;
  speed: number;
  verticalSpeed: number;
  dominantBodyName: string;
  isOrbit: boolean;
  throttle: number;
  autoAscentState: AutoAscentState;
  autopilotState: AutopilotState;
  autoLandingState: AutoLandingState;
  isOnHighway: boolean;
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

  // Automated flight state machines
  public autoAscentState: AutoAscentState = 'INACTIVE';
  public autopilotState: AutopilotState = 'IDLE';
  public autoLandingState: AutoLandingState = 'IDLE';
  public isOnHighway: boolean = false;
  public currentHighwayInfo: HighwayInfo | null = null;
  public isActivelySteering: boolean = false;

  // Dominant celestial body
  public currentDominant: CelestialBody;
  public landedBody: CelestialBody | null = null;

  // Callbacks for sound and gameplay events
  public onOrbitAchieved: (() => void) | null = null;
  public onTouchdown: ((body: CelestialBody) => void) | null = null;
  public onBounce: (() => void) | null = null;
  public onAutoStage: (() => void) | null = null;
  public onArrivedAtDestination: ((body: CelestialBody) => void) | null = null;

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
    this.autoAscentState = 'INACTIVE';
    this.autopilotState = 'IDLE';
    this.autoLandingState = 'IDLE';
    this.timeWarp = 1.0;

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

  // Lift off! Option 1A: Automatic ascent into stable circular parking orbit
  public launch(): void {
    if (this.flightStatus === 'PAD' || this.flightStatus === 'LANDED') {
      this.flightStatus = 'FLYING';
      this.landedBody = null;
      this.autoAscentState = 'VERTICAL';
      this.autopilotState = 'IDLE';
      this.autoLandingState = 'IDLE';
      this.throttle = 1.0;
      this.cruiseLocked = true;
      this.guidanceMode = 'OFF';
      this.orbitAnnounced = false;

      // Initial upward velocity away from planet surface
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion);
      this.velocity.copy(this.currentDominant.velocity).addScaledVector(up, 18.0);
    }
  }

  // Option 2A: Camera-Relative Arcade Steering with Active SAS
  public steerScreenRelative(screenX: number, screenY: number, camera: THREE.Camera, dt: number): void {
    if (this.flightStatus === 'PAD' || this.flightStatus === 'LANDED') return;

    // If autopilot is actively running and player touches steering, yield control back to player
    if (this.autopilotState !== 'IDLE') {
      this.cancelAutopilot();
    }
    if (this.autoLandingState !== 'IDLE') {
      this.cancelAutoLanding();
    }
    if (this.autoAscentState !== 'INACTIVE') {
      this.autoAscentState = 'INACTIVE'; // Manual override
    }

    this.guidanceMode = 'OFF';

    // Get Camera View Directions
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    const camRight = new THREE.Vector3().crossVectors(camDir, camera.up).normalize();
    const camUp = new THREE.Vector3().crossVectors(camRight, camDir).normalize();

    // Rocket current forward nose (local +Y)
    const currentForward = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion);

    // Turn impulse relative to screen coordinates
    const turnVector = camRight.clone().multiplyScalar(screenX).addScaledVector(camUp, screenY);

    if (turnVector.lengthSq() > 0.01) {
      this.isActivelySteering = true;
      // Rotate forward vector smoothly towards turnVector
      const turnRate = 3.6; // Responsive arcade agility
      const newForward = currentForward.clone().addScaledVector(turnVector, turnRate * dt).normalize();

      // Create target quaternion
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), newForward);

      // Smoothly blend orientation
      this.quaternion.slerp(targetQuat, Math.min(1.0, 12.0 * dt));

      // Active SAS damping: zero out angular velocity so it never drifts or spins
      this.angularVelocity.set(0, 0, 0);
    } else {
      this.isActivelySteering = false;
    }
  }

  // Active SAS Stabilizer: Locks heading, stops spin, and auto-levels roll
  public stabilizeSAS(dt: number): void {
    this.isActivelySteering = false;
    if (this.flightStatus === 'PAD' || this.flightStatus === 'LANDED') return;

    // Zero out any residual angular momentum immediately
    this.angularVelocity.set(0, 0, 0);

    // Gentle auto-level: ensure rocket roll aligns nicely with planet horizon
    const planetUp = this.position.clone().sub(this.currentDominant.position).normalize();
    const rocketForward = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion);

    // If rocket is not pointing straight up or straight down, level the roll
    if (Math.abs(rocketForward.dot(planetUp)) < 0.92) {
      const desiredUp = planetUp;
      // We keep rocketForward unchanged, only align local Z with horizontal tangent
      const right = new THREE.Vector3().crossVectors(desiredUp, rocketForward).normalize();
      const trueUp = new THREE.Vector3().crossVectors(rocketForward, right).normalize();

      const m = new THREE.Matrix4().makeBasis(right, rocketForward, trueUp.negate());
      const levelQuat = new THREE.Quaternion().setFromRotationMatrix(m);
      this.quaternion.slerp(levelQuat, Math.min(1.0, 2.5 * dt));
    }
  }

  public setThrottle(t: number): void {
    // Prevent manual throttle reset if auto-ascent or autopilot is actively flying
    if (this.isAutoFlying()) return;
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

  public setHighwayInfo(info: HighwayInfo | null): void {
    this.currentHighwayInfo = info;
    this.isOnHighway = info ? info.isOnHighway : false;
  }

  // Guaranteed Orbital Insertion / Capture around a target body
  public performOrbitalCapture(targetBody: CelestialBody): void {
    this.timeWarp = 1.0;
    this.currentDominant = targetBody;

    // Cozy low orbit altitude (~35-65m above surface)
    const orbitAlt = Math.max(35.0, Math.min(65.0, targetBody.config.radius * 0.7));
    const r = targetBody.config.radius + orbitAlt;

    const toShip = this.position.clone().sub(targetBody.position);
    if (toShip.lengthSq() < 1.0) toShip.set(1, 0, 0);
    toShip.normalize();

    // Tangential orbital velocity vector around the world
    const planetAxis = new THREE.Vector3(0, 1, 0);
    let tangent = new THREE.Vector3().crossVectors(toShip, planetAxis).normalize();
    if (tangent.lengthSq() < 0.1) tangent.set(1, 0, 0);

    const vCirc = Math.sqrt((1.0 * targetBody.config.mass) / r);

    // Place cleanly on circular orbit trajectory
    this.position.copy(targetBody.position).addScaledVector(toShip, r);
    this.velocity.copy(targetBody.velocity).addScaledVector(tangent, vCirc);

    // Orient rocket forward (+Y) along orbital tangent
    const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
    this.quaternion.copy(targetQuat);
    this.angularVelocity.set(0, 0, 0);

    this.autopilotState = 'IDLE';
    this.flightStatus = 'ORBIT';
    this.throttle = 0.0;
    this.cruiseLocked = false;
    this.targetBodyId = null; // Destination achieved!

    if (this.onArrivedAtDestination) {
      this.onArrivedAtDestination(targetBody);
    }
  }

  public isAutoFlying(): boolean {
    return this.autoAscentState !== 'INACTIVE' || this.autopilotState !== 'IDLE' || this.autoLandingState !== 'IDLE';
  }

  // Start Autopilot Transfer to target planet (Can be called at ANY time!)
  public startAutopilotTransfer(): void {
    if (!this.targetBodyId) return;
    const targetBody = this.solarSystem.getBody(this.targetBodyId);
    if (!targetBody || targetBody.config.id === this.currentDominant.config.id) return;

    this.autopilotState = 'ALIGNING';
    this.autoAscentState = 'INACTIVE';
    this.autoLandingState = 'IDLE';
    this.flightStatus = 'FLYING';
    this.landedBody = null;
    this.throttle = 1.0;
    this.cruiseLocked = true;
  }

  public cancelAutopilot(): void {
    this.autopilotState = 'IDLE';
    this.timeWarp = 1.0;
    this.cruiseLocked = false;
  }

  // Start Auto-Landing sequence (Can be called in orbit!)
  public startAutoLanding(): void {
    this.autoLandingState = 'DEORBITING';
    this.autopilotState = 'IDLE';
    this.autoAscentState = 'INACTIVE';
    this.throttle = 0.8;
    this.cruiseLocked = true;
  }

  public cancelAutoLanding(): void {
    this.autoLandingState = 'IDLE';
    this.cruiseLocked = false;
  }

  // Main physics tick
  public update(realDt: number): void {
    // If on pad or landed, keep rocket attached to planet surface
    if (this.flightStatus === 'PAD' || this.flightStatus === 'LANDED') {
      if (this.landedBody) {
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
    const planetNormal = toPlanet.clone().negate().normalize();

    // 2. Automated Ascent Sequence (Option 1A)
    if (this.autoAscentState !== 'INACTIVE') {
      this.handleAutoAscent(dt, dominant, altitude, planetNormal);
    }

    // 3. Automated Interplanetary Transfer (Option 3A)
    if (this.autopilotState !== 'IDLE') {
      this.handleAutopilotTransfer(dt, dominant);
    }

    // 4. Automated Safe Landing (Option 3A)
    if (this.autoLandingState !== 'IDLE') {
      this.handleAutoLanding(dt, dominant, altitude, planetNormal);
    }

    // 5. Gravitational force
    const G = 1.0;
    const gravMag = (G * dominant.config.mass) / Math.max(surfaceRadius * surfaceRadius * 0.5, distToCenter * distToCenter);
    const gravForce = toPlanet.clone().normalize().multiplyScalar(gravMag);

    // 6. Thrust force
    const rocketForward = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion);
    const totalThrust = this.assembly.getActiveThrust() * this.throttle;
    const thrustAcc = rocketForward.clone().multiplyScalar(totalThrust / this.assembly.totalMass);

    // 7. Atmospheric Drag
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

    // 8. Integrate Velocity & Position
    this.velocity.addScaledVector(totalAcc, dt);
    this.position.addScaledVector(this.velocity, dt);

    // 9. Manual Highway Flight Assist & Automatic Destination Capture
    if (this.autoAscentState === 'INACTIVE' && this.autopilotState === 'IDLE' && this.autoLandingState === 'IDLE') {
      this.applyGuidance(dt, dominant);

      // Highway Heading Assist: If thrusting on highway and not actively steering, gently guide along highway
      if (this.isOnHighway && this.throttle > 0.05 && !this.isActivelySteering && this.guidanceMode === 'OFF') {
        if (this.currentHighwayInfo && this.currentHighwayInfo.highwayForward.lengthSq() > 0.1) {
          const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), this.currentHighwayInfo.highwayForward);
          this.quaternion.slerp(targetQuat, Math.min(1.0, 2.5 * dt));
        }
      }

      // Automatic Destination Capture: If manual flight reaches the target planet's arrival vicinity
      if (this.targetBodyId) {
        const targetBody = this.solarSystem.getBody(this.targetBodyId);
        if (targetBody && targetBody.config.id !== dominant.config.id) {
          const distToTarget = this.position.distanceTo(targetBody.position);
          const captureDist = targetBody.config.radius * 2.2;
          const distToArrival = this.currentHighwayInfo ? this.currentHighwayInfo.distToTargetArrival : Infinity;

          if (distToTarget <= captureDist || distToArrival <= 70.0) {
            this.performOrbitalCapture(targetBody);
          }
        }
      }
    }

    // 10. Surface collision detection & Kid-Friendly Bounce
    if (distToCenter <= surfaceRadius + 0.8) {
      const relativeVel = this.velocity.clone().sub(dominant.velocity);
      const impactSpeed = relativeVel.length();
      const verticalSpeed = relativeVel.dot(planetNormal);

      if (impactSpeed < 26.0 && verticalSpeed < 0) {
        // Safe Touchdown!
        this.flightStatus = 'LANDED';
        this.landedBody = dominant;
        this.throttle = 0.0;
        this.cruiseLocked = false;
        this.autoAscentState = 'INACTIVE';
        this.autopilotState = 'IDLE';
        this.autoLandingState = 'IDLE';
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
        const bounceVel = relativeVel.clone().reflect(planetNormal).multiplyScalar(0.5);
        this.velocity.copy(dominant.velocity).add(bounceVel);
        this.position.copy(dominant.position).addScaledVector(planetNormal, surfaceRadius + 2.0);

        this.particleEffects.emitTouchdownDust(this.position, planetNormal);
        if (this.onBounce) {
          this.onBounce();
        }
      }
    }
  }

  // Automatic Ascent into Hearthstone Parking Orbit (Option 1A)
  private handleAutoAscent(dt: number, dominant: CelestialBody, altitude: number, planetUp: THREE.Vector3): void {
    this.throttle = 1.0;
    this.cruiseLocked = true;

    // Tangent orbital vector (pointing East / orbit plane)
    const orbitTangent = new THREE.Vector3(1, 0, 0);

    if (this.autoAscentState === 'VERTICAL') {
      // Point straight up away from planet
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), planetUp);
      this.quaternion.slerp(targetQuat, Math.min(1.0, 5.0 * dt));

      if (altitude >= 45.0) {
        // Drop boosters if equipped
        if (this.assembly.hasBoosters && !this.assembly.boostersStaged && this.onAutoStage) {
          this.onAutoStage();
        }
        this.autoAscentState = 'GRAVITY_TURN';
      }
    } else if (this.autoAscentState === 'GRAVITY_TURN') {
      // Smoothly pitch from vertical into horizontal orbit tangent
      const progress = Math.min(1.0, (altitude - 45.0) / 60.0);
      const pitchDir = planetUp.clone().lerp(orbitTangent, Math.sin(progress * Math.PI * 0.5)).normalize();
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), pitchDir);
      this.quaternion.slerp(targetQuat, Math.min(1.0, 4.0 * dt));

      const relSpeed = this.velocity.clone().sub(dominant.velocity).length();
      if (altitude >= 105.0 && relSpeed >= 20.0) {
        this.autoAscentState = 'CIRCULARIZING';
      }
    } else if (this.autoAscentState === 'CIRCULARIZING') {
      // Lock into stable circular parking orbit (~50m above Hearthstone surface)
      const orbitAlt = 50.0;
      const r = dominant.config.radius + orbitAlt;
      const toShip = this.position.clone().sub(dominant.position).normalize();
      this.position.copy(dominant.position).addScaledVector(toShip, r);

      const vCirc = Math.sqrt((1.0 * dominant.config.mass) / r); // Circular velocity

      // Exact orbital tangent perpendicular to toShip
      const orbitPlaneNormal = new THREE.Vector3(0, 0, 1);
      let circTangent = new THREE.Vector3().crossVectors(toShip, orbitPlaneNormal).normalize();
      if (circTangent.lengthSq() < 0.1) {
        circTangent = new THREE.Vector3(1, 0, 0);
      }

      this.velocity.copy(dominant.velocity).addScaledVector(circTangent, vCirc);
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), circTangent);
      this.quaternion.copy(targetQuat);

      this.autoAscentState = 'INACTIVE';
      this.flightStatus = 'ORBIT';
      this.throttle = 0.0;
      this.cruiseLocked = false;

      if (this.onOrbitAchieved) {
        this.onOrbitAchieved();
      }
    }
  }

  // Automated Interplanetary Transfer (Option 3A: Speed-Governed Highway Cruise & Guaranteed Capture)
  private handleAutopilotTransfer(dt: number, dominant: CelestialBody): void {
    if (!this.targetBodyId) {
      this.cancelAutopilot();
      return;
    }
    const targetBody = this.solarSystem.getBody(this.targetBodyId);
    if (!targetBody || targetBody.config.id === this.currentDominant.config.id) {
      this.cancelAutopilot();
      return;
    }

    const distToTarget = this.position.distanceTo(targetBody.position);
    const targetArrivalPos = this.currentHighwayInfo ? this.currentHighwayInfo.targetArrival : targetBody.position;
    const distToArrival = this.position.distanceTo(targetArrivalPos);
    const captureRadius = targetBody.config.radius * 2.2;

    // Check if within capture distance of target world (guaranteed arrival!)
    if (distToTarget <= captureRadius || distToArrival <= 75.0) {
      this.performOrbitalCapture(targetBody);
      return;
    }

    // Determine heading direction: along golden highway forward or toward target arrival point
    let headingDir = this.currentHighwayInfo?.highwayForward;
    if (!headingDir || headingDir.lengthSq() < 0.1) {
      headingDir = targetArrivalPos.clone().sub(this.position).normalize();
    }

    // Relative speed in planetary system
    const relVel = this.velocity.clone().sub(this.currentDominant.velocity);
    const currentSpeed = relVel.length();

    // 2-Phase Speed Regulation:
    if (distToTarget > 350.0) {
      // 1. Interplanetary Cruise Phase
      // Point towards highway/target
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), headingDir);
      this.quaternion.slerp(targetQuat, Math.min(1.0, 5.0 * dt));

      const cruiseSpeed = 65.0; // safe governed speed (m/s)
      if (currentSpeed < cruiseSpeed - 5.0) {
        this.throttle = 1.0;
      } else if (currentSpeed > cruiseSpeed + 5.0) {
        this.throttle = 0.0;
      } else {
        this.throttle = 0.15; // sustain speed
      }

      // Smooth time warp during long-distance cruise
      if (this.timeWarp < 10.0) {
        this.timeWarp = Math.min(10.0, this.timeWarp + dt * 2.5);
      }
    } else {
      // 2. Approach & Deceleration Phase
      // Drop time warp immediately to 1.0!
      this.timeWarp = 1.0;

      // Target smooth approach speed ~ 22-26 m/s
      const approachSpeed = 24.0;
      if (currentSpeed > approachSpeed + 3.0) {
        // Turn retrograde to brake and shed excessive speed
        const retroDir = relVel.clone().normalize().negate();
        const retroQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), retroDir);
        this.quaternion.slerp(retroQuat, Math.min(1.0, 6.0 * dt));
        this.throttle = 0.85;
      } else {
        // Align smoothly with arrival tangent
        const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), headingDir);
        this.quaternion.slerp(targetQuat, Math.min(1.0, 5.0 * dt));
        this.throttle = 0.1;
      }
    }
  }

  // Automated Safe Landing
  private handleAutoLanding(dt: number, dominant: CelestialBody, altitude: number, planetUp: THREE.Vector3): void {
    const relVel = this.velocity.clone().sub(dominant.velocity);
    const retroDir = relVel.clone().normalize().negate();

    if (this.autoLandingState === 'DEORBITING') {
      // Point retrograde and burn to lower periapsis
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), retroDir);
      this.quaternion.slerp(targetQuat, Math.min(1.0, 5.0 * dt));
      this.throttle = 0.8;

      if (altitude <= 40.0) {
        this.autoLandingState = 'DESCENDING';
      }
    } else if (this.autoLandingState === 'DESCENDING') {
      // Point upright away from planet, brake descent speed to gentle < 8 m/s
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), planetUp);
      this.quaternion.slerp(targetQuat, Math.min(1.0, 5.0 * dt));

      const verticalSpeed = relVel.dot(planetUp); // Negative when descending
      if (verticalSpeed < -7.0) {
        this.throttle = 0.9; // Cushion descent
      } else {
        this.throttle = 0.2; // Float down softly
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

    // Orbit detection (strictly close to a planet/moon, excluding the Sun)
    const isSun = this.currentDominant.config.id === 'sun';
    const minOrbitAlt = 25.0;
    const maxOrbitAlt = Math.max(90.0, this.currentDominant.config.radius * 1.6);
    const inOrbitAltitude = altitude >= minOrbitAlt && altitude <= maxOrbitAlt;
    const isOrbitDynamics = speed >= 12.0 && speed <= 42.0 && Math.abs(verticalSpeed) < 8.0;

    const isOrbit = !isSun && (this.flightStatus === 'ORBIT' || (inOrbitAltitude && isOrbitDynamics));

    if (isOrbit && !this.orbitAnnounced && (this.flightStatus === 'FLYING' || this.flightStatus === 'ORBIT')) {
      this.orbitAnnounced = true;
      if (this.onOrbitAchieved) {
        this.onOrbitAchieved();
      }
    } else if (!isOrbit && altitude > maxOrbitAlt + 25.0) {
      this.orbitAnnounced = false;
    }

    return {
      status: this.flightStatus,
      altitude,
      speed,
      verticalSpeed,
      dominantBodyName: this.currentDominant.config.name,
      isOrbit,
      throttle: this.throttle,
      autoAscentState: this.autoAscentState,
      autopilotState: this.autopilotState,
      autoLandingState: this.autoLandingState,
      isOnHighway: this.isOnHighway
    };
  }
}
