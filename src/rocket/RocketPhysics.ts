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

  // Stable parking orbit tracking
  public orbitRelPos: THREE.Vector3 = new THREE.Vector3();
  public orbitOmega: number = 0;

  // Corridor Autopilot properties
  public transferStartPos: THREE.Vector3 = new THREE.Vector3();
  public transferProgress: number = 0.0;
  public transferTotalDist: number = 100.0;
  public autopilotCruiseSpeed: number = 65.0;

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

    if (this.flightStatus === 'ORBIT') {
      this.flightStatus = 'FLYING';
    }

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

    // Gentle auto-level: ensure rocket roll aligns nicely with planet horizon or solar ecliptic
    const desiredUp = this.currentDominant.config.id === 'sun'
      ? new THREE.Vector3(0, 1, 0)
      : this.position.clone().sub(this.currentDominant.position).normalize();
    const rocketForward = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion);

    // If rocket is not pointing straight up or straight down, level the roll
    if (Math.abs(rocketForward.dot(desiredUp)) < 0.92) {
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
    if (this.throttle > 0.05 && this.flightStatus === 'ORBIT') {
      this.flightStatus = 'FLYING';
    }
  }

  public setCruise(active: boolean): void {
    this.cruiseLocked = active;
    if (active) {
      this.throttle = 1.0;
      if (this.flightStatus === 'ORBIT') {
        this.flightStatus = 'FLYING';
      }
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

    // Cozy low orbit altitude (~15-50m above surface)
    const orbitAlt = Math.max(15.0, Math.min(50.0, targetBody.config.radius * 0.6));
    const r = targetBody.config.radius + orbitAlt;

    const toShip = this.position.clone().sub(targetBody.position);
    toShip.y = 0; // maintain planar orbit aligned with solar system
    if (toShip.lengthSq() < 1.0) toShip.set(1, 0, 0);
    toShip.normalize();

    this.orbitRelPos.copy(toShip).multiplyScalar(r);
    this.position.copy(targetBody.position).add(this.orbitRelPos);

    // Tangential orbital velocity vector around the world in equatorial plane
    const planetAxis = new THREE.Vector3(0, 1, 0);
    let tangent = new THREE.Vector3().crossVectors(toShip, planetAxis).normalize();
    if (tangent.lengthSq() < 0.1) tangent.set(0, 0, 1);

    const vCirc = Math.sqrt((1.0 * targetBody.config.mass) / r);
    this.orbitOmega = vCirc / r;

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
    if (!targetBody) return;

    // If already in parking orbit close to target world, don't re-transfer
    const distToTarget = this.position.distanceTo(targetBody.position);
    if (distToTarget <= targetBody.config.radius + 50.0 && this.flightStatus === 'ORBIT') {
      return;
    }

    this.autopilotState = 'TRANSFERRING';
    this.autoAscentState = 'INACTIVE';
    this.autoLandingState = 'IDLE';
    this.flightStatus = 'FLYING';
    this.landedBody = null;
    this.throttle = 1.0;
    this.cruiseLocked = true;
    this.timeWarp = 1.0;

    this.transferStartPos.copy(this.position);
    this.transferProgress = 0.0;
    this.transferTotalDist = Math.max(100.0, this.position.distanceTo(targetBody.position));
    this.autopilotCruiseSpeed = 65.0;
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

    // Stable Analytical Parking Orbit when coasting in orbit around a celestial body
    if (this.flightStatus === 'ORBIT' && this.throttle === 0 && this.autoAscentState === 'INACTIVE' && this.autopilotState === 'IDLE' && this.autoLandingState === 'IDLE') {
      if (this.orbitRelPos.lengthSq() > 1.0 && this.orbitOmega > 0) {
        const orbitNormal = new THREE.Vector3(0, 1, 0);
        this.orbitRelPos.applyAxisAngle(orbitNormal, this.orbitOmega * dt);
        this.position.copy(this.currentDominant.position).add(this.orbitRelPos);

        const toShip = this.orbitRelPos.clone().normalize();
        const tangent = new THREE.Vector3().crossVectors(toShip, orbitNormal).normalize();
        const r = this.orbitRelPos.length();
        const vCirc = Math.sqrt((1.0 * this.currentDominant.config.mass) / r);
        this.velocity.copy(this.currentDominant.velocity).addScaledVector(tangent, vCirc);

        const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
        this.quaternion.copy(targetQuat);
        this.angularVelocity.set(0, 0, 0);
        return;
      }
    }

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

    // 3. Automated Interplanetary Transfer (Guaranteed Highway Corridor Glide)
    if (this.autopilotState !== 'IDLE') {
      this.handleAutopilotTransfer(dt, dominant);
      return;
    }

    // 4. Automated Safe Landing (Option 3A)
    if (this.autoLandingState !== 'IDLE') {
      this.handleAutoLanding(dt, dominant, altitude, planetNormal);
    }

    // 5. Gentle Local Planet Gravity (Only within each planet's local bubble)
    let gravForce = new THREE.Vector3();
    const isSun = dominant.config.id === 'sun';
    const localGravityRadius = dominant.config.radius + 120.0;

    if (!isSun && distToCenter <= localGravityRadius) {
      // Gentle planetary gravity towards surface (e.g. 3.5 - 5.5 m/s^2)
      const gravMag = (1.0 * dominant.config.mass) / Math.max(surfaceRadius * surfaceRadius * 0.5, distToCenter * distToCenter);
      gravForce = toPlanet.clone().normalize().multiplyScalar(Math.min(5.5, gravMag));
    } else if (isSun && distToCenter <= 180.0) {
      // Near Sun corona
      gravForce = toPlanet.clone().normalize().multiplyScalar(5.0);
    }
    // In deep space between planets: gravForce is ZERO! No vacuum drag!

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

    // Arcade Speed Governor: Prevent runaway speeds during manual flight (max ~55 m/s)
    const currentSpeed = this.velocity.length();
    const maxSpeed = 55.0;
    if (currentSpeed > maxSpeed) {
      this.velocity.multiplyScalar(Math.max(maxSpeed / currentSpeed, 1.0 - 1.5 * dt));
    }

    this.position.addScaledVector(this.velocity, dt);

    // 9. Manual Highway Flight Assist & Automatic Destination Capture
    if (this.autoAscentState === 'INACTIVE' && this.autopilotState === 'IDLE' && this.autoLandingState === 'IDLE') {
      this.applyGuidance(dt, dominant);

      // Highway Heading Assist: If thrusting on highway and not actively steering, gently guide along highway
      if (this.isOnHighway && this.throttle > 0.05 && !this.isActivelySteering && this.guidanceMode === 'OFF') {
        if (this.currentHighwayInfo && this.currentHighwayInfo.highwayForward.lengthSq() > 0.1) {
          const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), this.currentHighwayInfo.highwayForward);
          this.quaternion.slerp(targetQuat, Math.min(1.0, 3.5 * dt));
        }
      }

      // Automatic Destination Capture: If manual flight reaches the target planet's vicinity
      if (this.targetBodyId) {
        const targetBody = this.solarSystem.getBody(this.targetBodyId);
        if (targetBody) {
          const distToTarget = this.position.distanceTo(targetBody.position);
          const captureDist = Math.max(80.0, targetBody.config.radius + 50.0);
          const distToArrival = this.currentHighwayInfo ? this.currentHighwayInfo.distToTargetArrival : Infinity;

          if (distToTarget <= captureDist || distToArrival <= 80.0) {
            this.performOrbitalCapture(targetBody);
          }
        }
      }

      // Cosmic Boundary Bumper: Prevent drifting outside the solar system!
      const distFromSun = this.position.length();
      if (distFromSun > 2200.0) {
        // Gently turn back towards the sun and inner planets
        const inwardDir = this.position.clone().negate().normalize();
        this.velocity.reflect(inwardDir).multiplyScalar(0.7);
        const turnQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), inwardDir);
        this.quaternion.slerp(turnQuat, Math.min(1.0, 5.0 * dt));
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
      // Lock into stable circular parking orbit (~40m above Hearthstone surface)
      const orbitAlt = 40.0;
      const r = dominant.config.radius + orbitAlt;
      const toShip = this.position.clone().sub(dominant.position);
      toShip.y = 0; // align with X-Z solar system plane
      if (toShip.lengthSq() < 1.0) toShip.set(1, 0, 0);
      toShip.normalize();

      this.orbitRelPos.copy(toShip).multiplyScalar(r);
      this.position.copy(dominant.position).add(this.orbitRelPos);

      const vCirc = Math.sqrt((1.0 * dominant.config.mass) / r); // Circular velocity
      this.orbitOmega = vCirc / r;

      // Exact orbital tangent perpendicular to toShip in X-Z plane
      const orbitPlaneNormal = new THREE.Vector3(0, 1, 0);
      let circTangent = new THREE.Vector3().crossVectors(toShip, orbitPlaneNormal).normalize();
      if (circTangent.lengthSq() < 0.1) {
        circTangent = new THREE.Vector3(0, 0, 1);
      }

      this.velocity.copy(dominant.velocity).addScaledVector(circTangent, vCirc);
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), circTangent);
      this.quaternion.copy(targetQuat);
      this.angularVelocity.set(0, 0, 0);

      this.autoAscentState = 'INACTIVE';
      this.flightStatus = 'ORBIT';
      this.throttle = 0.0;
      this.cruiseLocked = false;

      if (this.onOrbitAchieved) {
        this.onOrbitAchieved();
      }
    }
  }

  // Automated Interplanetary Transfer (Guaranteed Highway Corridor Glide)
  private handleAutopilotTransfer(dt: number, dominant: CelestialBody): void {
    if (!this.targetBodyId) {
      this.cancelAutopilot();
      return;
    }
    const targetBody = this.solarSystem.getBody(this.targetBodyId);
    if (!targetBody) {
      this.cancelAutopilot();
      return;
    }

    const distToTarget = this.position.distanceTo(targetBody.position);
    const captureRadius = Math.max(80.0, targetBody.config.radius + 50.0);

    // If close enough or reached end of spline progress, guaranteed capture into parking orbit
    if (distToTarget <= captureRadius || this.transferProgress >= 0.99) {
      this.performOrbitalCapture(targetBody);
      return;
    }

    // Advance progress smoothly along highway corridor
    this.transferProgress = Math.min(1.0, this.transferProgress + (this.autopilotCruiseSpeed * dt) / Math.max(100.0, this.transferTotalDist));

    // Dynamic arrival position matching lead position & parking orbit altitude
    const toShip = this.transferStartPos.clone().sub(targetBody.position);
    toShip.y = 0;
    if (toShip.lengthSq() < 1) toShip.set(1, 0, 0);
    toShip.normalize();
    const targetArrival = targetBody.position.clone().addScaledVector(toShip, targetBody.config.radius + 40.0);

    // Quadratic Bezier curve control point bowed away from the Sun
    const mid = this.transferStartPos.clone().add(targetArrival).multiplyScalar(0.5);
    let bowDir = mid.clone().sub(new THREE.Vector3(0, 0, 0));
    bowDir.y = 0;
    if (bowDir.lengthSq() < 1) bowDir.set(0, 0, 1);
    bowDir.normalize();
    const arcHeight = Math.min(220, this.transferStartPos.distanceTo(targetArrival) * 0.22);
    const controlPoint = mid.addScaledVector(bowDir, arcHeight);

    const t = this.transferProgress;
    const nextPos = new THREE.Vector3()
      .addScaledVector(this.transferStartPos, (1 - t) * (1 - t))
      .addScaledVector(controlPoint, 2 * (1 - t) * t)
      .addScaledVector(targetArrival, t * t);

    // Calculate forward tangent along curve for rocket attitude orientation
    const p1MinusP0 = controlPoint.clone().sub(this.transferStartPos);
    const p2MinusP1 = targetArrival.clone().sub(controlPoint);
    let curveForward = new THREE.Vector3()
      .addScaledVector(p1MinusP0, 2 * (1 - t))
      .addScaledVector(p2MinusP1, 2 * t)
      .normalize();

    if (curveForward.lengthSq() < 0.1 || t > 0.95) {
      curveForward = targetArrival.clone().sub(this.position).normalize();
    }

    this.position.copy(nextPos);
    this.velocity.copy(curveForward).multiplyScalar(this.autopilotCruiseSpeed);

    // Smoothly slerp rocket attitude to face curve forward
    const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), curveForward);
    this.quaternion.slerp(targetQuat, Math.min(1.0, 8.0 * dt));
    this.angularVelocity.set(0, 0, 0);

    // Sparkle VFX while riding the highway
    this.particleEffects.emitHighwaySparkles(this.position);

    // Dynamic Time-Warp for Kid-Pacing:
    // Cruise fast across the void, slow down smoothly as we approach arrival
    if (t > 0.15 && t < 0.85) {
      this.timeWarp = Math.min(6.0, this.timeWarp + dt * 2.5);
      this.throttle = 1.0;
    } else {
      this.timeWarp = Math.max(1.0, this.timeWarp - dt * 4.0);
      this.throttle = 0.5;
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
    const minOrbitAlt = 10.0;
    const maxOrbitAlt = Math.max(70.0, this.currentDominant.config.radius * 1.6);
    const inOrbitAltitude = altitude >= minOrbitAlt && altitude <= maxOrbitAlt;
    const isOrbitDynamics = speed >= 10.0 && speed <= 45.0 && Math.abs(verticalSpeed) < 8.0;

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
