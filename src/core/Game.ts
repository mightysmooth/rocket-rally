// Game.ts - Core Game Orchestrator & State Flow
import * as THREE from 'three';
import { SolarSystem } from '../celestial/SolarSystem';
import { RocketAssembly } from '../rocket/RocketAssembly';
import { RocketPhysics } from '../rocket/RocketPhysics';
import { ParticleEffects } from '../rocket/ParticleEffects';
import { TrajectoryRenderer } from '../celestial/TrajectoryRenderer';
import { CameraManager } from './CameraManager';
import { InputManager } from './InputManager';
import { SoundSynth } from '../audio/SoundSynth';
import { BanjoFolkMusic } from '../audio/BanjoFolkMusic';
import { BuilderUI } from '../ui/BuilderUI';
import { FlightHUD } from '../ui/FlightHUD';
import { ScrapbookUI } from '../ui/ScrapbookUI';

export type GameState = 'BUILDER' | 'COUNTDOWN' | 'FLIGHT';

export class Game {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  // Subsystems
  public solarSystem: SolarSystem;
  public rocketAssembly: RocketAssembly;
  public rocketPhysics: RocketPhysics;
  public particleEffects: ParticleEffects;
  public trajectoryRenderer: TrajectoryRenderer;
  public cameraManager: CameraManager;
  public inputManager: InputManager;
  public soundSynth: SoundSynth;
  public folkMusic: BanjoFolkMusic;

  // UI Systems
  public builderUI: BuilderUI;
  public flightHUD: FlightHUD;
  public scrapbookUI: ScrapbookUI;

  // Game flow
  public state: GameState = 'BUILDER';
  private lastTime: number = 0;
  private audioInitialized: boolean = false;

  constructor(container: HTMLElement) {
    // 1. WebGL Renderer with pixel ratio capping for mobile performance
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true // Required for Polaroid canvas snapshots!
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    container.appendChild(this.renderer.domElement);

    // 2. Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.5, 12000);

    // 3. Audio Engines
    this.soundSynth = new SoundSynth();
    this.folkMusic = new BanjoFolkMusic();

    // 4. Game Entities
    this.solarSystem = new SolarSystem(this.scene);
    this.particleEffects = new ParticleEffects(this.scene);
    this.rocketAssembly = new RocketAssembly();
    this.scene.add(this.rocketAssembly.group);

    this.rocketPhysics = new RocketPhysics(this.rocketAssembly, this.solarSystem, this.particleEffects);
    this.trajectoryRenderer = new TrajectoryRenderer(this.scene, this.solarSystem);
    this.cameraManager = new CameraManager(this.camera);
    this.inputManager = new InputManager(this.rocketPhysics);

    // 5. UI Layers
    this.builderUI = new BuilderUI(this.rocketAssembly, this.soundSynth);
    this.flightHUD = new FlightHUD(
      this.rocketPhysics,
      this.cameraManager,
      this.solarSystem,
      this.soundSynth,
      this.particleEffects
    );
    this.scrapbookUI = new ScrapbookUI(this.soundSynth);

    // 6. Connect callbacks and listeners
    this.wireCallbacks();
    this.setupWindowResize();
    this.setupAudioTrigger();

    // Initial state: Assembly Hangar
    this.enterBuilder();

    // Start render loop
    requestAnimationFrame((t) => this.loop(t));
  }

  private wireCallbacks(): void {
    // Launch button clicked in builder
    this.builderUI.setOnLaunch(() => {
      this.startCountdown();
    });

    // Back to builder button clicked in flight HUD
    this.flightHUD.onReturnToBuilder = () => {
      this.enterBuilder();
    };

    // Re-launch button
    this.flightHUD.onRelaunch = () => {
      this.rocketPhysics.resetToLaunchPad();
      this.startCountdown();
    };

    // Take photo snapshot
    this.flightHUD.onTakeSnapshot = () => {
      this.captureSnapshot();
    };

    // Staging trigger from InputManager
    this.inputManager.onStageTrigger = () => {
      this.flightHUD.triggerStage();
      this.scrapbookUI.unlockBadge('staging');
    };

    // Time warp keyboard shortcuts
    this.inputManager.onTimeWarpChange = (warp) => {
      this.flightHUD.setTimeWarp(warp);
    };

    // Orbit achieved event
    this.rocketPhysics.onOrbitAchieved = () => {
      this.flightHUD.showOrbitBanner();
      this.scrapbookUI.unlockBadge('orbit');
    };

    // Touchdown landing event
    this.rocketPhysics.onTouchdown = (body) => {
      this.soundSynth.playCountdownBeep(true);
      this.flightHUD.showLandingDialog(body);

      // Unlock badges based on destination
      if (body.config.id === 'moon') this.scrapbookUI.unlockBadge('moon');
      else if (body.config.id === 'red_mesa') this.scrapbookUI.unlockBadge('red_mesa');
      else if (body.config.id === 'frostmoon') this.scrapbookUI.unlockBadge('frost');
    };

    // Bounce event
    this.rocketPhysics.onBounce = () => {
      this.soundSynth.playBounceBoing();
    };
  }

