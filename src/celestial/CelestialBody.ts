// CelestialBody.ts - Stylized Outer Wilds Celestial Body
import * as THREE from 'three';

export interface CelestialBodyConfig {
  id: string;
  name: string;
  emoji: string;
  radius: number;
  mass: number;
  color: number;
  orbitRadius: number;
  orbitSpeed: number; // radians per second
  orbitParentId?: string;
  hasAtmosphere?: boolean;
  atmosphereRadius?: number;
  atmosphereColor?: number;
  rotationSpeed?: number;
  texture?: THREE.Texture;
  hasRings?: boolean;
  ringsInnerRadius?: number;
  ringsOuterRadius?: number;
  ringsTexture?: THREE.Texture;
}

export class CelestialBody {
  public config: CelestialBodyConfig;
  public group: THREE.Group;
  public mesh: THREE.Mesh;
  public atmosphereMesh: THREE.Mesh | null = null;
  public ringsMesh: THREE.Mesh | null = null;
  public orbitLine: THREE.LineLoop | null = null;

  public position: THREE.Vector3 = new THREE.Vector3();
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public orbitAngle: number = 0;
  public surfaceDecorations: THREE.Group = new THREE.Group();

  constructor(config: CelestialBodyConfig) {
    this.config = config;
    this.group = new THREE.Group();
    this.group.name = config.name;

    // Create Planet Sphere
    const segments = config.radius > 60 ? 48 : 32;
    const geometry = new THREE.SphereGeometry(config.radius, segments, segments);

    let material: THREE.Material;
    if (config.id === 'sun') {
      material = new THREE.MeshBasicMaterial({
        color: config.color
      });
    } else {
      material = new THREE.MeshStandardMaterial({
        color: config.color,
        map: config.texture || null,
        roughness: 0.8,
        metalness: 0.1,
        flatShading: config.radius < 50 // Low poly charm for moons/small planets!
      });
    }

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);

    // Create Atmosphere Glow if enabled
    if (config.hasAtmosphere && config.atmosphereRadius && config.atmosphereColor) {
      const atmoGeom = new THREE.SphereGeometry(config.atmosphereRadius, 32, 32);
      const atmoMat = new THREE.MeshBasicMaterial({
        color: config.atmosphereColor,
        transparent: true,
        opacity: 0.22,
        side: THREE.BackSide,
        depthWrite: false
      });
      this.atmosphereMesh = new THREE.Mesh(atmoGeom, atmoMat);
      this.group.add(this.atmosphereMesh);
    }

    // Create Planetary Dust Rings if enabled (e.g. Gigantus / Saturn)
    if (config.hasRings && config.ringsInnerRadius && config.ringsOuterRadius) {
      const ringGeom = new THREE.RingGeometry(config.ringsInnerRadius, config.ringsOuterRadius, 64);
      const ringMat = new THREE.MeshStandardMaterial({
        map: config.ringsTexture || null,
        color: 0xe8cfb0,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.88,
        roughness: 0.7
      });
      this.ringsMesh = new THREE.Mesh(ringGeom, ringMat);
      this.ringsMesh.rotation.x = Math.PI * 0.45;
      this.ringsMesh.rotation.y = Math.PI * 0.1;
      this.group.add(this.ringsMesh);
    }

