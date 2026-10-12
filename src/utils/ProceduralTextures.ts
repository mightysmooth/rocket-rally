// ProceduralTextures.ts - Canvas-generated high-performance textures
// Zero external image files needed!

import * as THREE from 'three';

export class ProceduralTextures {
  private static cache: Map<string, THREE.CanvasTexture> = new Map();

  // Hearthstone (Home planet) surface texture
  public static createHearthstoneTexture(): THREE.CanvasTexture {
    const key = 'hearthstone';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Deep blue ocean background
    ctx.fillStyle = '#1a5b8c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Lush green & pine continents
    ctx.fillStyle = '#3a7d44';
    for (let i = 0; i < 28; i++) {
      const cx = Math.random() * canvas.width;
      const cy = Math.random() * canvas.height;
      const radius = 60 + Math.random() * 120;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Inner lighter rolling grassy hills
      ctx.fillStyle = '#57a05a';
      ctx.beginPath();
      ctx.arc(cx + (Math.random() - 0.5) * 30, cy + (Math.random() - 0.5) * 30, radius * 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a7d44';
    }

    // Sandy shorelines
    ctx.strokeStyle = '#e9c46a';
    ctx.lineWidth = 4;
    for (let i = 0; i < 15; i++) {
      const cx = Math.random() * canvas.width;
      const cy = Math.random() * canvas.height;
      ctx.beginPath();
      ctx.arc(cx, cy, 50 + Math.random() * 60, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Cozy fluffy white clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let i = 0; i < 18; i++) {
      const cx = Math.random() * canvas.width;
      const cy = 60 + Math.random() * (canvas.height - 120);
      const rx = 50 + Math.random() * 90;
      const ry = 15 + Math.random() * 25;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    this.cache.set(key, texture);
    return texture;
  }

  // Cheesy Cratered Moon texture
  public static createMoonTexture(): THREE.CanvasTexture {
    const key = 'moon';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Pale dusty cream/cheese base
    ctx.fillStyle = '#e8d8b8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Craters with shadows
    for (let i = 0; i < 70; i++) {
      const cx = Math.random() * canvas.width;
      const cy = Math.random() * canvas.height;
      const r = 4 + Math.random() * 24;

      // Outer rim
      ctx.fillStyle = '#d3c2a0';
      ctx.beginPath();
      ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
      ctx.fill();

      // Deep crater shadow
      ctx.fillStyle = '#b5a17e';
      ctx.beginPath();
      ctx.arc(cx - 1, cy - 1, r, 0, Math.PI * 2);
      ctx.fill();

      // Crater inner bowl
      ctx.fillStyle = '#9c8763';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.75, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    this.cache.set(key, texture);
    return texture;
  }

  // Red Mesa (Mars-like canyon world)
  public static createRedMesaTexture(): THREE.CanvasTexture {
    const key = 'red_mesa';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Rust red / terracotta background
    ctx.fillStyle = '#bf432b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Stratified rock layers & dunes
    for (let y = 0; y < canvas.height; y += 8) {
      const shade = Math.sin(y * 0.1) * 20;
      ctx.fillStyle = `rgba(${160 + shade}, ${60 + shade * 0.5}, ${35}, 0.6)`;
      ctx.fillRect(0, y, canvas.width, 6);
    }

    // Canyon rifts
    ctx.strokeStyle = '#6e1d13';
    ctx.lineWidth = 6;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      let cx = Math.random() * canvas.width;
      let cy = 50 + Math.random() * (canvas.height - 100);
      ctx.moveTo(cx, cy);
      for (let s = 0; s < 5; s++) {
        cx += (Math.random() - 0.5) * 80;
        cy += (Math.random() - 0.5) * 40;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    this.cache.set(key, texture);
    return texture;
  }

  // Gigantus (Saturn-like gas giant cloud bands)
  public static createGasGiantTexture(): THREE.CanvasTexture {
    const key = 'gas_giant';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base warm peach
    ctx.fillStyle = '#edd1a6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Swirling atmospheric bands
    const bands = [
      '#d49b6a', '#eedbc5', '#499092', '#58b4b7', '#eedbc5',
      '#e59e60', '#eedbc5', '#3d7b80', '#c97c48', '#f2e5d5'
    ];

    const bandHeight = canvas.height / bands.length;
    for (let i = 0; i < bands.length; i++) {
      const grad = ctx.createLinearGradient(0, i * bandHeight, 0, (i + 1) * bandHeight);
      grad.addColorStop(0, bands[i]);
      grad.addColorStop(1, bands[(i + 1) % bands.length]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, i * bandHeight, canvas.width, bandHeight);
    }

    // Great atmospheric storm swirl (like Jupiter's eye / Saturn's hexagon)
    ctx.fillStyle = 'rgba(230, 100, 50, 0.65)';
    ctx.beginPath();
    ctx.ellipse(350, 280, 75, 45, 0.1, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    this.cache.set(key, texture);
    return texture;
  }

  // Saturn-like Planetary Dust Rings texture
  public static createRingsTexture(): THREE.CanvasTexture {
    const key = 'rings';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1;
    const ctx = canvas.getContext('2d')!;

    // Radial gradient representing density of ring particles
    const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    grad.addColorStop(0.0, 'rgba(240, 220, 180, 0.0)');
    grad.addColorStop(0.15, 'rgba(240, 220, 180, 0.85)');
    grad.addColorStop(0.35, 'rgba(210, 180, 140, 0.7)');
    grad.addColorStop(0.48, 'rgba(100, 90, 70, 0.05)'); // Cassini division gap!
    grad.addColorStop(0.55, 'rgba(230, 210, 170, 0.9)');
    grad.addColorStop(0.85, 'rgba(180, 160, 130, 0.6)');
    grad.addColorStop(1.0, 'rgba(200, 180, 150, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, 1);

    const texture = new THREE.CanvasTexture(canvas);
    this.cache.set(key, texture);
    return texture;
  }

  // Frostmoon (Ice moon) texture
  public static createFrostmoonTexture(): THREE.CanvasTexture {
    const key = 'frostmoon';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Pale icy cyan base
    ctx.fillStyle = '#d0f0fd';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Deep blue icy fissures & cracks
    ctx.strokeStyle = '#3a86c8';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 25; i++) {
      ctx.beginPath();
      let cx = Math.random() * canvas.width;
      let cy = Math.random() * canvas.height;
      ctx.moveTo(cx, cy);
      for (let s = 0; s < 4; s++) {
        cx += (Math.random() - 0.5) * 60;
        cy += (Math.random() - 0.5) * 40;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    // Sparkling white frost frostings
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 35; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 3 + Math.random() * 8, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    this.cache.set(key, texture);
    return texture;
  }

  // Rocket Style Patterns: Candy Stripes
  public static createCandyStripeTexture(): THREE.CanvasTexture {
    const key = 'candy_stripe';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#f1faee';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#e63946';
    const stripeWidth = 32;
    for (let x = -canvas.height; x < canvas.width + canvas.height; x += stripeWidth * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + stripeWidth, 0);
      ctx.lineTo(x + stripeWidth + canvas.height, canvas.height);
      ctx.lineTo(x + canvas.height, canvas.height);
      ctx.closePath();
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set(key, texture);
    return texture;
  }

  // Rocket Style Patterns: Outer Wilds Rustic Timber Planks
  public static createTimberTexture(): THREE.CanvasTexture {
    const key = 'timber';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Rich pine/cedar wood brown
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Vertical plank lines
    ctx.strokeStyle = '#5c3a1e';
    ctx.lineWidth = 3;
    const plankWidth = 32;
    for (let x = 0; x <= canvas.width; x += plankWidth) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();

      // Brass rivets / bolts
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.arc(x + plankWidth / 2, 24, 3, 0, Math.PI * 2);
      ctx.arc(x + plankWidth / 2, canvas.height - 24, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Horizontal metal bands
    ctx.fillStyle = '#b87333'; // Copper/brass band
    ctx.fillRect(0, 16, canvas.width, 16);
    ctx.fillRect(0, canvas.height - 32, canvas.width, 16);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set(key, texture);
    return texture;
  }

  // Cosmic Decal / Star Pattern
  public static createCosmicPatternTexture(): THREE.CanvasTexture {
    const key = 'cosmic';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#2a9d8f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Yellow star decals
    ctx.fillStyle = '#ffd166';
    for (let i = 0; i < 12; i++) {
      const cx = Math.random() * canvas.width;
      const cy = Math.random() * canvas.height;
      this.drawStar(ctx, cx, cy, 5, 10, 4);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set(key, texture);
    return texture;
  }

  private static drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): void {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }
}
