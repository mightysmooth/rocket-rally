// RocketPart.ts - Modular Rocket Part Definitions and 3D Mesh Builders
import * as THREE from 'three';
import { ProceduralTextures } from '../utils/ProceduralTextures';

export type PartCategory = 'capsule' | 'tank' | 'engine' | 'booster' | 'wings' | 'gadget';
export type SocketType = 'top' | 'core' | 'bottom' | 'left_wing' | 'right_wing' | 'left_booster' | 'right_booster' | 'gadget';

export interface RocketPartDef {
  id: string;
  name: string;
  category: PartCategory;
  socketType: SocketType;
  icon: string;
  statDesc: string;
  mass: number;
  thrust: number;
  createMesh: (theme: string) => THREE.Group;
}

export class RocketPartRegistry {
  private static parts: Map<string, RocketPartDef> = new Map();

  public static init(): void {
    if (this.parts.size > 0) return;

    // ==========================================
    // CAPSULES (Cockpits)
    // ==========================================
    this.register({
      id: 'capsule_astronaut',
      name: 'Bubble Cosmonaut',
      category: 'capsule',
      socketType: 'top',
      icon: '🧑‍🚀',
      statDesc: 'Comfortable bubble dome with friendly astronaut!',
      mass: 8,
      thrust: 0,
      createMesh: (theme: string) => this.buildAstronautCapsule(theme)
    });

    this.register({
      id: 'capsule_pup',
      name: 'Cosmo Pup Pod',
      category: 'capsule',
      socketType: 'top',
      icon: '🐶',
      statDesc: 'Paws in space! Space doggo co-pilot.',
      mass: 7,
      thrust: 0,
      createMesh: (theme: string) => this.buildPupCapsule(theme)
    });

    this.register({
      id: 'capsule_retro',
      name: 'Frontier Tin Can',
      category: 'capsule',
      socketType: 'top',
      icon: '🪵',
      statDesc: 'Outer Wilds timber & brass riveted cockpit.',
      mass: 9,
      thrust: 0,
      createMesh: (theme: string) => this.buildRetroCapsule(theme)
    });

    // ==========================================
    // FUEL TANKS (Core Fuselages)
    // ==========================================
    this.register({
      id: 'tank_timber',
      name: 'Timber Barrel',
      category: 'tank',
      socketType: 'core',
      icon: '🪵',
      statDesc: 'Cozy pine wood fuselage with copper rivets.',
      mass: 14,
      thrust: 0,
      createMesh: (theme: string) => this.buildTimberTank(theme)
    });

    this.register({
      id: 'tank_candy',
      name: 'Candy Striper',
      category: 'tank',
      socketType: 'core',
      icon: '🍬',
      statDesc: 'Bright festive red & white swirl pattern.',
      mass: 12,
      thrust: 0,
      createMesh: (theme: string) => this.buildCandyTank(theme)
    });

    this.register({
      id: 'tank_cosmic',
      name: 'Cosmic Star Tank',
      category: 'tank',
      socketType: 'core',
      icon: '⭐',
      statDesc: 'Deep teal fuselage with yellow star badges.',
      mass: 13,
      thrust: 0,
      createMesh: (theme: string) => this.buildCosmicTank(theme)
    });

    // ==========================================
    // ENGINES (Bottom Thrusters)
    // ==========================================
    this.register({
      id: 'engine_firecracker',
      name: 'Firecracker Thruster',
      category: 'engine',
      socketType: 'bottom',
      icon: '🧨',
      statDesc: 'Sparky, eager rocket motor. High efficiency!',
      mass: 10,
      thrust: 280,
      createMesh: (theme: string) => this.buildFirecrackerEngine(theme)
    });

    this.register({
      id: 'engine_plasma',
      name: 'Plasma Torch',
      category: 'engine',
      socketType: 'bottom',
      icon: '⚡',
      statDesc: 'Cyan plasma drive with glowing accelerator ring.',
      mass: 12,
      thrust: 340,
      createMesh: (theme: string) => this.buildPlasmaEngine(theme)
    });

    this.register({
      id: 'engine_boomer',
      name: 'Big Boomer Dual',
      category: 'engine',
      socketType: 'bottom',
      icon: '💥',
      statDesc: 'Twin thunder nozzles! Maximum thrust power.',
      mass: 16,
      thrust: 420,
      createMesh: (theme: string) => this.buildBoomerEngine(theme)
    });

    // ==========================================
    // SIDE BOOSTERS
    // ==========================================
    this.register({
      id: 'booster_strap',
      name: 'Twin Pop Boosters',
      category: 'booster',
      socketType: 'left_booster',
      icon: '🚀',
      statDesc: 'Strap-on boosters that separate with a POP!',
      mass: 15,
      thrust: 320,
      createMesh: (theme: string) => this.buildSideBoosters(theme)
    });

    // ==========================================
    // WINGS (Fins & Panels)
    // ==========================================
    this.register({
      id: 'wings_delta',
      name: 'Delta Aero Fins',
      category: 'wings',
      socketType: 'left_wing',
      icon: '🪽',
      statDesc: 'Sleek curved fins for atmospheric stability.',
      mass: 3,
      thrust: 0,
      createMesh: (theme: string) => this.buildDeltaFins(theme)
    });

    this.register({
      id: 'wings_solar',
      name: 'Solar Dragonfly Wings',
      category: 'wings',
      socketType: 'left_wing',
      icon: '✨',
      statDesc: 'Unfolding golden solar panels.',
      mass: 4,
      thrust: 0,
      createMesh: (theme: string) => this.buildSolarWings(theme)
    });

    // ==========================================
    // GADGETS & TOYS
    // ==========================================
    this.register({
      id: 'gadget_duck',
      name: 'Lucky Rubber Ducky',
      category: 'gadget',
      socketType: 'gadget',
      icon: '🦆',
      statDesc: 'Quack! The most essential rocket mascot.',
      mass: 1,
      thrust: 0,
      createMesh: (theme: string) => this.buildRubberDuck(theme)
    });

    this.register({
      id: 'gadget_lantern',
      name: 'Campfire Lantern',
      category: 'gadget',
      socketType: 'gadget',
      icon: '🏮',
      statDesc: 'Cozy glowing amber lantern swaying in space.',
      mass: 1,
      thrust: 0,
      createMesh: (theme: string) => this.buildCampfireLantern(theme)
    });
  }

