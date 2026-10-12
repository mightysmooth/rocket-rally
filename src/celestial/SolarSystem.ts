// SolarSystem.ts - Outer Wilds Stylized Miniature Solar System
import * as THREE from 'three';
import { CelestialBody } from './CelestialBody';
import { ProceduralTextures } from '../utils/ProceduralTextures';

export class SolarSystem {
  public scene: THREE.Scene;
  public bodies: Map<string, CelestialBody> = new Map();
  public sunLight: THREE.PointLight;
  public ambientLight: THREE.AmbientLight;
  public starfield: THREE.Points;
  public cometTailParticles: THREE.Points;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Cozy warm lighting
    this.ambientLight = new THREE.AmbientLight(0x28324a, 1.2);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.PointLight(0xfff4d6, 3.2, 8000, 0.4);
    this.sunLight.castShadow = true;
    this.scene.add(this.sunLight);

    // Create celestial bodies
    this.createBodies();

    // Create starfield & deep space atmosphere
    this.starfield = this.createStarfield();
    this.scene.add(this.starfield);

    // Comet particle tail
    this.cometTailParticles = this.createCometTail();
    this.scene.add(this.cometTailParticles);
  }

  private createBodies(): void {
    // 1. Sun (Sol / Hearthfire)
    const sun = new CelestialBody({
      id: 'sun',
      name: 'The Sun',
      emoji: '☀️',
      radius: 130,
      mass: 1200000,
      color: 0xffb703,
      orbitRadius: 0,
      orbitSpeed: 0
    });
    this.addBody(sun);

    // 2. Hearthstone (Home Planet)
    const hearthstone = new CelestialBody({
      id: 'hearthstone',
      name: 'Hearthstone',
      emoji: '🌍',
      radius: 65,
      mass: 55000,
      color: 0x3a7d44,
      orbitRadius: 650,
      orbitSpeed: 0.035,
      hasAtmosphere: true,
      atmosphereRadius: 105,
      atmosphereColor: 0x4cc9f0,
      rotationSpeed: 0.04,
      texture: ProceduralTextures.createHearthstoneTexture()
    });
    this.addBody(hearthstone);

    // 3. Cheesy Moon (Mun)
    const moon = new CelestialBody({
      id: 'moon',
      name: 'Cheesy Moon',
      emoji: '🧀',
      radius: 22,
      mass: 4500,
      color: 0xe8d8b8,
      orbitRadius: 140,
      orbitSpeed: 0.12,
      orbitParentId: 'hearthstone',
      hasAtmosphere: false,
      rotationSpeed: 0.02,
      texture: ProceduralTextures.createMoonTexture()
    });
    this.addBody(moon);

    // 4. Red Mesa (Mars-like canyon world)
    const redMesa = new CelestialBody({
      id: 'red_mesa',
      name: 'Red Mesa',
      emoji: '🏜️',
      radius: 46,
      mass: 32000,
      color: 0xbf432b,
      orbitRadius: 1100,
      orbitSpeed: 0.022,
      hasAtmosphere: true,
      atmosphereRadius: 68,
      atmosphereColor: 0xe76f51,
      rotationSpeed: 0.03,
      texture: ProceduralTextures.createRedMesaTexture()
    });
    this.addBody(redMesa);

    // 5. Gigantus (Saturn-like Gas Giant)
    const gigantus = new CelestialBody({
      id: 'gigantus',
      name: 'Gigantus',
      emoji: '🪐',
      radius: 125,
      mass: 380000,
      color: 0xedd1a6,
      orbitRadius: 1900,
      orbitSpeed: 0.012,
      hasAtmosphere: true,
      atmosphereRadius: 165,
      atmosphereColor: 0x58b4b7,
      rotationSpeed: 0.06,
      texture: ProceduralTextures.createGasGiantTexture(),
      hasRings: true,
      ringsInnerRadius: 160,
      ringsOuterRadius: 310,
      ringsTexture: ProceduralTextures.createRingsTexture()
    });
    this.addBody(gigantus);

    // 6. Frostmoon (Icy moon orbiting Gigantus)
    const frostmoon = new CelestialBody({
      id: 'frostmoon',
      name: 'Frostmoon',
      emoji: '❄️',
      radius: 24,
      mass: 6500,
      color: 0xd0f0fd,
      orbitRadius: 240,
      orbitSpeed: 0.075,
      orbitParentId: 'gigantus',
      hasAtmosphere: false,
      rotationSpeed: 0.03,
      texture: ProceduralTextures.createFrostmoonTexture()
    });
    this.addBody(frostmoon);

    // 7. Wild Comet (Eccentric nomad)
    const comet = new CelestialBody({
      id: 'comet',
      name: 'Wild Comet',
      emoji: '☄️',
      radius: 14,
      mass: 1800,
      color: 0xa8dadc,
      orbitRadius: 1450,
      orbitSpeed: 0.045,
      hasAtmosphere: true,
      atmosphereRadius: 32,
      atmosphereColor: 0x48cae4
    });
    this.addBody(comet);

    // Create Orbit visualization circles for each celestial body
    this.createOrbitLines();
  }

  private addBody(body: CelestialBody): void {
    this.bodies.set(body.config.id, body);
    this.scene.add(body.group);
  }

  // Draw delicate, glowing orbit tracks in space
  private createOrbitLines(): void {
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x5c7099,
      transparent: true,
      opacity: 0.35,
      depthWrite: false
    });

    this.bodies.forEach(body => {
      if (body.config.orbitRadius <= 0) return;

      const points: THREE.Vector3[] = [];
      const segments = 120;
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(
          Math.cos(theta) * body.config.orbitRadius,
          0,
          Math.sin(theta) * body.config.orbitRadius
        ));
      }

      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.LineLoop(geom, lineMat);

      // If orbiting a parent planet (like Moon -> Hearthstone), attach to parent!
      if (body.config.orbitParentId) {
        const parent = this.bodies.get(body.config.orbitParentId);
        if (parent) {
          parent.group.add(line);
        }
      } else {
        this.scene.add(line);
      }
      body.orbitLine = line;
    });
  }

  // Twinkling stars in deep space
  private createStarfield(): THREE.Points {
    const starCount = 2800;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      // Uniform distribution on giant sphere
      const r = 5000 + Math.random() * 2000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      // Warm star color variation (Outer Wilds golds, ambers, icy blues)
      const colorType = Math.random();
      if (colorType > 0.6) {
        // Gold / Amber star
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.85;
        colors[i * 3 + 2] = 0.5;
      } else if (colorType > 0.3) {
        // Icy cyan star
        colors[i * 3] = 0.6;
        colors[i * 3 + 1] = 0.85;
        colors[i * 3 + 2] = 1.0;
      } else {
        // Pure crisp white
        colors[i * 3] = 0.95;
        colors[i * 3 + 1] = 0.95;
        colors[i * 3 + 2] = 0.95;
      }
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 14,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: false
    });

    return new THREE.Points(geom, mat);
  }

  // Sparkling dust tail for the Wild Comet
  private createCometTail(): THREE.Points {
    const tailCount = 180;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(tailCount * 3);
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x48cae4,
      size: 18,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    return new THREE.Points(geom, mat);
  }

  public getBody(id: string): CelestialBody | undefined {
    return this.bodies.get(id);
  }

  public getHearthstone(): CelestialBody {
    return this.bodies.get('hearthstone')!;
  }

  // Update all planet orbits and positions
  public update(dt: number): void {
    // First update bodies orbiting the Sun
    this.bodies.forEach(body => {
      if (!body.config.orbitParentId) {
        body.update(dt, new THREE.Vector3(0, 0, 0));
      }
    });

    // Then update moons orbiting parent planets
    this.bodies.forEach(body => {
      if (body.config.orbitParentId) {
        const parent = this.bodies.get(body.config.orbitParentId);
        if (parent) {
          body.update(dt, parent.position);
        }
      }
    });

    // Update comet tail
    const comet = this.bodies.get('comet');
    if (comet && this.cometTailParticles) {
      const positions = this.cometTailParticles.geometry.attributes.position.array as Float32Array;
      const tailCount = positions.length / 3;
      // Tail points away from Sun (0, 0, 0)
      const sunDir = comet.position.clone().normalize();

      for (let i = 0; i < tailCount; i++) {
        const dist = (i / tailCount) * 180;
        const spread = (i / tailCount) * 18;
        positions[i * 3] = comet.position.x + sunDir.x * dist + (Math.sin(i * 1.5) * spread);
        positions[i * 3 + 1] = comet.position.y + sunDir.y * dist + (Math.cos(i * 1.7) * spread);
        positions[i * 3 + 2] = comet.position.z + sunDir.z * dist + (Math.sin(i * 2.1) * spread);
      }
      this.cometTailParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  // Find the primary gravitational body affecting a given point in space
  public getDominantBody(pos: THREE.Vector3): { body: CelestialBody; dist: number } {
    let dominant: CelestialBody = this.getHearthstone();
    let maxGravitationalForce = 0;
    let minBodyDist = Infinity;

    this.bodies.forEach(body => {
      const dist = pos.distanceTo(body.position);
      const effDist = Math.max(body.config.radius * 0.8, dist);
      const force = body.config.mass / (effDist * effDist);

      if (force > maxGravitationalForce) {
        maxGravitationalForce = force;
        dominant = body;
        minBodyDist = dist;
      }
    });

    return { body: dominant, dist: minBodyDist };
  }
}