  // Audio initialization on first user tap/click
  private setupAudioTrigger(): void {
    const initAudio = () => {
      if (this.audioInitialized) return;
      this.audioInitialized = true;
      this.soundSynth.init();
      const ctx = this.soundSynth.getContext();
      const master = this.soundSynth.getMasterGain();
      if (ctx && master) {
        this.folkMusic.init(ctx, master);
        this.folkMusic.start();
      }
      window.removeEventListener('pointerdown', initAudio);
      window.removeEventListener('keydown', initAudio);
    };

    window.addEventListener('pointerdown', initAudio, { once: false });
    window.addEventListener('keydown', initAudio, { once: false });

    // Audio Mute button in top bar
    const audioBtn = document.getElementById('btn-audio');
    const audioIcon = document.getElementById('audio-icon');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        initAudio();
        const muted = this.soundSynth.toggleMute();
        if (audioIcon) {
          audioIcon.textContent = muted ? '🔇' : '🎵';
        }
      });
    }
  }

  private setupWindowResize(): void {
    window.addEventListener('resize', () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    });
  }

  // State: Assembly Hangar
  public enterBuilder(): void {
    this.state = 'BUILDER';
    this.rocketPhysics.resetToLaunchPad();
    this.cameraManager.setMode('BUILDER');
    this.trajectoryRenderer.setVisible(false);

    // Update Overlays
    const builderOverlay = document.getElementById('builder-overlay');
    const flightOverlay = document.getElementById('flight-overlay');
    const landingOverlay = document.getElementById('landing-overlay');
    const countdownOverlay = document.getElementById('countdown-overlay');
    const statusText = document.getElementById('status-text');

    if (builderOverlay) builderOverlay.classList.remove('hidden');
    if (flightOverlay) flightOverlay.classList.add('hidden');
    if (landingOverlay) landingOverlay.classList.add('hidden');
    if (countdownOverlay) countdownOverlay.classList.add('hidden');
    if (statusText) statusText.textContent = 'Assembly Hangar';

    this.builderUI.renderPartsTray();
  }

  // State: Launch Countdown (3.. 2.. 1.. Liftoff!)
  public startCountdown(): void {
    this.state = 'COUNTDOWN';
    this.cameraManager.setMode('ROCKET');

    const builderOverlay = document.getElementById('builder-overlay');
    const countdownOverlay = document.getElementById('countdown-overlay');
    const countNum = document.getElementById('countdown-number');
    const statusText = document.getElementById('status-text');

    if (builderOverlay) builderOverlay.classList.add('hidden');
    if (countdownOverlay) countdownOverlay.classList.remove('hidden');
    if (statusText) statusText.textContent = 'Counting Down...';

    let count = 3;
    if (countNum) countNum.textContent = count.toString();
    this.soundSynth.playCountdownBeep(false);

    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        if (countNum) countNum.textContent = count.toString();
        this.soundSynth.playCountdownBeep(false);
      } else {
        clearInterval(timer);
        if (countNum) countNum.textContent = '🚀';
        this.soundSynth.playCountdownBeep(true);
        setTimeout(() => {
          if (countdownOverlay) countdownOverlay.classList.add('hidden');
          this.enterFlight();
        }, 500);
      }
    }, 900);
  }

  // State: Flight in Space
  public enterFlight(): void {
    this.state = 'FLIGHT';
    this.rocketPhysics.launch();
    this.trajectoryRenderer.setVisible(true);
    this.scrapbookUI.unlockBadge('liftoff');

    const flightOverlay = document.getElementById('flight-overlay');
    const statusText = document.getElementById('status-text');
    if (flightOverlay) flightOverlay.classList.remove('hidden');
    if (statusText) statusText.textContent = 'In Flight';
  }

  // Capture Polaroid Photo
  private captureSnapshot(): void {
    // Render current frame cleanly
    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.renderer.domElement.toDataURL('image/jpeg', 0.85);

    const planetName = this.rocketPhysics.currentDominant.config.name;
    const rocketName = this.rocketAssembly.config.name;
    const caption = `${rocketName} at ${planetName}`;

    this.scrapbookUI.addPhoto(dataUrl, caption);
  }

  // Check ring skim badge
  private checkRingSkim(): void {
    const gigantus = this.solarSystem.getBody('gigantus');
    if (gigantus) {
      const dist = this.rocketPhysics.position.distanceTo(gigantus.position);
      // Gigantus rings are from 160 to 310
      if (dist >= 160 && dist <= 310 && Math.abs(this.rocketPhysics.position.y - gigantus.position.y) < 20) {
        this.scrapbookUI.unlockBadge('rings');
      }
    }
  }

  // Main Animation Loop
  private loop(now: number): void {
    requestAnimationFrame((t) => this.loop(t));

    if (this.lastTime === 0) {
      this.lastTime = now;
      return;
    }
    const dt = Math.min(0.08, (now - this.lastTime) / 1000);
    this.lastTime = now;

    // 1. Celestial Bodies Orbit
    // When in flight, solar system advances with time warp
    const solarWarp = this.state === 'FLIGHT' ? this.rocketPhysics.timeWarp : 1.0;
    this.solarSystem.update(dt * solarWarp);

    // 2. User Input & Physics
    if (this.state === 'FLIGHT') {
      this.inputManager.update(dt);
      this.rocketPhysics.update(dt);
      this.checkRingSkim();

      // Sound engine volume responds to throttle
      this.soundSynth.updateRocketEngine(this.rocketPhysics.throttle);

      // Trajectory Prediction
      this.trajectoryRenderer.calculateTrajectory(
        this.rocketPhysics.position,
        this.rocketPhysics.velocity,
        this.rocketPhysics.targetBodyId
      );

      // HUD updates
      const telemetry = this.rocketPhysics.getTelemetry();
      this.flightHUD.update(telemetry);
    } else {
      this.soundSynth.updateRocketEngine(0);
      this.rocketPhysics.update(dt);
    }

    // 3. Particles
    this.particleEffects.update(dt * solarWarp);

    // 4. Camera Transitions
    this.cameraManager.update(dt, this.rocketPhysics, this.solarSystem);

    // 5. Render Scene
    this.renderer.render(this.scene, this.camera);
  }
}

