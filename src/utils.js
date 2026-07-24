// ============================================================
//  UTILITY & CONSTANTS
// ============================================================

// Color palette — dark fantasy theme
const COLORS = {
    BG_DARK: 0x0a0a0f,
    BG_MID: 0x1a1a2e,
    BG_LIGHT: 0x2a2a3e,

    GOLD: 0xc8a84e,
    GOLD_LIGHT: 0xffd700,
    GOLD_DIM: 0x8a6e2e,

    WHITE: 0xffffff,
    LIGHT_GRAY: 0xcccccc,
    MID_GRAY: 0x888888,
    DARK_GRAY: 0x444444,

    FIRE: 0xff4422,
    FIRE_LIGHT: 0xff8822,
    FIRE_DIM: 0x662200,

    WATER: 0x2288ff,
    WATER_LIGHT: 0x66bbff,
    WATER_DIM: 0x003366,

    EARTH: 0x44aa44,
    EARTH_LIGHT: 0x66cc66,
    EARTH_DIM: 0x224422,

    AIR: 0x88ddff,
    AIR_LIGHT: 0xbbeeff,
    AIR_DIM: 0x446688,

    HP_GREEN: 0x22dd44,
    HP_YELLOW: 0xdddd22,
    HP_RED: 0xdd2222,

    SHIELD_BLUE: 0x4488ff,
    POWER_PURPLE: 0xaa44ff,

    OVERLAY: 0x000000,
};

// Element color schemes
const ELEMENT_COLORS = {
    fire: { primary: COLORS.FIRE, light: COLORS.FIRE_LIGHT, dim: COLORS.FIRE_DIM, glow: 0xff6600 },
    water: { primary: COLORS.WATER, light: COLORS.WATER_LIGHT, dim: COLORS.WATER_DIM, glow: 0x44aaff },
    earth: { primary: COLORS.EARTH, light: COLORS.EARTH_LIGHT, dim: COLORS.EARTH_DIM, glow: 0x55cc55 },
    air: { primary: COLORS.AIR, light: COLORS.AIR_LIGHT, dim: COLORS.AIR_DIM, glow: 0xaaddff },
};

const ELEMENT_ORDER = ['fire', 'water', 'earth', 'air'];
const ELEMENT_NAMES = { fire: 'FIRE', water: 'WATER', earth: 'EARTH', air: 'AIR' };

// Difficulty by element
const ARENA_DIFFICULTY = {
    fire: { label: 'Easy', enemyHP: 1, enemySpeed: 80, spawnInterval: 2500, bossHP: 30, scoreMultiplier: 1 },
    water: { label: 'Medium', enemyHP: 2, enemySpeed: 100, spawnInterval: 2200, bossHP: 45, scoreMultiplier: 1.5 },
    earth: { label: 'Hard', enemyHP: 3, enemySpeed: 70, spawnInterval: 2000, bossHP: 60, scoreMultiplier: 2 },
    air: { label: 'Expert', enemyHP: 2, enemySpeed: 140, spawnInterval: 1800, bossHP: 50, scoreMultiplier: 2.5 },
};

// Player constants
const PLAYER = {
    SPEED: 260,
    MAX_HP: 100,
    ATTACK_RANGE: 60,
    ATTACK_DAMAGE: 1,
    ATTACK_COOLDOWN: 300,
    SPECIAL_COOLDOWN: 3000,
    SPECIAL_COST: 25,
    DASH_COOLDOWN: 1500,
    DASH_SPEED: 600,
    DASH_DURATION: 150,
    INVINCIBLE_MS: 500,
};

const ENEMIES_PER_ARENA = 10;

// ---- Text Styles ----

const TEXT_STYLES = {
    title: {
        fontFamily: 'Cinzel, serif',
        fontSize: '64px',
        fontStyle: 'bold',
        color: '#c8a84e',
        stroke: '#000000',
        strokeThickness: 6,
        shadow: { offsetX: 3, offsetY: 3, color: '#000', blur: 8, fill: true },
    },
    subtitle: {
        fontFamily: 'Cinzel, serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#c8a84e',
        stroke: '#000000',
        strokeThickness: 4,
        shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 6, fill: true },
    },
    body: {
        fontFamily: 'Cinzel, serif',
        fontSize: '18px',
        color: '#cccccc',
        stroke: '#000000',
        strokeThickness: 2,
    },
    button: {
        fontFamily: 'Cinzel, serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
    },
    small: {
        fontFamily: 'Cinzel, serif',
        fontSize: '14px',
        color: '#888888',
        stroke: '#000000',
        strokeThickness: 1,
    },
    score: {
        fontFamily: 'Cinzel, serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffd700',
        stroke: '#000000',
        strokeThickness: 3,
    },
    damage: {
        fontFamily: 'Cinzel, serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ff4444',
        stroke: '#000000',
        strokeThickness: 3,
    },
    pauseTitle: {
        fontFamily: 'Cinzel, serif',
        fontSize: '48px',
        fontStyle: 'bold',
        color: '#c8a84e',
        stroke: '#000000',
        strokeThickness: 6,
    },
};

