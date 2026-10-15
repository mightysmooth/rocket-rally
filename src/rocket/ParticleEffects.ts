// ParticleEffects.ts - Juicy Flame Trails, Smoke Puffs, Confetti, and Landing Dust
import * as THREE from 'three';

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
}

export class ParticleEffects {
  private scene: THREE.Scene;

  // Reusable particle system for flames & smoke
  private flameParticles: Particle[] = [];
  private flamePoints: THREE.Points;
  private flamePositions: Float32Array;
  private flameColors: Float32Array;
  private flameSizes: Float32Array;
  private readonly maxFlames = 600;

  // Confetti particles for celebrations & staging
  private confettiParticles: Particle[] = [];
  private confettiPoints: THREE.Points;
  private confettiPositions: Float32Array;
  private confettiColors: Float32Array;
  private readonly maxConfetti = 300;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Setup Flames & Smoke Points
    const flameGeom = new THREE.BufferGeometry();
    this.flamePositions = new Float32Array(this.maxFlames * 3);
    this.flameColors = new Float32Array(this.maxFlames * 3);
    this.flameSizes = new Float32Array(this.maxFlames);

    flameGeom.setAttribute('position', new THREE.BufferAttribute(this.flamePositions, 3));
    flameGeom.setAttribute('color', new THREE.BufferAttribute(this.flameColors, 3));
    flameGeom.setAttribute('size', new THREE.BufferAttribute(this.flameSizes, 1));

