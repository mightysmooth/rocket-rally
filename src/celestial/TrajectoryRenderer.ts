// TrajectoryRenderer.ts - Real-Time 3D Orbital Trajectory Ribbon and Orbit Predictions
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

  constructor(scene: THREE.Scene, solarSystem: SolarSystem) {
    this.scene = scene;
    this.solarSystem = solarSystem;

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

    // Time step per point (longer step farther away)
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

      // Integrate velocity and position (Symplectic Euler / Verlet)
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
      // Change trajectory line color to celebratory golden/cyan
      this.lineMat.color.setHex(0xffd166);
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

  public setVisible(visible: boolean): void {
    this.lineMesh.visible = visible;
    if (!visible) {
      this.apMarker.visible = false;
      this.peMarker.visible = false;
    }
  }
}
