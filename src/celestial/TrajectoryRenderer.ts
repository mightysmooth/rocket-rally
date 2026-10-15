// TrajectoryRenderer.ts - Real-Time 3D Orbital Trajectory Ribbon and Highway Guidance
import * as THREE from 'three';
import { SolarSystem } from './SolarSystem';
import { CelestialBody } from './CelestialBody';

export interface TrajectoryInfo {
  isClosedOrbit: boolean;
  apoapsisAltitude: number;
  periapsisAltitude: number;
  dominantBody: CelestialBody;
  encounterBody: CelestialBody | null;
  encounterDist: number;
}

export interface HighwayInfo {
  isOnHighway: boolean;
  distToHighway: number;
  highwayForward: THREE.Vector3;
  targetArrival: THREE.Vector3;
  distToTargetArrival: number;
  distToTargetBody: number;
  targetBody: CelestialBody;
}

export class TrajectoryRenderer {
  private scene: THREE.Scene;
  private solarSystem: SolarSystem;
  private lineMesh: THREE.Line;
  private lineGeom: THREE.BufferGeometry;
  private lineMat: THREE.LineBasicMaterial;

  // Markers for Apoapsis (Ap) and Periapsis (Pe)
  private apMarker: THREE.Mesh;
  private peMarker: THREE.Mesh;

  private readonly maxPoints = 400;
  private positions: Float32Array;

  // Flight Highway Guidance Ribbon
  private highwayLine: THREE.Line;
  private highwayGeom: THREE.BufferGeometry;
  private highwayPositions: Float32Array;
  private readonly highwayPointCount = 80;

  // Animated highway chevron / beacon points
  private highwayBeacons: THREE.Points;
  private beaconGeom: THREE.BufferGeometry;
  private beaconPositions: Float32Array;
  private readonly beaconCount = 12;
  private highwayAnimTime: number = 0;

