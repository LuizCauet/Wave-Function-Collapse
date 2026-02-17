import Phaser from 'phaser';
import { MapScene } from './MapScene.js';

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#12001f',
    scene: [MapScene],
    pixelArt: true
};

const game = new Phaser.Game(config);
