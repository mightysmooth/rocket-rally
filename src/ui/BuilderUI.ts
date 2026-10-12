// BuilderUI.ts - Rocket Customizer & Assembly Tray
import { RocketAssembly } from '../rocket/RocketAssembly';
import { RocketPartRegistry, PartCategory } from '../rocket/RocketPart';
import { SoundSynth } from '../audio/SoundSynth';

export class BuilderUI {
  private assembly: RocketAssembly;
  private soundSynth: SoundSynth;
  private currentCategory: PartCategory = 'capsule';
  private onLaunchCallback: (() => void) | null = null;

  private cuteNames: string[] = [
    'Little Wanderer', 'Campfire 1', 'Star Biscuit', 'Pine Cone',
    'Cosmic Otter', 'Marshmallow Hop', 'Solar Bug', 'Moon Hopper',
    'Timber Belle', 'Rusty Comet', 'Starlight Pup', 'Firefly Express',
    'Outer Spud', 'Cosmo Cheerio', 'Pocket Rocket'
  ];

  constructor(assembly: RocketAssembly, soundSynth: SoundSynth) {
    this.assembly = assembly;
    this.soundSynth = soundSynth;

    this.setupCategoryTabs();
    this.setupCustomizationBar();
    this.setupActions();
    this.renderPartsTray();
  }

  public setOnLaunch(cb: () => void): void {
    this.onLaunchCallback = cb;
  }

  private setupCategoryTabs(): void {
    const tabs = document.querySelectorAll('.parts-category-tabs .tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentCategory = (tab.getAttribute('data-category') || 'capsule') as PartCategory;
        this.soundSynth.playClick();
        this.renderPartsTray();
      });
    });
  }

  private setupCustomizationBar(): void {
    // Name input
    const nameInput = document.getElementById('rocket-name-input') as HTMLInputElement;
    if (nameInput) {
      nameInput.addEventListener('input', () => {
        this.assembly.setName(nameInput.value.trim() || 'Little Wanderer');
      });
    }

    // Random Name button
    const randBtn = document.getElementById('btn-random-name');
    if (randBtn) {
      randBtn.addEventListener('click', () => {
        const randName = this.cuteNames[Math.floor(Math.random() * this.cuteNames.length)];
        if (nameInput) nameInput.value = randName;
        this.assembly.setName(randName);
        this.soundSynth.playClick();
      });
    }

    // Theme swatches
    const swatches = document.querySelectorAll('.color-swatch');
    swatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        swatches.forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        const theme = swatch.getAttribute('data-theme') || 'campfire';
        this.assembly.setTheme(theme);
        this.soundSynth.playSnap();
      });
    });
  }

  private setupActions(): void {
    // Reset Rocket
    const resetBtn = document.getElementById('btn-clear-rocket');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.assembly.config = {
          name: 'Little Wanderer',
          theme: 'campfire',
          capsuleId: 'capsule_astronaut',
          tankId: 'tank_timber',
          engineId: 'engine_firecracker',
          boosterId: null,
          wingsId: 'wings_delta',
          gadgetId: 'gadget_duck'
        };
        this.assembly.rebuild();
        this.soundSynth.playSnap();
        this.renderPartsTray();
      });
    }

    // Big Launch Button
    const launchBtn = document.getElementById('btn-launch');
    if (launchBtn) {
      launchBtn.addEventListener('click', () => {
        this.soundSynth.playClick();
        if (this.onLaunchCallback) {
          this.onLaunchCallback();
        }
      });
    }
  }

  // Populate part cards for currently active category
  public renderPartsTray(): void {
    const tray = document.getElementById('parts-tray');
    if (!tray) return;

    tray.innerHTML = '';
    const parts = RocketPartRegistry.getByCategory(this.currentCategory);

    parts.forEach(part => {
      const card = document.createElement('div');
      card.className = 'part-card';

      // Check if equipped
      let isEquipped = false;
      if (this.currentCategory === 'capsule') isEquipped = this.assembly.config.capsuleId === part.id;
      else if (this.currentCategory === 'tank') isEquipped = this.assembly.config.tankId === part.id;
      else if (this.currentCategory === 'engine') isEquipped = this.assembly.config.engineId === part.id;
      else if (this.currentCategory === 'booster') isEquipped = this.assembly.config.boosterId === part.id;
      else if (this.currentCategory === 'wings') isEquipped = this.assembly.config.wingsId === part.id;
      else if (this.currentCategory === 'gadget') isEquipped = this.assembly.config.gadgetId === part.id;

      if (isEquipped) {
        card.classList.add('equipped');
      }

      card.innerHTML = `
        <div class="part-icon">${part.icon}</div>
        <div class="part-name">${part.name}</div>
        <div class="part-stat">${part.thrust > 0 ? `🔥 +${part.thrust}` : `⚖️ ${part.mass}t`}</div>
      `;

      card.addEventListener('click', () => {
        // Toggle or equip
        if (this.currentCategory === 'booster' || this.currentCategory === 'wings' || this.currentCategory === 'gadget') {
          if (isEquipped) {
            this.assembly.setPart(this.currentCategory, null);
          } else {
            this.assembly.setPart(this.currentCategory, part.id);
          }
        } else {
          this.assembly.setPart(this.currentCategory, part.id);
        }

        this.soundSynth.playSnap();
        this.renderPartsTray();
      });

      tray.appendChild(card);
    });
  }
}
