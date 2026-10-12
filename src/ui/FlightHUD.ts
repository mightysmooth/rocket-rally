import * as THREE from 'three';
import { RocketPhysics, FlightTelemetry, GuidanceMode } from '../rocket/RocketPhysics';
import { CameraManager, CameraMode } from '../core/CameraManager';
import { SolarSystem } from '../celestial/SolarSystem';
import { CelestialBody } from '../celestial/CelestialBody';
import { SoundSynth } from '../audio/SoundSynth';
import { ParticleEffects } from '../rocket/ParticleEffects';

export class FlightHUD {
  private physics: RocketPhysics;
  private cameraManager: CameraManager;
  private solarSystem: SolarSystem;
  private soundSynth: SoundSynth;
  private particleEffects: ParticleEffects;

  // UI Elements
  private elSpeed: HTMLElement | null = null;
  private elAltitude: HTMLElement | null = null;
  private elOrbitStatus: HTMLElement | null = null;
  private elTargetName: HTMLElement | null = null;
  private elStagingContainer: HTMLElement | null = null;
  private elStagingBtn: HTMLElement | null = null;
  private elOrbitBanner: HTMLElement | null = null;
  private elLandingOverlay: HTMLElement | null = null;
  private elCruiseBtn: HTMLElement | null = null;

  // Callbacks
  public onReturnToBuilder: (() => void) | null = null;
  public onRelaunch: (() => void) | null = null;
  public onTakeSnapshot: (() => void) | null = null;

  constructor(
    physics: RocketPhysics,
    cameraManager: CameraManager,
    solarSystem: SolarSystem,
    soundSynth: SoundSynth,
    particleEffects: ParticleEffects
  ) {
    this.physics = physics;
    this.cameraManager = cameraManager;
    this.solarSystem = solarSystem;
    this.soundSynth = soundSynth;
    this.particleEffects = particleEffects;

    this.cacheElements();
    this.setupCameraButtons();
    this.setupGuidanceButtons();
    this.setupTargetChips();
    this.setupTimeWarpButtons();
    this.setupStaging();
    this.setupActionButtons();
    this.setupLandingDialog();
  }

  private cacheElements(): void {
    this.elSpeed = document.getElementById('telem-speed');
    this.elAltitude = document.getElementById('telem-altitude');
    this.elOrbitStatus = document.getElementById('orbit-status-text');
    this.elTargetName = document.getElementById('telem-target');
    this.elStagingContainer = document.getElementById('staging-container');
    this.elStagingBtn = document.getElementById('btn-stage');
    this.elOrbitBanner = document.getElementById('orbit-banner');
    this.elLandingOverlay = document.getElementById('landing-overlay');
    this.elCruiseBtn = document.getElementById('btn-cruise');
  }