  private static register(def: RocketPartDef): void {
    this.parts.set(def.id, def);
  }

  public static get(id: string): RocketPartDef | undefined {
    return this.parts.get(id);
  }

  public static getAll(): RocketPartDef[] {
    return Array.from(this.parts.values());
  }

  public static getByCategory(category: PartCategory): RocketPartDef[] {
    return this.getAll().filter(p => p.category === category);
  }

  // ==========================================================
  // PROCEDURAL 3D MESH BUILDERS
  // ==========================================================

  // 1. Astronaut Bubble Capsule
  private static buildAstronautCapsule(theme: string): THREE.Group {
    const group = new THREE.Group();
    group.name = 'capsule_astronaut';

    // Base collar
    const collarGeom = new THREE.CylinderGeometry(2.0, 2.2, 1.2, 16);
    const collarMat = new THREE.MeshStandardMaterial({ color: 0x2a9d8f, roughness: 0.5 });
    const collar = new THREE.Mesh(collarGeom, collarMat);
    collar.position.y = 0.6;
    group.add(collar);

    // Glass bubble dome
    const domeGeom = new THREE.SphereGeometry(2.1, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0x80deea,
      transparent: true,
      opacity: 0.5,
      roughness: 0.1,
      metalness: 0.1
    });
    const dome = new THREE.Mesh(domeGeom, domeMat);
    dome.position.y = 1.2;
    group.add(dome);

    // Little Astronaut inside!
    const astGroup = new THREE.Group();
    astGroup.position.set(0, 1.5, 0);

    // Helmet
    const helmGeom = new THREE.SphereGeometry(0.9, 16, 16);
    const helmMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const helm = new THREE.Mesh(helmGeom, helmMat);
    astGroup.add(helm);

