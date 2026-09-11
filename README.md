# OverworldPets 🎮

> **Interactive, floating 3D Minecraft-inspired desktop companions for your workspace.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20Windows%20%7C%20macOS-lightgrey.svg)]()
[![Electron](https://img.shields.io/badge/Electron-34+-47848F.svg)](https://www.electronjs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r185-black.svg)](https://threejs.org/)

---

## Overview

**OverworldPets** brings adorable 3D voxel Minecraft companions to live on your desktop. Built with Electron and Three.js, it uses a lightweight floating mascot architecture so pets never block clicks to your background applications (code editors, browsers, terminals).

### Key Features
* **Real 3D Voxel Meshes**: Crafted with authentic multi-face pixel-art textures and animated parts (e.g. 6 independently swaying tentacles on the Baby Happy Ghast).
* **True Desktop Freedom**: The 160×160 floating window moves natively across your screen. 100% of the rest of your screen remains clickable.
* **Physics Catch & Drag**: Click and drag your pet anywhere across the screen. Watch it tilt into the drag vector and flutter its limbs.
* **Fling Mechanics**: Release with velocity to fling your pet across the desktop with smooth inertial deceleration.
* **Petting Interaction**: Stroke the mascot with your cursor to make it wink and perform a 360° celebration spin.
* **Sound Effects**: Procedural audio synthesis with support for custom `.mp3` / `.wav` sound clips.
* **System Tray Controls**: Hide/show, pause movement, toggle launch at startup, and switch active mobs.

---

## Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (version 18 or higher)
* `npm` (bundled with Node.js)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Rohinthan/OverworldPets.git
   cd OverworldPets
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the mascot:**
   ```bash
   npm start
   ```

---

## Controls & Interactions

| Action | Control | Behavior |
| :--- | :--- | :--- |
| **Catch & Carry** | Left-Click & Hold | Pet makes a surprised face, tilts into movement direction |
| **Fling** | Quick Drag & Release | Pet flies across the screen with inertia |
| **Pet / Stroke** | Rub Cursor over Pet | Pet purrs, winks, and performs a 360° spin |
| **Tray Menu** | Right-Click Tray Icon | Access hide, pause, auto-launch, and mob switcher |

---

## Custom Sound Effects

You can drop your own audio files into `assets/sounds/`:
* `touch.mp3` — Plays when clicking / catching the mascot.
* `rub.mp3` — Plays when stroking the mascot.
* `happy.mp3` — Plays during celebration spins.
* `throw.mp3` — Plays when flinging the pet.

*(If no custom files are provided, built-in procedural sound synthesis is used automatically.)*

---

## Project Structure

```
OverworldPets/
├── assets/                  # Icons and custom sound guides
│   ├── icon.png
│   ├── tray-icon.png
│   └── sounds/README.md
├── renderer/                # Three.js 3D viewport & physics
│   ├── index.html
│   ├── style.css
│   ├── pet.js
│   └── three.module.js
├── main.js                  # Electron main process & tray controller
├── preload.js               # Context isolation IPC bridge
├── package.json
├── LICENSE
└── README.md
```

---

## Legal & Disclaimer

> **NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.**
> 
> *OverworldPets is an open-source fan project created under the [Minecraft Commercial and Brand Usage Guidelines](https://www.minecraft.net/en-us/usage-guidelines). All 3D voxel models and textures are original creations inspired by Minecraft character designs.*

---

## License

This project is licensed under the [MIT License](LICENSE).