    // Surface details (trees, launchpad, craters, crystals)
    this.group.add(this.surfaceDecorations);
    this.addSurfaceDetails();
  }

  // Add Outer-Wilds-style handcrafted props to the planetary surface
  private addSurfaceDetails(): void {
    if (this.config.id === 'hearthstone') {
      this.buildHearthstoneProps();
    } else if (this.config.id === 'moon') {
      this.buildMoonProps();
    } else if (this.config.id === 'red_mesa') {
      this.buildRedMesaProps();
    } else if (this.config.id === 'frostmoon') {
      this.buildFrostmoonProps();
    }
  }

  // Timber Hearth: Wooden Launchpad, Pine trees, campfire
  private buildHearthstoneProps(): void {
    const R = this.config.radius;

    // 1. Cozy Wooden Launch Pad at North Pole (y = R)
    const padGroup = new THREE.Group();
    padGroup.position.set(0, R - 0.2, 0);

    // Round wooden deck
    const deckGeom = new THREE.CylinderGeometry(14, 15, 2, 16);
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });
    const deckMesh = new THREE.Mesh(deckGeom, woodMat);
    deckMesh.position.y = 1;
    padGroup.add(deckMesh);

    // Launch tower / wooden gantry
    const gantryGeom = new THREE.BoxGeometry(2, 28, 2);
    const gantryMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.8 });
    const gantryMesh = new THREE.Mesh(gantryGeom, gantryMat);
    gantryMesh.position.set(-9, 14, -6);
    padGroup.add(gantryMesh);

    // Observation walkway arm
    const armGeom = new THREE.BoxGeometry(8, 1.2, 2);
    const armMesh = new THREE.Mesh(armGeom, woodMat);
    armMesh.position.set(-5, 24, -6);
    padGroup.add(armMesh);

    // Lantern hanging on gantry
    const lanternGeom = new THREE.DodecahedronGeometry(0.9);
    const lanternMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
    const lanternMesh = new THREE.Mesh(lanternGeom, lanternMat);
    lanternMesh.position.set(-1.5, 23, -6);
    padGroup.add(lanternMesh);

    // Campfire next to pad!
    const campfireMat = new THREE.MeshBasicMaterial({ color: 0xe76f51 });
    const campfireMesh = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.5, 6), campfireMat);
    campfireMesh.position.set(6, 2.2, 6);
    padGroup.add(campfireMesh);

    this.surfaceDecorations.add(padGroup);

    // 2. Stylized Pine Trees scattered around the planet
    const pineConeGeom = new THREE.ConeGeometry(2.5, 7, 5);
    const pineMat = new THREE.MeshStandardMaterial({ color: 0x1f5c35, roughness: 0.8 });
    const trunkGeom = new THREE.CylinderGeometry(0.6, 0.8, 3, 5);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.9 });

    for (let i = 0; i < 45; i++) {
      // Random position on sphere avoiding North pole launchpad
      const u = Math.random() * 0.8 + 0.1;
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.acos(2 * u - 1);

      if (theta < 0.4) continue; // Keep launchpad clear

      const pos = new THREE.Vector3(
        R * Math.sin(theta) * Math.cos(phi),
        R * Math.cos(theta),
        R * Math.sin(theta) * Math.sin(phi)
      );

      const treeGroup = new THREE.Group();
      treeGroup.position.copy(pos);
      treeGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize());

      const trunk = new THREE.Mesh(trunkGeom, trunkMat);
      trunk.position.y = 1.5;
      treeGroup.add(trunk);

      const foliage = new THREE.Mesh(pineConeGeom, pineMat);
      foliage.position.y = 5.5;
      treeGroup.add(foliage);

      this.surfaceDecorations.add(treeGroup);
    }
  }

  // Cheesy Moon props: Crater rims & flag landing target
  private buildMoonProps(): void {
    const R = this.config.radius;
    // Flag marker landing zone on North Pole
    const flagGroup = new THREE.Group();
    flagGroup.position.set(0, R, 0);

    const poleGeom = new THREE.CylinderGeometry(0.2, 0.2, 6, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xd4af37 });
    const pole = new THREE.Mesh(poleGeom, poleMat);
    pole.position.y = 3;
    flagGroup.add(pole);

    const bannerGeom = new THREE.BoxGeometry(3, 1.8, 0.1);
    const bannerMat = new THREE.MeshBasicMaterial({ color: 0xe63946 });
    const banner = new THREE.Mesh(bannerGeom, bannerMat);
    banner.position.set(1.5, 4.8, 0);
    flagGroup.add(banner);

    this.surfaceDecorations.add(flagGroup);
  }

  // Red Mesa props: Ancient little rover & canyon rocks
  private buildRedMesaProps(): void {
    const R = this.config.radius;
    const roverGroup = new THREE.Group();
    roverGroup.position.set(0, R, 0);

    // Rover chassis
    const bodyGeom = new THREE.BoxGeometry(3, 1.5, 4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd97736, roughness: 0.6 });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 1.5;
    roverGroup.add(body);

    // Rover solar panel
    const panelGeom = new THREE.BoxGeometry(4.5, 0.2, 3);
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x1b3b6f, metalness: 0.6 });
    const panel = new THREE.Mesh(panelGeom, panelMat);
    panel.position.set(0, 2.5, 0);
    roverGroup.add(panel);

    // Rover mast camera
    const mastGeom = new THREE.CylinderGeometry(0.15, 0.15, 2.5, 6);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    const mast = new THREE.Mesh(mastGeom, mastMat);
    mast.position.set(1, 3.2, 1.2);
    roverGroup.add(mast);

    this.surfaceDecorations.add(roverGroup);
  }

  // Frostmoon props: Glowing cyan ice crystals
  private buildFrostmoonProps(): void {
    const R = this.config.radius;
    const crystalGeom = new THREE.ConeGeometry(1.4, 6, 5);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x80ed99,
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.85
    });

    for (let i = 0; i < 20; i++) {
      const u = Math.random();
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.acos(2 * u - 1);

      const pos = new THREE.Vector3(
        R * Math.sin(theta) * Math.cos(phi),
        R * Math.cos(theta),
        R * Math.sin(theta) * Math.sin(phi)
      );

      const crystal = new THREE.Mesh(crystalGeom, crystalMat);
      crystal.position.copy(pos);
      crystal.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize());
      crystal.scale.set(1 + Math.random(), 1 + Math.random() * 1.5, 1 + Math.random());
      this.surfaceDecorations.add(crystal);
    }
  }

  // Update orbit angle and celestial position
  public update(dt: number, parentPos: THREE.Vector3 = new THREE.Vector3()): void {
    if (this.config.orbitRadius > 0) {
      this.orbitAngle += this.config.orbitSpeed * dt;
      this.position.x = parentPos.x + Math.cos(this.orbitAngle) * this.config.orbitRadius;
      this.position.z = parentPos.z + Math.sin(this.orbitAngle) * this.config.orbitRadius;
      this.position.y = parentPos.y;

      // Approximate orbital tangential velocity vector
      const vMagnitude = this.config.orbitSpeed * this.config.orbitRadius;
      this.velocity.set(
        -Math.sin(this.orbitAngle) * vMagnitude,
        0,
        Math.cos(this.orbitAngle) * vMagnitude
      );
    } else {
      this.position.copy(parentPos);
      this.velocity.set(0, 0, 0);
    }

    this.group.position.copy(this.position);

    // Planet axial rotation
    const rot = (this.config.rotationSpeed || 0.05) * dt;
    this.mesh.rotation.y += rot;
  }

  // Plant a player flag on the surface
  public plantPlayerFlag(pos: THREE.Vector3): void {
    const flagGroup = new THREE.Group();
    // Convert world position to local planet space
    const localPos = this.group.worldToLocal(pos.clone());
    flagGroup.position.copy(localPos);
    flagGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), localPos.clone().normalize());

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    pole.position.y = 2;
    flagGroup.add(pole);

    const banner = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.4, 0.05),
      new THREE.MeshBasicMaterial({ color: 0x4cc9f0 })
    );
    banner.position.set(1.2, 3.2, 0);
    flagGroup.add(banner);

    this.surfaceDecorations.add(flagGroup);
  }
}

