import Phaser from 'phaser';
import { WFC } from './wfc.js';
import { TILES, ADJACENCY_RULES } from './tileConfig.js';

export class MapScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MapScene' });
        this.mapWidth = 20;
        this.mapHeight = 15;
        this.tileSize = 32;
        this.tileSprites = [];      // flat list for cleanup
        this.spriteGrid = [];       // 2D grid [y][x] for per-cell updates
        this.generationId = 0;      // prevents stale async callbacks
        this.generating = false;
        this.animSpeed = 20;         // ms delay between steps
        this.showEntropy = false;    // entropy overlay toggle
        this.entropyTexts = [];      // text objects for entropy display
    }

    preload() {
        // Load all tile images
        TILES.forEach(tileName => {
            this.load.image(tileName, `Summer/${tileName}.png`);
        });
    }

    create() {
        // Title text
        this.titleText = this.add.text(400, 20, 'Wave Function Collapse Map Generator', {
            fontSize: '24px',
            fill: '#f5d9ff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Instructions
        this.instructionText = this.add.text(400, 50, 'Press R to regenerate', {
            fontSize: '14px',
            fill: '#c9a3ff'
        }).setOrigin(0.5);

        // --- Speed slider (HTML overlay) ---
        this.createSpeedSlider();

        // --- Entropy toggle button (HTML overlay) ---
        this.createEntropyButton();

        // Set up input
        this.input.keyboard.on('keydown-R', () => {
            this.generateMap();
        });

        // Generate initial map
        this.generateMap();
    }

    async generateMap() {
        if (this.generating) return; // ignore R spam while animating
        this.generating = true;

        // Clear existing sprites
        this.clearMap();

        // Bump generation ID so stale callbacks from retries are ignored
        this.generationId++;
        const myGenId = this.generationId;

        // Calculate centering offset
        const mapPixelWidth = this.mapWidth * this.tileSize;
        const mapPixelHeight = this.mapHeight * this.tileSize;
        this.offsetX = (800 - mapPixelWidth) / 2;
        this.offsetY = (600 - mapPixelHeight) / 2 + 20;

        // Create WFC instance
        const wfc = new WFC(this.mapWidth, this.mapHeight, TILES, ADJACENCY_RULES);

        // Generate with animation
        await wfc.generateAnimated(
            // onTilePlaced — render one tile
            (x, y, tileName) => {
                if (this.generationId !== myGenId) return;
                this.placeTile(x, y, tileName);
            },
            // onRetry — clear the board for a fresh attempt
            (attempt) => {
                if (this.generationId !== myGenId) return;
                this.clearMap();
            },
            () => this.animSpeed,  // live-read current speed
            // onWaveUpdate — update entropy overlay
            (wave) => {
                if (this.generationId !== myGenId) return;
                this.updateEntropyOverlay(wave);
            }
        );

        this.generating = false;
    }

    placeTile(x, y, tileName) {
        const px = this.offsetX + x * this.tileSize;
        const py = this.offsetY + y * this.tileSize;

        // Destroy previous sprite at this position if any
        if (this.spriteGrid[y]?.[x]) {
            this.spriteGrid[y][x].destroy();
        }

        const sprite = this.add.image(px, py, tileName);
        sprite.setOrigin(0, 0);
        sprite.setDisplaySize(this.tileSize, this.tileSize);

        if (!this.spriteGrid[y]) this.spriteGrid[y] = [];
        this.spriteGrid[y][x] = sprite;
        this.tileSprites.push(sprite);
    }

    clearMap() {
        this.tileSprites.forEach(sprite => sprite.destroy());
        this.tileSprites = [];
        this.spriteGrid = [];
        this.clearEntropyOverlay();
    }

    // --- Entropy overlay ---

    updateEntropyOverlay(wave) {
        this.clearEntropyOverlay();
        if (!this.showEntropy) return;

        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const size = wave[y][x].size;
                if (size > 1) {
                    const px = this.offsetX + x * this.tileSize + this.tileSize / 2;
                    const py = this.offsetY + y * this.tileSize + this.tileSize / 2;

                    // Background square
                    const bg = this.add.rectangle(px, py, this.tileSize, this.tileSize, 0x050008, 0.75);
                    this.entropyTexts.push(bg);

                    // Color from bright lavender (low entropy) to magenta (high entropy)
                    const maxEntropy = TILES.length;
                    const t = (size - 2) / (maxEntropy - 2);
                    const r = Math.floor(246 + 9 * t);   // 246->255
                    const g = Math.floor(225 - 166 * t); // 225->59
                    const b = Math.floor(255 - 43 * t);  // 255->212
                    const color = `rgb(${r},${g},${b})`;

                    const txt = this.add.text(px, py, `${size}`, {
                        fontSize: '14px',
                        fill: color,
                        fontStyle: 'bold'
                    }).setOrigin(0.5);
                    this.entropyTexts.push(txt);
                }
            }
        }
    }

    clearEntropyOverlay() {
        this.entropyTexts.forEach(obj => obj.destroy());
        this.entropyTexts = [];
    }

    // --- HTML UI elements ---

    createSpeedSlider() {
        const canvas = this.game.canvas;
        const parent = canvas.parentElement;

        const container = document.createElement('div');
        container.style.cssText = 'display:flex; align-items:center; gap:8px; position:absolute; bottom:8px; right:12px; color:#e6ccff; font:14px Arial;';
        container.innerHTML = `
            <span>Speed:</span>
            <input type="range" min="0" max="7" value="3" style="width:120px; accent-color:#c77dff; cursor:pointer;">
        `;
        parent.style.position = 'relative';
        parent.appendChild(container);

        const slider = container.querySelector('input');
        const speeds = [200, 100, 50, 20, 10, 5, 1, 0]; // left=slow, right=fast

        slider.addEventListener('input', () => {
            this.animSpeed = speeds[parseInt(slider.value)];
        });

        this.speedSliderContainer = container;
    }

    createEntropyButton() {
        const canvas = this.game.canvas;
        const parent = canvas.parentElement;

        const btn = document.createElement('button');
        btn.textContent = 'View Entropy';
        btn.style.cssText = 'position:absolute; bottom:8px; left:12px; padding:6px 14px; background:#160022; color:#e6ccff; border:1px solid #9d4edd; border-radius:4px; font:13px Arial; cursor:pointer;';
        btn.addEventListener('click', () => {
            this.showEntropy = !this.showEntropy;
            btn.style.background = this.showEntropy ? '#c77dff' : '#160022';
            btn.style.color = this.showEntropy ? '#0b0012' : '#e6ccff';
            if (!this.showEntropy) this.clearEntropyOverlay();
        });
        parent.appendChild(btn);
        this.entropyButton = btn;
    }
}