    const flameMat = new THREE.PointsMaterial({
      vertexColors: true,
      size: 16,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.flamePoints = new THREE.Points(flameGeom, flameMat);
    this.scene.add(this.flamePoints);

    // Setup Confetti Points
    const confGeom = new THREE.BufferGeometry();
    this.confettiPositions = new Float32Array(this.maxConfetti * 3);
    this.confettiColors = new Float32Array(this.maxConfetti * 3);

    confGeom.setAttribute('position', new THREE.BufferAttribute(this.confettiPositions, 3));
    confGeom.setAttribute('color', new THREE.BufferAttribute(this.confettiColors, 3));

    const confMat = new THREE.PointsMaterial({
      vertexColors: true,
      size: 12,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    });
    this.confettiPoints = new THREE.Points(confGeom, confMat);
    this.scene.add(this.confettiPoints);
  }

  // Emit fiery flame and smoke puffs from rocket exhaust nozzles
  public emitThrust(exhaustWorldPos: THREE.Vector3, rocketDir: THREE.Vector3, throttle: number): void {
    const count = Math.floor(throttle * 4) + 1;
    const oppDir = rocketDir.clone().negate();

    for (let i = 0; i < count; i++) {
      if (this.flameParticles.length >= this.maxFlames) {
        this.flameParticles.shift();
      }

      // Random jitter
      const spread = 0.4;
      const vel = oppDir.clone().multiplyScalar(15 + Math.random() * 25).add(new THREE.Vector3(
        (Math.random() - 0.5) * spread * 10,
        (Math.random() - 0.5) * spread * 10,
        (Math.random() - 0.5) * spread * 10
      ));

      // Color shifts from yellow/white core to deep orange/smoke
      const isCore = Math.random() > 0.4;
      const color = isCore ? new THREE.Color(0xffd166) : new THREE.Color(0xe76f51);

      this.flameParticles.push({
        pos: exhaustWorldPos.clone(),
        vel: vel,
        color: color,
        size: 12 + Math.random() * 14,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.35
      });
    }
  }

  // Pop burst of smoke and confetti on stage separation
  public emitStagePop(pos: THREE.Vector3): void {
    const colors = [0xffd166, 0xe63946, 0x4cc9f0, 0x52ffd5, 0xffffff];
    for (let i = 0; i < 40; i++) {
      if (this.confettiParticles.length >= this.maxConfetti) {
        this.confettiParticles.shift();
      }

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20
      );

      const color = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);

      this.confettiParticles.push({
        pos: pos.clone(),
        vel: vel,
        color: color,
        size: 10,
        life: 0,
        maxLife: 1.2 + Math.random() * 0.8
      });
    }
  }

  // Triumphant confetti shower on landing touchdown or orbit
  public emitCelebration(pos: THREE.Vector3): void {
    const colors = [0xffd166, 0x52ffd5, 0xe76f51, 0x4cc9f0, 0xf72585];
    for (let i = 0; i < 80; i++) {
      if (this.confettiParticles.length >= this.maxConfetti) {
        this.confettiParticles.shift();
      }

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 25,
        15 + Math.random() * 25,
        (Math.random() - 0.5) * 25
      );

      const color = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);

      this.confettiParticles.push({
        pos: pos.clone(),
        vel: vel,
        color: color,
        size: 12,
        life: 0,
        maxLife: 2.5 + Math.random() * 1.5
      });
    }
  }

  // Touchdown soft dust puff
  public emitTouchdownDust(pos: THREE.Vector3, upDir: THREE.Vector3): void {
    for (let i = 0; i < 30; i++) {
      if (this.flameParticles.length >= this.maxFlames) {
        this.flameParticles.shift();
      }

      const angle = Math.random() * Math.PI * 2;
      const speed = 6 + Math.random() * 10;
      const vel = new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.random() * 4,
        Math.sin(angle) * speed
      );

      this.flameParticles.push({
        pos: pos.clone(),
        vel: vel,
        color: new THREE.Color(0xd4a373),
        size: 16 + Math.random() * 12,
        life: 0,
        maxLife: 1.0 + Math.random() * 0.5
      });
    }
  }

  // Golden trail sparkles when flying along the guidance highway
  public emitHighwaySparkles(pos: THREE.Vector3): void {
    for (let i = 0; i < 3; i++) {
      if (this.confettiParticles.length >= this.maxConfetti) {
        this.confettiParticles.shift();
      }
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6
      );
      this.confettiParticles.push({
        pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3)),
        vel: vel,
        color: new THREE.Color(0xffd166),
        size: 14,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.4
      });
    }
  }

  public update(dt: number): void {
    // 1. Update Flames & Smoke
    for (let i = this.flameParticles.length - 1; i >= 0; i--) {
      const p = this.flameParticles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.flameParticles.splice(i, 1);
        continue;
      }

      p.pos.addScaledVector(p.vel, dt);
      p.vel.multiplyScalar(0.96); // Drag deceleration
      p.size *= (1 + dt * 1.2); // Expands as it cools into smoke
    }

    // Write flame buffer
    for (let i = 0; i < this.maxFlames; i++) {
      if (i < this.flameParticles.length) {
        const p = this.flameParticles[i];
        this.flamePositions[i * 3] = p.pos.x;
        this.flamePositions[i * 3 + 1] = p.pos.y;
        this.flamePositions[i * 3 + 2] = p.pos.z;

        const progress = p.life / p.maxLife;
        // Fade to smoky gray/transparent
        const alpha = 1.0 - progress;
        this.flameColors[i * 3] = p.color.r * alpha;
        this.flameColors[i * 3 + 1] = p.color.g * alpha;
        this.flameColors[i * 3 + 2] = p.color.b * alpha;
        this.flameSizes[i] = p.size;
      } else {
        this.flamePositions[i * 3] = 0;
        this.flamePositions[i * 3 + 1] = -99999;
        this.flamePositions[i * 3 + 2] = 0;
      }
    }
    this.flamePoints.geometry.attributes.position.needsUpdate = true;
    this.flamePoints.geometry.attributes.color.needsUpdate = true;
    this.flamePoints.geometry.attributes.size.needsUpdate = true;

    // 2. Update Confetti
    for (let i = this.confettiParticles.length - 1; i >= 0; i--) {
      const p = this.confettiParticles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.confettiParticles.splice(i, 1);
        continue;
      }

      p.pos.addScaledVector(p.vel, dt);
      p.vel.y -= 9.8 * dt * 0.4; // Soft gravity flutter
      p.vel.multiplyScalar(0.98);
    }

    // Write confetti buffer
    for (let i = 0; i < this.maxConfetti; i++) {
      if (i < this.confettiParticles.length) {
        const p = this.confettiParticles[i];
        this.confettiPositions[i * 3] = p.pos.x;
        this.confettiPositions[i * 3 + 1] = p.pos.y;
        this.confettiPositions[i * 3 + 2] = p.pos.z;

        const alpha = Math.max(0, 1.0 - (p.life / p.maxLife));
        this.confettiColors[i * 3] = p.color.r * alpha;
        this.confettiColors[i * 3 + 1] = p.color.g * alpha;
        this.confettiColors[i * 3 + 2] = p.color.b * alpha;
      } else {
        this.confettiPositions[i * 3] = 0;
        this.confettiPositions[i * 3 + 1] = -99999;
        this.confettiPositions[i * 3 + 2] = 0;
      }
    }
    this.confettiPoints.geometry.attributes.position.needsUpdate = true;
    this.confettiPoints.geometry.attributes.color.needsUpdate = true;
  }
}