    // Golden Visor
    const visorGeom = new THREE.SphereGeometry(0.75, 12, 12, 0, Math.PI, 0, Math.PI * 0.6);
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      metalness: 0.8,
      roughness: 0.2
    });
    const visor = new THREE.Mesh(visorGeom, visorMat);
    visor.rotation.x = Math.PI * 0.2;
    visor.position.set(0, 0, 0.35);
    astGroup.add(visor);

    // Cute backpack
    const packGeom = new THREE.BoxGeometry(0.8, 1.0, 0.4);
    const packMat = new THREE.MeshStandardMaterial({ color: 0xe76f51 });
    const pack = new THREE.Mesh(packGeom, packMat);
    pack.position.set(0, 0, -0.6);
    astGroup.add(pack);

    group.add(astGroup);
    return group;
  }

  // 2. Cosmo Pup Capsule
  private static buildPupCapsule(theme: string): THREE.Group {
    const group = new THREE.Group();
    group.name = 'capsule_pup';

    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(2.0, 2.2, 1.2, 16),
      new THREE.MeshStandardMaterial({ color: 0xe76f51, roughness: 0.5 })
    );
    collar.position.y = 0.6;
    group.add(collar);

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(2.1, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new THREE.MeshStandardMaterial({ color: 0x80deea, transparent: true, opacity: 0.5 })
    );
    dome.position.y = 1.2;
    group.add(dome);

    // Pup Head
    const pupGroup = new THREE.Group();
    pupGroup.position.set(0, 1.8, 0);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xd4a373 })
    );
    pupGroup.add(head);

    // Ears
    const earGeom = new THREE.ConeGeometry(0.35, 0.7, 5);
    const earMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
    const leftEar = new THREE.Mesh(earGeom, earMat);
    leftEar.position.set(-0.6, 0.7, 0);
    leftEar.rotation.z = 0.3;
    pupGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeom, earMat);
    rightEar.position.set(0.6, 0.7, 0);
    rightEar.rotation.z = -0.3;
    pupGroup.add(rightEar);

    // Snout & Nose
    const snout = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xfefae0 })
    );
    snout.position.set(0, -0.15, 0.7);
    pupGroup.add(snout);

    const nose = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    nose.position.set(0, -0.05, 1.0);
    pupGroup.add(nose);

    group.add(pupGroup);
    return group;
  }

  // 3. Retro Tin Can Capsule
  private static buildRetroCapsule(theme: string): THREE.Group {
    const group = new THREE.Group();
    group.name = 'capsule_retro';

    const coneGeom = new THREE.ConeGeometry(2.2, 3.2, 12);
    const coneMat = new THREE.MeshStandardMaterial({
      color: 0x8b5a2b,
      map: ProceduralTextures.createTimberTexture(),
      roughness: 0.8
    });
    const cone = new THREE.Mesh(coneGeom, coneMat);
    cone.position.y = 1.6;
    group.add(cone);

    // Brass porthole
    const ringGeom = new THREE.TorusGeometry(0.6, 0.12, 8, 16);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.7 });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.set(0, 1.5, 1.3);
    group.add(ring);

    // Glass in porthole
    const glass = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 16),
      new THREE.MeshBasicMaterial({ color: 0x4cc9f0 })
    );
    glass.position.set(0, 1.5, 1.31);
    group.add(glass);

    return group;
  }

  // 4. Timber Tank
  private static buildTimberTank(theme: string): THREE.Group {
    const group = new THREE.Group();
    group.name = 'tank_timber';

    const cylGeom = new THREE.CylinderGeometry(2.2, 2.2, 5.0, 16);
    const cylMat = new THREE.MeshStandardMaterial({
      map: ProceduralTextures.createTimberTexture(),
      roughness: 0.85
    });
    const cyl = new THREE.Mesh(cylGeom, cylMat);
    cyl.position.y = 2.5;
    group.add(cyl);

    return group;
  }

  // 5. Candy Tank
  private static buildCandyTank(theme: string): THREE.Group {
    const group = new THREE.Group();
    group.name = 'tank_candy';

    const cylGeom = new THREE.CylinderGeometry(2.2, 2.2, 5.0, 16);
    const cylMat = new THREE.MeshStandardMaterial({
      map: ProceduralTextures.createCandyStripeTexture(),
      roughness: 0.5
    });
    const cyl = new THREE.Mesh(cylGeom, cylMat);
    cyl.position.y = 2.5;
    group.add(cyl);

    return group;
  }

  // 6. Cosmic Star Tank
  private static buildCosmicTank(theme: string): THREE.Group {
    const group = new THREE.Group();
    group.name = 'tank_cosmic';

    const cylGeom = new THREE.CylinderGeometry(2.2, 2.2, 5.0, 16);
    const cylMat = new THREE.MeshStandardMaterial({
      map: ProceduralTextures.createCosmicPatternTexture(),
      roughness: 0.6
    });
    const cyl = new THREE.Mesh(cylGeom, cylMat);
    cyl.position.y = 2.5;
    group.add(cyl);

    return group;
  }

  // 7. Firecracker Engine
  private static buildFirecrackerEngine(theme: string): THREE.Group {
    const group = new THREE.Group();
    group.name = 'engine_firecracker';

    // Nozzle bell
    const coneGeom = new THREE.CylinderGeometry(0.8, 1.8, 2.2, 16, 1, true);
    const coneMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.3,
      side: THREE.DoubleSide
    });
    const cone = new THREE.Mesh(coneGeom, coneMat);
    cone.position.y = -1.1;
    group.add(cone);

    // Red engine cap
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(2.0, 1.2, 0.8, 16),
      new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.6 })
    );
    cap.position.y = 0.4;
    group.add(cap);

    // Inner fiery glow disk
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(0.7, 12),
      new THREE.MeshBasicMaterial({ color: 0xffb703, side: THREE.DoubleSide })
    );
    glow.rotation.x = Math.PI / 2;
    glow.position.y = -0.5;
    group.add(glow);

    return group;
  }

  // 8. Plasma Engine
  private static buildPlasmaEngine(theme: string): THREE.Group {
    const group = new THREE.Group();
    group.name = 'engine_plasma';

    const bell = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 2.0, 2.4, 16, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.9, roughness: 0.2, side: THREE.DoubleSide })
    );
    bell.position.y = -1.2;
    group.add(bell);

    // Glowing cyan plasma accelerator ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.2, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0x4cc9f0 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -1.5;
    group.add(ring);

    return group;
  }

  // 9. Big Boomer Dual Engine
  private static buildBoomerEngine(theme: string): THREE.Group {
    const group = new THREE.Group();
    group.name = 'engine_boomer';

    const bellGeom = new THREE.CylinderGeometry(0.6, 1.3, 2.2, 14, 1, true);
    const bellMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, metalness: 0.85, side: THREE.DoubleSide });

    const bell1 = new THREE.Mesh(bellGeom, bellMat);
    bell1.position.set(-1.1, -1.1, 0);
    group.add(bell1);

    const bell2 = new THREE.Mesh(bellGeom, bellMat);
    bell2.position.set(1.1, -1.1, 0);
    group.add(bell2);

    return group;
  }

  // 10. Side Boosters
  private static buildSideBoosters(theme: string): THREE.Group {
    const group = new THREE.Group();
    group.name = 'booster_strap';

    const makeSingleBooster = (xOffset: number) => {
      const b = new THREE.Group();
      b.position.set(xOffset, 2.2, 0);

      // Body
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.8, 4.6, 12),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
      );
      b.add(body);

      // Pointy nosecone
      const nose = new THREE.Mesh(
        new THREE.ConeGeometry(0.8, 1.8, 12),
        new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.5 })
      );
      nose.position.y = 3.2;
      b.add(nose);

      // Nozzle
      const nozzle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.6, 0.8, 12, 1, true),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, side: THREE.DoubleSide })
      );
      nozzle.position.y = -2.7;
      b.add(nozzle);

      // Strut mount
      const strut = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.4, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x555555 })
      );
      strut.position.set(xOffset > 0 ? -0.7 : 0.7, 0, 0);
      b.add(strut);

      return b;
    };

    group.add(makeSingleBooster(-2.9));
    group.add(makeSingleBooster(2.9));

    return group;
  }

  // 11. Delta Fins
  private static buildDeltaFins(theme: string): THREE.Group {
    const group = new THREE.Group();
    group.name = 'wings_delta';

    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(2.4, -1.2);
    shape.lineTo(2.4, -2.6);
    shape.lineTo(0, -1.8);
    shape.closePath();

    const extrudeSettings = { depth: 0.15, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05 };
    const finGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const finMat = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.5 });

    // 4 symmetric fins around core
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(finGeom, finMat);
      fin.position.y = 1.8;
      fin.rotation.y = (i * Math.PI) / 2;
      fin.position.x = Math.cos((i * Math.PI) / 2) * 2.1;
      fin.position.z = Math.sin((i * Math.PI) / 2) * 2.1;
      group.add(fin);
    }

    return group;
  }

  // 12. Solar Dragonfly Wings
  private static buildSolarWings(theme: string): THREE.Group {
    const group = new THREE.Group();
    group.name = 'wings_solar';

    const panelGeom = new THREE.BoxGeometry(4.2, 1.2, 0.1);
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x1d3557, metalness: 0.6, roughness: 0.2 });

    const left = new THREE.Mesh(panelGeom, panelMat);
    left.position.set(-4.2, 2.5, 0);
    group.add(left);

    const right = new THREE.Mesh(panelGeom, panelMat);
    right.position.set(4.2, 2.5, 0);
    group.add(right);

    return group;
  }

  // 13. Lucky Rubber Ducky
  private static buildRubberDuck(theme: string): THREE.Group {
    const group = new THREE.Group();
    group.name = 'gadget_duck';
    group.position.set(0, 2.5, 2.0); // Sits adorably on front of rocket!

    // Duck body
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.4 })
    );
    group.add(body);

    // Duck head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.4 })
    );
    head.position.set(0, 0.45, 0.2);
    group.add(head);

    // Orange beak
    const beak = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.35, 8),
      new THREE.MeshStandardMaterial({ color: 0xe76f51 })
    );
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.42, 0.6);
    group.add(beak);

    return group;
  }

  // 14. Campfire Lantern
  private static buildCampfireLantern(theme: string): THREE.Group {
    const group = new THREE.Group();
    group.name = 'gadget_lantern';
    group.position.set(2.1, 3.2, 0.8);

    const cage = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.35, 0.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x2b1d0c, roughness: 0.9 })
    );
    group.add(cage);

    // Glowing ember inside
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xf4a261 })
    );
    group.add(glow);

    return group;
  }
}

