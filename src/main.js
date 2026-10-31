// ============================================================
//  ELEMENTAL TRIALS — Main Configuration
// ============================================================

const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    pixelArt: true,
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
        UpgradeScene,
        ArenaBase,
        ArenaFireScene,
        ArenaWaterScene,
        ArenaEarthScene,
        ArenaAirScene,
        GameOverScene,
        WinScene,
    ],
};

const game = new Phaser.Game(config);

// ------------------------------------------------------------
//  DEBUG ERROR OVERLAY (?debug=1)
//  Shows uncaught errors as red text on the game screen so a
//  failing build doesn't require the browser Console.
// ------------------------------------------------------------
function installDebugErrorOverlay() {
    if (new URLSearchParams(window.location.search).get('debug') !== '1') return;

    const box = document.createElement('div');
    box.id = 'debug-error-overlay';
    box.style.cssText =
        'position:fixed;top:0;left:0;right:0;max-height:45%;overflow:auto;' +
        'background:rgba(0,0,0,0.88);color:#ff4444;font:12px/1.45 Consolas,monospace;' +
        'padding:8px 10px;z-index:99999;white-space:pre-wrap;display:none;';
    document.body.appendChild(box);

    const show = (label, text) => {
        box.style.display = 'block';
        box.textContent += `[${label}] ${text}\n`;
    };

    window.addEventListener('error', (e) => {
        const file = e.filename ? e.filename.split('/').pop() : '';
        const where = file ? ` (${file}:${e.lineno}:${e.colno})` : '';
        show('error', (e.message || 'Script error') + where);
    });

    window.addEventListener('unhandledrejection', (e) => {
        const reason = e.reason && e.reason.message ? e.reason.message : String(e.reason);
        show('promise', reason);
    });
}

installDebugErrorOverlay();