  private setupCameraButtons(): void {
    const bindCam = (id: string, mode: CameraMode) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.camera-bar .btn-cam').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.cameraManager.setMode(mode);
        this.soundSynth.playClick();
      });
    };

    bindCam('btn-cam-rocket', 'ROCKET');
    bindCam('btn-cam-cockpit', 'COCKPIT');
    bindCam('btn-cam-map', 'MAP');
    bindCam('btn-cam-planet', 'PLANET');
  }

  private setupGuidanceButtons(): void {
    const bindAim = (id: string, mode: GuidanceMode) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('click', () => {
        const isActive = btn.classList.contains('active');
        document.querySelectorAll('.guidance-bar .btn-aim').forEach(b => b.classList.remove('active'));
        if (isActive) {
          this.physics.setGuidanceMode('OFF');
        } else {
          btn.classList.add('active');
          this.physics.setGuidanceMode(mode);
        }
        this.soundSynth.playClick();
      });
    };

    bindAim('btn-aim-prograde', 'PROGRADE');
    bindAim('btn-aim-retrograde', 'RETROGRADE');
    bindAim('btn-aim-target', 'TARGET');
  }

  private setupTargetChips(): void {
    const container = document.getElementById('target-chips');
    if (!container) return;

    container.innerHTML = '';
    const targets = [
      { id: 'hearthstone', name: '🌍 Hearthstone' },
      { id: 'moon', name: '🧀 Cheesy Moon' },
      { id: 'red_mesa', name: '🏜️ Red Mesa' },
      { id: 'gigantus', name: '🪐 Gigantus' },
      { id: 'frostmoon', name: '❄️ Frostmoon' },
      { id: 'comet', name: '☄️ Wild Comet' }
    ];

    targets.forEach(t => {
      const chip = document.createElement('button');
      chip.className = 'target-chip';
      chip.textContent = t.name;

      chip.addEventListener('click', () => {
        const isActive = chip.classList.contains('active');
        container.querySelectorAll('.target-chip').forEach(c => c.classList.remove('active'));
        if (isActive) {
          this.physics.setTargetBody(null);
          if (this.elTargetName) this.elTargetName.textContent = 'None';
        } else {
          chip.classList.add('active');
          this.physics.setTargetBody(t.id);
          if (this.elTargetName) this.elTargetName.textContent = t.name;
        }
        this.soundSynth.playClick();
      });

      container.appendChild(chip);
    });
  }

  private setupTimeWarpButtons(): void {
    const warpBtns = document.querySelectorAll('.time-warp-bar .btn-warp');
    warpBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        warpBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const warp = parseFloat(btn.getAttribute('data-warp') || '1');
        this.physics.timeWarp = warp;
        this.soundSynth.playClick();
      });
    });
  }

  public setTimeWarp(warp: number): void {
    this.physics.timeWarp = warp;
    const warpBtns = document.querySelectorAll('.time-warp-bar .btn-warp');
    warpBtns.forEach(btn => {
      const w = parseFloat(btn.getAttribute('data-warp') || '1');
      if (w === warp) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private setupStaging(): void {
    if (this.elStagingBtn) {
      this.elStagingBtn.addEventListener('click', () => {
        this.triggerStage();
      });
    }
  }

  public triggerStage(): void {
    if (!this.physics.assembly.hasBoosters || this.physics.assembly.boostersStaged) return;

    this.soundSynth.playStageSeparation();
    this.particleEffects.emitStagePop(this.physics.position);
    this.physics.assembly.stageBoosters(this.solarSystem.scene);

    if (this.elStagingContainer) {
      this.elStagingContainer.classList.add('hidden');
    }
  }

  private setupActionButtons(): void {
    // Cruise lock toggle
    if (this.elCruiseBtn) {
      this.elCruiseBtn.addEventListener('click', () => {
        const nextState = !this.physics.cruiseLocked;
        this.physics.setCruise(nextState);
        if (nextState) {
          this.elCruiseBtn!.classList.add('active');
        } else {
          this.elCruiseBtn!.classList.remove('active');
        }
        this.soundSynth.playClick();
      });
    }

    // Return to Builder
    const backBtn = document.getElementById('btn-return-hangar');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.soundSynth.playClick();
        if (this.onReturnToBuilder) this.onReturnToBuilder();
      });
    }

    // Relaunch
    const relaunchBtn = document.getElementById('btn-relaunch');
    if (relaunchBtn) {
      relaunchBtn.addEventListener('click', () => {
        this.soundSynth.playClick();
        if (this.onRelaunch) this.onRelaunch();
      });
    }

    // Snapshot
    const snapBtn = document.getElementById('btn-snapshot');
    if (snapBtn) {
      snapBtn.addEventListener('click', () => {
        this.triggerPhotoFlash();
        if (this.onTakeSnapshot) this.onTakeSnapshot();
      });
    }
  }

  private setupLandingDialog(): void {
    // Plant Flag
    const flagBtn = document.getElementById('btn-plant-flag');
    if (flagBtn) {
      flagBtn.addEventListener('click', () => {
        if (this.physics.landedBody) {
          this.physics.landedBody.plantPlayerFlag(this.physics.position);
          this.particleEffects.emitCelebration(this.physics.position);
          this.soundSynth.playFlagPlant();
          flagBtn.textContent = '🚩 Flag Planted!';
          flagBtn.setAttribute('disabled', 'true');
        }
      });
    }

    // Astronaut Hop
    const hopBtn = document.getElementById('btn-eva-hop');
    if (hopBtn) {
      hopBtn.addEventListener('click', () => {
        this.soundSynth.playBounceBoing();
        this.particleEffects.emitTouchdownDust(this.physics.position, new THREE.Vector3(0, 1, 0));
        // Little celebratory jump animation
        this.physics.assembly.group.position.y += 2.0;
        setTimeout(() => {
          this.physics.assembly.group.position.y -= 2.0;
        }, 300);
      });
    }

    // Souvenir Photo
    const photoBtn = document.getElementById('btn-take-trophy-photo');
    if (photoBtn) {
      photoBtn.addEventListener('click', () => {
        this.triggerPhotoFlash();
        if (this.onTakeSnapshot) this.onTakeSnapshot();
      });
    }

    // Liftoff again
    const blastBtn = document.getElementById('btn-liftoff-again');
    if (blastBtn) {
      blastBtn.addEventListener('click', () => {
        this.soundSynth.playCountdownBeep(true);
        if (this.elLandingOverlay) this.elLandingOverlay.classList.add('hidden');
        this.physics.launch();
      });
    }
  }

  // Camera Flash Effect
  public triggerPhotoFlash(): void {
    this.soundSynth.playShutter();
    const flash = document.getElementById('photo-flash');
    if (flash) {
      flash.classList.remove('hidden');
      flash.classList.add('active');
      setTimeout(() => {
        flash.classList.remove('active');
        setTimeout(() => flash.classList.add('hidden'), 400);
      }, 50);
    }
  }

  // Show Orbit Achieved celebratory banner
  public showOrbitBanner(): void {
    if (!this.elOrbitBanner) return;
    this.soundSynth.playOrbitAchievedFanfare();
    this.particleEffects.emitCelebration(this.physics.position);
    this.elOrbitBanner.classList.remove('hidden');

    setTimeout(() => {
      if (this.elOrbitBanner) {
        this.elOrbitBanner.classList.add('hidden');
      }
    }, 5500);
  }

  // Show Landing dialogue
  public showLandingDialog(body: CelestialBody): void {
    if (!this.elLandingOverlay) return;
    const title = document.getElementById('landing-title');
    const desc = document.getElementById('landing-desc');
    const flagBtn = document.getElementById('btn-plant-flag');

    if (title) title.textContent = `Touchdown on ${body.config.name}! ${body.config.emoji}`;
    if (desc) desc.textContent = `You made a smooth, safe landing on ${body.config.name}. The cozy astronaut is ready to explore!`;
    if (flagBtn) {
      flagBtn.textContent = '🚩 Plant Flag';
      flagBtn.removeAttribute('disabled');
    }

    this.elLandingOverlay.classList.remove('hidden');
  }

  // Update Telemetry display every frame
  public update(telemetry: FlightTelemetry): void {
    if (this.elSpeed) {
      const speedKmH = Math.round(telemetry.speed * 3.6 * 10);
      this.elSpeed.innerHTML = `${speedKmH} <small>km/h</small>`;
    }

    if (this.elAltitude) {
      if (telemetry.altitude > 1000) {
        const altKm = (telemetry.altitude / 100).toFixed(1);
        this.elAltitude.innerHTML = `${altKm} <small>km</small>`;
      } else {
        const altM = Math.round(telemetry.altitude * 10);
        this.elAltitude.innerHTML = `${altM} <small>m</small>`;
      }
    }

    if (this.elOrbitStatus) {
      if (telemetry.status === 'PAD') {
        this.elOrbitStatus.textContent = 'On Launchpad';
      } else if (telemetry.status === 'LANDED') {
        this.elOrbitStatus.textContent = `Landed on ${telemetry.dominantBodyName}`;
      } else if (telemetry.isOrbit) {
        this.elOrbitStatus.textContent = `Orbiting ${telemetry.dominantBodyName} ✨`;
      } else if (telemetry.altitude < 40) {
        this.elOrbitStatus.textContent = 'Atmosphere Ascent';
      } else {
        this.elOrbitStatus.textContent = 'Deep Space Flight';
      }
    }

    // Toggle staging button visibility
    if (this.elStagingContainer) {
      const canStage = this.physics.assembly.hasBoosters && !this.physics.assembly.boostersStaged && telemetry.status === 'FLYING';
      if (canStage) {
        this.elStagingContainer.classList.remove('hidden');
      } else {
        this.elStagingContainer.classList.add('hidden');
      }
    }
  }
}
