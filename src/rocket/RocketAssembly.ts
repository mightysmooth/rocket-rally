// RocketAssembly.ts - Modular Rocket Assembly & Hierarchy
import * as THREE from 'three';
import { RocketPartRegistry, RocketPartDef } from './RocketPart';

export interface RocketConfig {
  name: string;
  theme: string;
  capsuleId: string;
  tankId: string;
  engineId: string;
  boosterId: string | null;
  wingsId: string | null;
  gadgetId: string | null;
}

export class RocketAssembly {
  public config: RocketConfig;
  public group: THREE.Group;

  // Staging components
  public boostersMesh: THREE.Group | null = null;
  public hasBoosters: boolean = false;
  public boostersStaged: boolean = false;

  // Total rocket stats
  public totalMass: number = 30;
  public mainThrust: number = 280;
  public boosterThrust: number = 0;

  // Engine nozzle exhaust anchor points in world/local space
  public exhaustPoints: THREE.Vector3[] = [];

  constructor() {
    RocketPartRegistry.init();

    this.group = new THREE.Group();
    this.group.name = 'rocket_assembly';

    // Default cozy starting configuration
    this.config = {
      name: 'Little Wanderer',
      theme: 'campfire',
      capsuleId: 'capsule_astronaut',
      tankId: 'tank_timber',
      engineId: 'engine_firecracker',
      boosterId: 'booster_strap',
      wingsId: 'wings_delta',
      gadgetId: 'gadget_duck'
    };

    this.rebuild();
  }

  public setPart(category: string, partId: string | null): void {
    if (category === 'capsule' && partId) this.config.capsuleId = partId;
    else if (category === 'tank' && partId) this.config.tankId = partId;
    else if (category === 'engine' && partId) this.config.engineId = partId;
    else if (category === 'booster') this.config.boosterId = partId;
    else if (category === 'wings') this.config.wingsId = partId;
    else if (category === 'gadget') this.config.gadgetId = partId;

    this.rebuild();
  }

  public setTheme(theme: string): void {
    this.config.theme = theme;
    this.rebuild();
  }

  public setName(name: string): void {
    this.config.name = name;
  }

  // Clear current 3D children and assemble fresh parts
  public rebuild(): void {
    // Clean old meshes
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
    }

    this.exhaustPoints = [];
    let mass = 0;
    let mainT = 0;
    let boostT = 0;

    // 1. Core Fuselage / Fuel Tank (Height ~ 5.0, sits from y=0 to y=5)
    const tankDef = RocketPartRegistry.get(this.config.tankId);
    if (tankDef) {
      const tankMesh = tankDef.createMesh(this.config.theme);
      this.group.add(tankMesh);
      mass += tankDef.mass;
    }

    // 2. Cockpit / Capsule (Mounts on top of tank, y=5.0)
    const capDef = RocketPartRegistry.get(this.config.capsuleId);
    if (capDef) {
      const capMesh = capDef.createMesh(this.config.theme);
      capMesh.position.y = 5.0;
      this.group.add(capMesh);
      mass += capDef.mass;
    }

    // 3. Engine (Mounts on bottom of tank, y=0.0)
    const engDef = RocketPartRegistry.get(this.config.engineId);
    if (engDef) {
      const engMesh = engDef.createMesh(this.config.theme);
      engMesh.position.y = 0.0;
      this.group.add(engMesh);
      mass += engDef.mass;
      mainT += engDef.thrust;

      if (this.config.engineId === 'engine_boomer') {
        this.exhaustPoints.push(new THREE.Vector3(-1.1, -2.2, 0));
        this.exhaustPoints.push(new THREE.Vector3(1.1, -2.2, 0));
      } else {
        this.exhaustPoints.push(new THREE.Vector3(0, -2.0, 0));
      }
    }

    // 4. Aerodynamic Wings / Fins
    if (this.config.wingsId) {
      const wingDef = RocketPartRegistry.get(this.config.wingsId);
      if (wingDef) {
        const wingMesh = wingDef.createMesh(this.config.theme);
        this.group.add(wingMesh);
        mass += wingDef.mass;
      }
    }

    // 5. Side Strap-On Boosters
    this.boostersStaged = false;
    if (this.config.boosterId) {
      const boostDef = RocketPartRegistry.get(this.config.boosterId);
      if (boostDef) {
        this.boostersMesh = boostDef.createMesh(this.config.theme);
        this.group.add(this.boostersMesh);
        mass += boostDef.mass;
        boostT += boostDef.thrust;
        this.hasBoosters = true;

        this.exhaustPoints.push(new THREE.Vector3(-2.9, -0.6, 0));
        this.exhaustPoints.push(new THREE.Vector3(2.9, -0.6, 0));
      }
    } else {
      this.boostersMesh = null;
      this.hasBoosters = false;
    }

    // 6. Fun Toys / Gadgets (Rubber Ducky, Campfire lantern)
    if (this.config.gadgetId) {
      const gadDef = RocketPartRegistry.get(this.config.gadgetId);
      if (gadDef) {
        const gadMesh = gadDef.createMesh(this.config.theme);
        this.group.add(gadMesh);
        mass += gadDef.mass;
      }
    }

    this.totalMass = mass;
    this.mainThrust = mainT;
    this.boosterThrust = boostT;
  }

  // Stage / separate the side boosters
  public stageBoosters(scene: THREE.Scene): THREE.Group[] {
    if (!this.hasBoosters || this.boostersStaged || !this.boostersMesh) {
      return [];
    }

    this.boostersStaged = true;
    this.group.remove(this.boostersMesh);

    // Filter out side booster exhaust points
    this.exhaustPoints = this.exhaustPoints.filter(pt => Math.abs(pt.x) < 2.0);

    // Create 2 separate tumbling booster debris pieces in world space
    const debrisList: THREE.Group[] = [];
    const children = [...this.boostersMesh.children];

    children.forEach(child => {
      const debris = new THREE.Group();
      // Get global world transform
      const worldPos = new THREE.Vector3();
      const worldQuat = new THREE.Quaternion();
      child.getWorldPosition(worldPos);
      child.getWorldQuaternion(worldQuat);

      debris.position.copy(worldPos);
      debris.quaternion.copy(worldQuat);

      this.boostersMesh!.remove(child);
      child.position.set(0, 0, 0);
      debris.add(child);
      scene.add(debris);
      debrisList.push(debris);
    });

    return debrisList;
  }

  // Get current active total thrust
  public getActiveThrust(): number {
    return this.mainThrust + (this.boostersStaged ? 0 : this.boosterThrust);
  }

  // Reset staging state for a new launch
  public resetStaging(): void {
    if (this.hasBoosters && this.boostersStaged) {
      this.rebuild();
    }
    this.boostersStaged = false;
  }
}

