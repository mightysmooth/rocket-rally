# Rocket Rally 🚀✨
> **A tactile, Outer-Wilds-inspired, mobile- and kid-friendly 3D space adventure built with Three.js and TypeScript.**

Hosted directly on **GitHub Pages**, **Rocket Rally** brings the thrill of *Kerbal Space Program*’s rocket building and orbital trajectory exploration to younger kids (ages 5+) and space dreamers of all ages, wrapped in the cozy, wistful, banjo-strumming campfire warmth of *Outer Wilds*.

---

## 🌌 Highlights & Features

### 🛠️ 1. Frictionless Rocket Assembly (VAB)
- **Kid-Friendly Snapping**: Tap or drag parts to assemble your dream rocket in seconds.
- **Juicy Modular Parts**:
  - **Capsules**: Bubble Cosmonaut (with friendly astronaut inside!), Cosmo Pup Pod, Frontier Tin Can.
  - **Fuel Fuselages**: Candy Striper, Rustic Timber Barrel with copper rivets, Cosmic Star Tank.
  - **Thrusters**: Sparky Firecracker Engine, Neon Cyan Plasma Torch, Thunderous Big Boomer.
  - **Aero & Boosters**: Delta Fins, Solar Dragonfly Wings, Twin Strap-On Solid Boosters with explosive decouplers.
  - **Playful Toys**: The essential Lucky Rubber Ducky hood ornament 🦆 and cozy Campfire Lantern 🏮.
- **Styles & Customization**: Instant color theme switching (Campfire Timber, Cosmic Emerald, Candy Stripes, Neon Comet) and a fun rocket name generator!

### 🪐 2. Outer Wilds Miniature Solar System
Explore a handcrafted pocket solar system scaled for adventure:
- **☀️ The Sun (Hearthfire)**: Central warm star casting soft sunlight and lens flares across space.
- **🌍 Hearthstone (Home Planet)**: Blue skies, green pine forests, cozy wooden launch tower, and a crackling campfire.
- **🧀 Cheesy Moon**: Dusty, low-gravity tidally locked moon with cheese craters and a flag landing zone.
- **🏜️ Red Mesa**: Martian canyons, rolling red dust, and an ancient miniature rover with solar panels.
- **🪐 Gigantus**: Majestic gas giant with cream and turquoise cloud bands and a wide, translucent ring system you can skim through.
- **❄️ Frostmoon**: Deep blue ice moon orbiting Gigantus with glowing ice spires and steam geysers.
- **☄️ Wild Comet**: Fast-zooming nomad comet with a glowing nucleus and sparkling ion tail.

### 🚀 3. Orbital Mechanics Simplified for 5-Year-Olds
- **Real-Time 3D Trajectory Ribbon**: Projects future flight path in vibrant colors. As you accelerate sideways, watch the trajectory loop around the planet and lock into a golden orbit with celebratory fanfare!
- **Zero-Frustration Physics**:
  - No fuel starvation anxiety or punishing instant explosions.
  - **Kid-Friendly Cartoon Bounce**: If coming in too fast onto a planet surface, the rocket bounces softly with a comic *boing!* and dust puffs instead of blowing up!
  - **Smart Guidance Autopilot**: One-tap buttons for `⏩ Faster (Orbit)`, `⏪ Slow Down`, and `🎯 Aim Target` so kids can navigate without complex orbital math.
  - **Big Tactile Staging**: Pop off side boosters with an explosive confetti burst and metallic clank!
  - **Smooth Time Warp**: 1x, 2x, 5x, 20x, 100x speeds for fast-forwarding interplanetary transfers.

### 🎶 4. Procedural Campfire Audio Engine
- **100% Procedural Web Audio API**: Zero external audio downloads, zero 404s, works completely offline!
- **Campfire Banjo & Acoustic Folk**: Karplus-Strong physical modeling synthesizing warm fingerpicked folk arpeggios in D Major / Mixolydian.
- **Wistful Traveler Whistling**: Gentle wandering lead melody evocative of the Outer Wilds campfire.
- **Atmospheric Soundscape**: Crackling fireplace embers, wind rustle, rocket engine roar, stage separation pops, and triumphant landing chimes.

### 📸 5. Space Badges & Polaroid Scrapbook
- Collect **8 Space Badges** (*Liftoff!*, *Space Loop*, *Booster Pop*, *Cheesy Visitor*, *Canyon Cruiser*, *Ring Rider*, *Ice Spike Hopper*, *Star Photographer*).
- **Polaroid Camera Mode**: Tap 📸 anytime during flight to capture genuine in-game snapshots saved straight to your personal astronaut album!

---

## 🕹️ Controls

| Control | Mobile Touch | Keyboard / Mouse |
|---|---|---|
| **Boost / Thrust** | Hold or tap giant 🔥 **BOOST** button | `Space` or `Shift` |
| **Cruise Lock** | Tap 🔒 **Cruise** toggle | `C` |
| **Pitch & Yaw Steering** | Virtual D-Pad (▲, ▼, ◀, ▶) | `W`, `S`, `A`, `D` or Arrow Keys |
| **Booster Staging** | Big 💥 **DROP BOOSTERS!** button | `X` |
| **Camera Views** | 🚀 Close / 🧑‍🚀 Inside / 🗺️ Map / 🪐 Planet | Click camera switcher bar |
| **Camera Orbit** | Single-finger drag on background | Left-click drag |
| **Camera Zoom** | Two-finger pinch | Mouse scroll wheel |
| **Time Warp** | Tap 1x, 2x, 5x, 20x, 100x | Number keys `1` – `5` |

---

## 💻 Development & Local Setup

### Prerequisites
- Node.js (v18+)
- npm

### Quick Start
```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build for production (GitHub Pages)
npm run build

# 4. Preview production build locally
npm run preview
```

---

## 🚀 GitHub Pages Deployment

The repository includes a ready-to-run GitHub Actions workflow (`.github/workflows/deploy.yml`):
1. Push your repository to GitHub (`main` or `master` branch).
2. Go to **Settings > Pages** in your GitHub repository.
3. Under **Build and deployment > Source**, select **GitHub Actions**.
4. GitHub Actions will automatically compile the TypeScript bundle and publish to `https://<your-username>.github.io/<repo-name>/`!

---

## 📄 License
MIT License. Built with love for curious kids and cozy space explorers everywhere. 🚀✨

