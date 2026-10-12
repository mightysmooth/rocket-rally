// ScrapbookUI.ts - Collectible Space Badges & Polaroid Photo Album
import { SoundSynth } from '../audio/SoundSynth';

export interface Badge {
  id: string;
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
}

export interface PolaroidPhoto {
  id: string;
  dataUrl: string;
  caption: string;
  timestamp: string;
}

export class ScrapbookUI {
  private soundSynth: SoundSynth;
  private badges: Map<string, Badge> = new Map();
  private photos: PolaroidPhoto[] = [];

  constructor(soundSynth: SoundSynth) {
    this.soundSynth = soundSynth;
    this.initBadges();
    this.loadFromStorage();
    this.setupModalControls();
    this.render();
  }

  private initBadges(): void {
    const list: Badge[] = [
      { id: 'liftoff', icon: '🌟', title: 'Liftoff!', description: 'Launched into the sky from the launch pad.', unlocked: false },
      { id: 'orbit', icon: '🌀', title: 'Space Loop', description: 'Reached a smooth orbit around the planet!', unlocked: false },
      { id: 'staging', icon: '💥', title: 'Booster Pop', description: 'Staged and dropped side boosters in flight.', unlocked: false },
      { id: 'moon', icon: '🧀', title: 'Cheesy Visitor', description: 'Made a soft touchdown on Cheesy Moon.', unlocked: false },
      { id: 'red_mesa', icon: '🏜️', title: 'Canyon Cruiser', description: 'Explored the canyons of Red Mesa.', unlocked: false },
      { id: 'rings', icon: '🪐', title: 'Ring Rider', description: 'Flew through the glittering rings of Gigantus.', unlocked: false },
      { id: 'frost', icon: '❄️', title: 'Ice Spike Hopper', description: 'Landed safely on crystal Frostmoon.', unlocked: false },
      { id: 'photographer', icon: '📸', title: 'Star Photographer', description: 'Snapped a polaroid memory of your journey.', unlocked: false }
    ];

    list.forEach(b => this.badges.set(b.id, b));
  }

  private loadFromStorage(): void {
    try {
      const savedBadges = localStorage.getItem('rocket_rally_badges');
      if (savedBadges) {
        const ids: string[] = JSON.parse(savedBadges);
        ids.forEach(id => {
          const b = this.badges.get(id);
          if (b) b.unlocked = true;
        });
      }

      const savedPhotos = localStorage.getItem('rocket_rally_photos');
      if (savedPhotos) {
        this.photos = JSON.parse(savedPhotos);
      }
    } catch (e) {
      console.warn('Storage unavailable:', e);
    }
  }

  private saveToStorage(): void {
    try {
      const unlockedIds = Array.from(this.badges.values())
        .filter(b => b.unlocked)
        .map(b => b.id);
      localStorage.setItem('rocket_rally_badges', JSON.stringify(unlockedIds));

      // Limit stored photos to last 6 to save localStorage quota
      const photoSlice = this.photos.slice(-6);
      localStorage.setItem('rocket_rally_photos', JSON.stringify(photoSlice));
    } catch (e) {
      console.warn('Failed saving to storage:', e);
    }
  }

  public unlockBadge(id: string): void {
    const badge = this.badges.get(id);
    if (!badge || badge.unlocked) return;

    badge.unlocked = true;
    this.soundSynth.playFlagPlant();
    this.saveToStorage();
    this.render();
  }

  public addPhoto(dataUrl: string, caption: string): void {
    const newPhoto: PolaroidPhoto = {
      id: 'photo_' + Date.now(),
      dataUrl,
      caption,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    this.photos.unshift(newPhoto);
    this.unlockBadge('photographer');
    this.saveToStorage();
    this.render();
  }

  private setupModalControls(): void {
    const modal = document.getElementById('scrapbook-modal');
    const openBtn = document.getElementById('btn-scrapbook');
    const closeBtn = document.getElementById('btn-close-scrapbook');
    const tabBadges = document.getElementById('tab-badges');
    const tabPhotos = document.getElementById('tab-photos');
    const gridBadges = document.getElementById('badges-grid');
    const gridPhotos = document.getElementById('photos-grid');

    const closeModal = () => {
      if (modal) {
        modal.classList.add('hidden');
        this.soundSynth.playClick();
      }
    };

    const openModal = () => {
      if (modal) {
        modal.classList.remove('hidden');
        this.soundSynth.playClick();
        this.render();
      }
    };

    if (openBtn) {
      openBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openModal();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeModal();
      });
    }

    // Close when tapping outside the dialog on the backdrop
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal();
        }
      });
    }

    // Close with Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
        closeModal();
      }
    });

    if (tabBadges && tabPhotos && gridBadges && gridPhotos) {
      tabBadges.addEventListener('click', () => {
        tabBadges.classList.add('active');
        tabPhotos.classList.remove('active');
        gridBadges.classList.remove('hidden');
        gridPhotos.classList.add('hidden');
        this.soundSynth.playClick();
      });

      tabPhotos.addEventListener('click', () => {
        tabPhotos.classList.add('active');
        tabBadges.classList.remove('active');
        gridPhotos.classList.remove('hidden');
        gridBadges.classList.add('hidden');
        this.soundSynth.playClick();
      });
    }
  }

  public render(): void {
    // 1. Update top bar badge count
    const countEl = document.getElementById('badge-count');
    const unlockedCount = Array.from(this.badges.values()).filter(b => b.unlocked).length;
    if (countEl) {
      countEl.textContent = `${unlockedCount}/${this.badges.size}`;
    }

    // 2. Render badges grid
    const grid = document.getElementById('badges-grid');
    if (grid) {
      grid.innerHTML = '';
      this.badges.forEach(b => {
        const card = document.createElement('div');
        card.className = `badge-card ${b.unlocked ? 'unlocked' : ''}`;
        card.innerHTML = `
          <div class="badge-icon">${b.icon}</div>
          <div class="badge-title">${b.title}</div>
          <div class="badge-desc">${b.description}</div>
        `;
        grid.appendChild(card);
      });
    }

    // 3. Render photos grid
    const photosGrid = document.getElementById('photos-grid');
    if (photosGrid) {
      photosGrid.innerHTML = '';
      if (this.photos.length === 0) {
        photosGrid.innerHTML = '<p class="empty-photos-msg">No photos snapped yet! Press the 📸 camera button anytime during flight to capture cool polaroids!</p>';
      } else {
        this.photos.forEach(p => {
          const pol = document.createElement('div');
          pol.className = 'polaroid-card';
          pol.innerHTML = `
            <img class="polaroid-img" src="${p.dataUrl}" alt="Space Polaroid" />
            <div class="polaroid-caption">${p.caption} (${p.timestamp})</div>
          `;
          photosGrid.appendChild(pol);
        });
      }
    }
  }
}