  constructor(scene: THREE.Scene, solarSystem: SolarSystem) {
    this.scene = scene;
    this.solarSystem = solarSystem;

    // 1. Orbital Trajectory Line
    this.positions = new Float32Array(this.maxPoints * 3);
    this.lineGeom = new THREE.BufferGeometry();
    this.lineGeom.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    this.lineMat = new THREE.LineBasicMaterial({
      color: 0x4cc9f0,
      linewidth: 3,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });

    this.lineMesh = new THREE.Line(this.lineGeom, this.lineMat);
    this.lineMesh.frustumCulled = false;
    this.scene.add(this.lineMesh);

    // Ap / Pe visual marker dots
    const markerGeom = new THREE.SphereGeometry(2.5, 12, 12);
    this.apMarker = new THREE.Mesh(markerGeom, new THREE.MeshBasicMaterial({ color: 0xffd166 }));
    this.peMarker = new THREE.Mesh(markerGeom, new THREE.MeshBasicMaterial({ color: 0x52ffd5 }));
    this.apMarker.visible = false;
    this.peMarker.visible = false;
    this.scene.add(this.apMarker);
    this.scene.add(this.peMarker);

    // 2. Flight Highway Guidance Ribbon (Golden glowing path)
    this.highwayPositions = new Float32Array(this.highwayPointCount * 3);
    this.highwayGeom = new THREE.BufferGeometry();
    this.highwayGeom.setAttribute('position', new THREE.BufferAttribute(this.highwayPositions, 3));

    const highwayMat = new THREE.LineBasicMaterial({
      color: 0xffd166,
      linewidth: 4,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });
    this.highwayLine = new THREE.Line(this.highwayGeom, highwayMat);
    this.highwayLine.visible = false;
    this.highwayLine.frustumCulled = false;
    this.scene.add(this.highwayLine);

    // 3. Pulsing highway beacons
    this.beaconPositions = new Float32Array(this.beaconCount * 3);
    this.beaconGeom = new THREE.BufferGeometry();
    this.beaconGeom.setAttribute('position', new THREE.BufferAttribute(this.beaconPositions, 3));

    const beaconMat = new THREE.PointsMaterial({
      color: 0xffe6a7,
      size: 16,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.highwayBeacons = new THREE.Points(this.beaconGeom, beaconMat);
    this.highwayBeacons.visible = false;
    this.highwayBeacons.frustumCulled = false;
    this.scene.add(this.highwayBeacons);
  }

  public highwayEnabled: boolean = true;

  // Update golden Flight Highway connecting current position to target planet
  public updateHighway(currentPos: THREE.Vector3, targetBodyId: string | null, dt: number): HighwayInfo | null {
    if (!targetBodyId || !this.highwayEnabled) {
      this.highwayLine.visible = false;
      this.highwayBeacons.visible = false;
      return null;
    }

    const targetBody = this.solarSystem.getBody(targetBodyId);
    if (!targetBody) {
      this.highwayLine.visible = false;
      this.highwayBeacons.visible = false;
      return null;
    }

    this.highwayLine.visible = true;
    this.highwayBeacons.visible = true;
    this.highwayAnimTime += dt * 0.45;

    // Start point: current ship position
    const start = currentPos.clone();
    // End point: target planet position + orbital tangent arrival point
    const toShip = start.clone().sub(targetBody.position);
    const arrivalTangent = new THREE.Vector3().crossVectors(toShip, new THREE.Vector3(0, 1, 0)).normalize();
    if (arrivalTangent.lengthSq() < 0.1) arrivalTangent.set(1, 0, 0);

    const targetArrival = targetBody.position.clone().addScaledVector(arrivalTangent, targetBody.config.radius + 45);

    // Natural curved arc bowing outward in space
    const mid = start.clone().add(targetArrival).multiplyScalar(0.5);
    const sunPos = new THREE.Vector3(0, 0, 0);
    const bowDir = mid.clone().sub(sunPos).normalize();
    const arcHeight = Math.min(250, start.distanceTo(targetArrival) * 0.25);
    const controlPoint = mid.addScaledVector(bowDir, arcHeight);

    let minDist = Infinity;

    // Cubic Bezier curve points
    for (let i = 0; i < this.highwayPointCount; i++) {
      const t = i / (this.highwayPointCount - 1);
      // Quadratic Bezier interpolation
      const pt = new THREE.Vector3()
        .addScaledVector(start, (1 - t) * (1 - t))
        .addScaledVector(controlPoint, 2 * (1 - t) * t)
        .addScaledVector(targetArrival, t * t);

      this.highwayPositions[i * 3] = pt.x;
      this.highwayPositions[i * 3 + 1] = pt.y;
      this.highwayPositions[i * 3 + 2] = pt.z;

      const d = currentPos.distanceTo(pt);
      if (d < minDist) {
        minDist = d;
      }
    }
    this.highwayGeom.attributes.position.needsUpdate = true;

    // Animate beacon points gliding along highway toward target
    for (let b = 0; b < this.beaconCount; b++) {
      const beaconT = ((this.highwayAnimTime + b / this.beaconCount) % 1.0);
      const bPos = new THREE.Vector3()
        .addScaledVector(start, (1 - beaconT) * (1 - beaconT))
        .addScaledVector(controlPoint, 2 * (1 - beaconT) * beaconT)
        .addScaledVector(targetArrival, beaconT * beaconT);

      this.beaconPositions[b * 3] = bPos.x;
      this.beaconPositions[b * 3 + 1] = bPos.y;
      this.beaconPositions[b * 3 + 2] = bPos.z;
    }
    this.beaconGeom.attributes.position.needsUpdate = true;

    // Direction along highway from start toward controlPoint/targetArrival
    let highwayForward = controlPoint.clone().sub(start).normalize();
    if (highwayForward.lengthSq() < 0.1 || start.distanceTo(controlPoint) < 5.0) {
      highwayForward = targetArrival.clone().sub(start).normalize();
    }

    const distToTargetArrival = currentPos.distanceTo(targetArrival);
    const distToTargetBody = currentPos.distanceTo(targetBody.position);
    const isOnHighway = minDist < 55.0;

    return {
      isOnHighway,
      distToHighway: minDist,
      highwayForward,
      targetArrival,
      distToTargetArrival,
      distToTargetBody,
      targetBody
    };
  }

  // Predict future flight path using numerical forward integration
  public calculateTrajectory(
    currentPos: THREE.Vector3,
    currentVel: THREE.Vector3,
    targetBodyId: string | null
  ): TrajectoryInfo {
    const simPos = currentPos.clone();
    const simVel = currentVel.clone();
    const { body: dominant } = this.solarSystem.getDominantBody(simPos);

    let maxDist = -Infinity;
    let minDist = Infinity;
    let apPos = new THREE.Vector3();
    let pePos = new THREE.Vector3();

    let encounterBody: CelestialBody | null = null;
    let encounterDist = Infinity;
    const targetBody = targetBodyId ? this.solarSystem.getBody(targetBodyId) : null;

    const dt = 1.2;
    let hitPlanet = false;
    let validPointsCount = this.maxPoints;

    for (let i = 0; i < this.maxPoints; i++) {
      this.positions[i * 3] = simPos.x;
      this.positions[i * 3 + 1] = simPos.y;
      this.positions[i * 3 + 2] = simPos.z;

      // Gravitational acceleration from dominant body
      const toBody = dominant.position.clone().sub(simPos);
      const dist = toBody.length();

      // Check collision with surface
      if (dist <= dominant.config.radius) {
        hitPlanet = true;
        validPointsCount = i + 1;
        break;
      }

      // Altitude relative to surface
      const alt = dist - dominant.config.radius;
      if (dist > maxDist) {
        maxDist = dist;
        apPos.copy(simPos);
      }
      if (dist < minDist) {
        minDist = dist;
        pePos.copy(simPos);
      }

      // Check intercept with target planet if specified
      if (targetBody && targetBody.config.id !== dominant.config.id) {
        const toTarget = simPos.distanceTo(targetBody.position);
        if (toTarget < encounterDist) {
          encounterDist = toTarget;
          if (toTarget < targetBody.config.radius * 3.5) {
            encounterBody = targetBody;
          }
        }
      }

      // Gravity force F = G * M / r^2
      const G = 1.0;
      const gravMag = (G * dominant.config.mass) / (dist * dist);
      const gravAcc = toBody.normalize().multiplyScalar(gravMag);

      // Integrate velocity and position
      simVel.addScaledVector(gravAcc, dt);
      simPos.addScaledVector(simVel, dt);
    }

    this.lineGeom.setDrawRange(0, validPointsCount);
    this.lineGeom.attributes.position.needsUpdate = true;

    // Evaluate orbit parameters
    const apAlt = Math.max(0, maxDist - dominant.config.radius);
    const peAlt = Math.max(0, minDist - dominant.config.radius);
    const isClosedOrbit = !hitPlanet && peAlt > (dominant.config.atmosphereRadius ? (dominant.config.atmosphereRadius - dominant.config.radius) : 10);

    // Update Ap & Pe markers
    if (isClosedOrbit) {
      this.apMarker.position.copy(apPos);
      this.peMarker.position.copy(pePos);
      this.apMarker.visible = true;
      this.peMarker.visible = true;
      this.lineMat.color.setHex(0x52ffd5);
    } else {
      this.apMarker.visible = false;
      this.peMarker.visible = false;
      this.lineMat.color.setHex(0x4cc9f0);
    }

    return {
      isClosedOrbit,
      apoapsisAltitude: apAlt,
      periapsisAltitude: peAlt,
      dominantBody: dominant,
      encounterBody,
      encounterDist
    };
  }

  public toggleHighway(): boolean {
    this.highwayEnabled = !this.highwayEnabled;
    if (!this.highwayEnabled) {
      this.highwayLine.visible = false;
      this.highwayBeacons.visible = false;
    }
    return this.highwayEnabled;
  }

  public setHighwayVisible(visible: boolean): void {
    this.highwayEnabled = visible;
    if (!visible) {
      this.highwayLine.visible = false;
      this.highwayBeacons.visible = false;
    }
  }

  public setVisible(visible: boolean): void {
    this.lineMesh.visible = visible;
    if (!visible) {
      this.apMarker.visible = false;
      this.peMarker.visible = false;
      this.highwayLine.visible = false;
      this.highwayBeacons.visible = false;
    }
  }
}
