// ============================================================
//  ELEMENTAL TRIALS — Main Configuration
// ============================================================

const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    parent: 'game-container',
    backgroundColor: '#0a0a0f',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false,
        },
    },
    scene: [
        BootScene,
        MenuScene,
        HubScene,
        ArenaBase,
        ArenaFireScene,
        ArenaWaterScene,
        ArenaEarthScene,
        ArenaAirScene,
        GameOverScene,
    ],
};

const game = new Phaser.Game(config);
