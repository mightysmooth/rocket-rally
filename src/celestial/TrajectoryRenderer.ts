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

    // 1. Moving Target Lead Intercept Calculation:
    // Lead target planet based on estimated flight arrival time
    const distToTarget = currentPos.distanceTo(targetBody.position);
    const leadTime = Math.min(30.0, distToTarget / 70.0);
    const targetLeadPos = targetBody.position.clone().addScaledVector(targetBody.velocity, leadTime);

    // End point: target planet position + orbital tangent arrival point
    const toShip = start.clone().sub(targetLeadPos);
    toShip.y = 0; // planar solar system orbit
    if (toShip.lengthSq() < 1.0) toShip.set(1, 0, 0);
    toShip.normalize();

    const arrivalTangent = new THREE.Vector3().crossVectors(toShip, new THREE.Vector3(0, 1, 0)).normalize();
    if (arrivalTangent.lengthSq() < 0.1) arrivalTangent.set(1, 0, 0);

    const targetArrival = targetLeadPos.clone().addScaledVector(toShip, targetBody.config.radius + 45.0);

    // Natural curved arc bowing outward in space
    const mid = start.clone().add(targetArrival).multiplyScalar(0.5);
    const sunPos = new THREE.Vector3(0, 0, 0);
    let bowDir = mid.clone().sub(sunPos);
    bowDir.y = 0;
    if (bowDir.lengthSq() < 1.0) bowDir.set(0, 0, 1);
    bowDir.normalize();

    const arcHeight = Math.min(220, start.distanceTo(targetArrival) * 0.22);
    const controlPoint = mid.addScaledVector(bowDir, arcHeight);

    let minDist = Infinity;
    let closestT = 0;

    // Quadratic Bezier curve points
    for (let i = 0; i < this.highwayPointCount; i++) {
      const t = i / (this.highwayPointCount - 1);
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
        closestT = t;
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

    // Exact forward tangent derivative along Quadratic Bezier: B'(t) = 2(1-t)(P1-P0) + 2t(P2-P1)
    const p1MinusP0 = controlPoint.clone().sub(start);
    const p2MinusP1 = targetArrival.clone().sub(controlPoint);
    let highwayForward = new THREE.Vector3()
      .addScaledVector(p1MinusP0, 2 * (1 - closestT))
      .addScaledVector(p2MinusP1, 2 * closestT)
      .normalize();

    if (highwayForward.lengthSq() < 0.1 || closestT > 0.92) {
      highwayForward = arrivalTangent.clone();
    }

    const distToTargetArrival = currentPos.distanceTo(targetArrival);
    const distToTargetBody = currentPos.distanceTo(targetBody.position);
    const isOnHighway = minDist < 60.0;

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
    const { body: dominant } = this.solarSystem.getDominantBody(currentPos);
    const isInterplanetary = dominant.config.id === 'sun';

    // Integrate in dominant body reference frame when in planet/moon orbit
    const simPosRel = isInterplanetary ? currentPos.clone() : currentPos.clone().sub(dominant.position);
    const simVelRel = isInterplanetary ? currentVel.clone() : currentVel.clone().sub(dominant.velocity);

    let maxDist = -Infinity;
    let minDist = Infinity;
    let apPos = new THREE.Vector3();
    let pePos = new THREE.Vector3();

    let encounterBody: CelestialBody | null = null;
    let encounterDist = Infinity;
    const targetBody = targetBodyId ? this.solarSystem.getBody(targetBodyId) : null;

    const dt = 1.0;
    let hitPlanet = false;
    let validPointsCount = this.maxPoints;

    for (let i = 0; i < this.maxPoints; i++) {
      // Map to world coordinates for visual ribbon rendering
      const worldPos = isInterplanetary ? simPosRel : dominant.position.clone().add(simPosRel);
      this.positions[i * 3] = worldPos.x;
      this.positions[i * 3 + 1] = worldPos.y;
      this.positions[i * 3 + 2] = worldPos.z;

      const dist = simPosRel.length();

      // Check collision with surface
      if (dist <= dominant.config.radius) {
        hitPlanet = true;
        validPointsCount = i + 1;
        break;
      }

      if (dist > maxDist) {
        maxDist = dist;
        apPos.copy(worldPos);
      }
      if (dist < minDist) {
        minDist = dist;
        pePos.copy(worldPos);
      }

      // Check intercept with target planet if specified
      if (targetBody && targetBody.config.id !== dominant.config.id) {
        const toTarget = worldPos.distanceTo(targetBody.position);
        if (toTarget < encounterDist) {
          encounterDist = toTarget;
          if (toTarget < Math.max(90.0, targetBody.config.radius * 2.5)) {
            encounterBody = targetBody;
          }
        }
      }

      // Gravity force F = G * M / r^2
      const G = 1.0;
      const gravMag = (G * dominant.config.mass) / Math.max(dominant.config.radius * dominant.config.radius * 0.5, dist * dist);
      const gravAcc = simPosRel.clone().negate().normalize().multiplyScalar(gravMag);

      // Integrate velocity and position
      simVelRel.addScaledVector(gravAcc, dt);
      simPosRel.addScaledVector(simVelRel, dt);
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