// ---- Math Helpers ----

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

function randomRange(min, max) {
    return min + Math.random() * (max - min);
}

function randomInt(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
}

function distanceBetween(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

function angleBetween(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
}

// ---- Web Audio Sound Generation ----

let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

function playTone(freq, duration, type, volume) {
    try {
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(volume || 0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    } catch (_) { /* audio may be blocked */ }
}

function playHit() {
    playTone(200, 0.1, 'square', 0.12);
    setTimeout(() => playTone(120, 0.08, 'square', 0.08), 30);
}

function playSwing() {
    playTone(400, 0.08, 'sawtooth', 0.06);
    setTimeout(() => playTone(200, 0.05, 'sawtooth', 0.04), 20);
}

function playDeath() {
    playTone(300, 0.15, 'square', 0.1);
    setTimeout(() => playTone(200, 0.15, 'square', 0.08), 80);
    setTimeout(() => playTone(100, 0.3, 'square', 0.06), 160);
}

function playSpecial() {
    playTone(600, 0.1, 'sine', 0.12);
    setTimeout(() => playTone(800, 0.1, 'sine', 0.1), 60);
    setTimeout(() => playTone(1000, 0.15, 'sine', 0.08), 120);
}

function playDash() {
    playTone(500, 0.06, 'sine', 0.08);
    setTimeout(() => playTone(700, 0.06, 'sine', 0.06), 30);
}

function playMenuSelect() {
    playTone(523, 0.08, 'sine', 0.1);
    setTimeout(() => playTone(659, 0.08, 'sine', 0.08), 60);
    setTimeout(() => playTone(784, 0.1, 'sine', 0.06), 120);
}

function playBossRoar() {
    playTone(80, 0.4, 'sawtooth', 0.12);
    setTimeout(() => playTone(60, 0.3, 'sawtooth', 0.1), 100);
    setTimeout(() => playTone(50, 0.5, 'sawtooth', 0.08), 200);
}

function playVictory() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => {
        setTimeout(() => playTone(n, 0.2, 'sine', 0.1), i * 120);
    });
}

function playPlayerHit() {
    playTone(180, 0.08, 'square', 0.15);
    playTone(90, 0.12, 'square', 0.1);
}

// ---- Particle Presets ----

function createParticleTexture(scene, key, color, size, shape) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(color, 1);

    if (shape === 'circle' || !shape) {
        g.fillCircle(size, size, size);
    } else if (shape === 'star') {
        drawStar(g, size, size, 5, size, size * 0.4);
    } else if (shape === 'flame') {
        g.fillCircle(size, size * 1.2, size * 0.6);
        g.fillTriangle(
            size, 0,
            size - size * 0.4, size * 1.2,
            size + size * 0.4, size * 1.2
        );
    } else if (shape === 'diamond') {
        g.fillPoints([
            new Phaser.Geom.Point(size, 0),
            new Phaser.Geom.Point(size * 2, size),
            new Phaser.Geom.Point(size, size * 2),
            new Phaser.Geom.Point(0, size),
        ], true);
    } else if (shape === 'drop') {
        g.fillCircle(size, size * 1.4, size * 0.5);
        g.fillTriangle(
            size, 0,
            size - size * 0.35, size * 1.4,
            size + size * 0.35, size * 1.4
        );
    }

    g.generateTexture(key, size * 2, size * 2);
    g.destroy();
}

function drawStar(graphics, cx, cy, points, outerR, innerR) {
    const step = Math.PI / points;
    const pts = [];
    for (let i = 0; i < 2 * points; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = i * step - Math.PI / 2;
        pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    graphics.fillPoints(pts.map(p => new Phaser.Geom.Point(p.x, p.y)), true);
}

// ---- Global Game State ----

const GameState = {
    completedElements: [],     // ['fire', 'water', ...]
    totalKills: 0,
    totalBossesDefeated: 0,
    totalScore: 0,
    hpRestoreCount: 3,        // Full HP restores available
    currentElement: null,
    arenaData: {
        kills: 0,
        score: 0,
        bossDefeated: false,
        hpRestoresUsed: 0,
    },
};
