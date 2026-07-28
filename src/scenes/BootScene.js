// ============================================================
//  BOOT SCENE — Texture Generation + Preload
// ============================================================

class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Create loading bar
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        const barBg = this.add.graphics();
        barBg.fillStyle(0x1a1a2e, 1);
        barBg.fillRoundedRect(w / 2 - 160, h / 2 - 8, 320, 16, 8);

        const bar = this.add.graphics();
        const loadText = this.add.text(w / 2, h / 2 - 40, 'Forging Realms...', {
            fontFamily: 'Cinzel, serif',
            fontSize: '20px',
            color: '#c8a84e',
        }).setOrigin(0.5);

        // Update loading bar via progress event
        this.load.on('progress', (value) => {
            bar.clear();
            bar.fillStyle(0xc8a84e, 1);
            bar.fillRoundedRect(w / 2 - 158, h / 2 - 6, 316 * value, 12, 6);

            // Update HTML preloader too
            const pBar = document.getElementById('preloader-bar');
            const pSub = document.getElementById('preloader-sub');
            if (pBar) pBar.style.width = Math.round(value * 100) + '%';
            if (pSub) {
                const steps = [
                    'Summoning Elements...',
                    'Forging Weapons...',
                    'Weaving Magic...',
                    'Forging Realms...',
                ];
                pSub.textContent = steps[Math.floor(value * steps.length)];
            }
        });

        this.load.on('complete', () => {
            bar.clear();
            bar.fillStyle(0xc8a84e, 1);
            bar.fillRoundedRect(w / 2 - 158, h / 2 - 6, 316, 12, 6);
            // Hide HTML preloader
            const preloader = document.getElementById('preloader');
            if (preloader) preloader.classList.add('hidden');
        });

        // ---- Generate All Textures ----

        // Player texture (32x48)
        this.generatePlayerTexture();

        // Enemy textures (enemy_fire, enemy_water, etc.)
        this.generateEnemyTextures();

        // Boss textures
        this.generateBossTextures();

        // Projectile
        this.generateProjectileTexture();

        // UI textures
        this.generateUITextures();

        // Particle textures
        this.generateParticleTextures();

        // Elemental symbols for menu
        this.generateSymbolTextures();

        // Orb / powerup textures
        this.generateOrbTextures();

        // Kenney roguelike character sheet (kept for reference / fallback)
        this.load.spritesheet('player_sheet', 'assets/roguelikeChar_transparent.png', {
            frameWidth:  16,
            frameHeight: 16,
            spacing:     1,
        });

        // Hand-drawn fireball projectile sprite
        this.load.image('fireball_sprite', 'assets/fireball.png');

        // Hand-drawn boss sprite (fire skull; tinted for other elements until unique bosses are made)
        this.load.image('boss_sprite', 'assets/fire_boss.png');

        // Insect enemy spritesheets — 32×32 frames, 4 frames per sheet
        this.load.spritesheet('insect_beetle', 'assets/insects/BeetleMove.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('insect_maggot', 'assets/insects/MaggotWalk.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('insect_mantis', 'assets/insects/MantisMove.png', { frameWidth: 32, frameHeight: 32 });

        // Adventurer character spritesheets — 48×64 frames, 8 frames per sheet.
        // Six directional variants; no pure left/right (use Left_Down / Right_Down instead).
        ['Down', 'Up', 'Left_Down', 'Left_Up', 'Right_Down', 'Right_Up'].forEach(dir => {
            this.load.spritesheet(`adventurer_walk_${dir}`,
                `assets/adventurer/Walk/walk_${dir}.png`,
                { frameWidth: 48, frameHeight: 64 });
            this.load.spritesheet(`adventurer_idle_${dir}`,
                `assets/adventurer/Idle/Idle_${dir}.png`,
                { frameWidth: 48, frameHeight: 64 });
        });
    }

    create() {
        // Hide HTML preloader if still visible
        const preloader = document.getElementById('preloader');
        if (preloader) preloader.classList.add('hidden');

        this.cameras.main.fadeIn(500, 10, 10, 15);

        this.time.delayedCall(600, () => {
            this.scene.start('MenuScene');
        });
    }

    // ---- Texture Generators ----

    generatePlayerTexture() {
        // Player character 32x48 — small warrior silhouette
        const g = this.make.graphics({ add: false });

        // Body
        g.fillStyle(0x334466, 1);
        g.fillRect(10, 16, 12, 18);

        // Head
        g.fillStyle(0xffccaa, 1);
        g.fillCircle(16, 10, 7);

        // Hair
        g.fillStyle(0x554433, 1);
        g.fillRect(10, 4, 12, 6);
        g.fillRect(9, 6, 14, 4);

        // Eyes
        g.fillStyle(0xffffff, 1);
        g.fillRect(13, 9, 3, 2);
        g.fillRect(17, 9, 3, 2);
        g.fillStyle(0x000000, 1);
        g.fillRect(14, 10, 1, 1);
        g.fillRect(18, 10, 1, 1);

        // Legs
        g.fillStyle(0x223355, 1);
        g.fillRect(11, 34, 4, 12);
        g.fillRect(17, 34, 4, 12);

        // Boots
        g.fillStyle(0x443322, 1);
        g.fillRect(10, 44, 6, 4);
        g.fillRect(16, 44, 6, 4);

        // Arms
        g.fillStyle(0xffccaa, 1);
        g.fillRect(6, 18, 4, 12);
        g.fillRect(22, 18, 4, 12);

        // Sword in right hand
        g.fillStyle(0xcccccc, 1);
        g.fillRect(24, 12, 3, 16);
        g.fillStyle(0xc8a84e, 1);
        g.fillRect(23, 12, 1, 4);
        g.fillRect(27, 12, 1, 4);
        g.fillRect(24, 28, 3, 4); // handle

        // Cloak
        g.fillStyle(0x224466, 0.6);
        g.fillRect(8, 14, 16, 22);

        g.generateTexture('player', 32, 48);
        g.destroy();

        // Also generate a 'glow' version for special
        this.generateGlowTexture('player_glow', 32, 48, 0x4488ff);
    }

    generateEnemyTextures() {
        // ---- Fire Elemental (28x32) ----
        let g = this.make.graphics({ add: false });
        g.fillStyle(0xff4422, 1);
        g.fillCircle(14, 16, 12);
        g.fillStyle(0xff8822, 1);
        g.fillCircle(14, 16, 8);
        g.fillStyle(0xffcc44, 1);
        g.fillCircle(14, 16, 4);
        // Eyes
        g.fillStyle(0xffffff, 1);
        g.fillCircle(10, 13, 2);
        g.fillCircle(18, 13, 2);
        g.fillStyle(0x000000, 1);
        g.fillCircle(10, 13, 1);
        g.fillCircle(18, 13, 1);
        // Flame spikes
        g.fillStyle(0xff6600, 0.7);
        g.fillTriangle(14, 0, 8, 10, 20, 10);
        g.generateTexture('enemy_fire', 28, 32);
        g.destroy();

        // ---- Water Elemental (28x32) ----
        g = this.make.graphics({ add: false });
        g.fillStyle(0x2288ff, 1);
        g.fillEllipse(14, 18, 24, 28);
        g.fillStyle(0x66bbff, 1);
        g.fillEllipse(14, 18, 16, 20);
        g.fillStyle(0xaaeeff, 1);
        g.fillEllipse(14, 18, 8, 10);
        // Eyes
        g.fillStyle(0xffffff, 1);
        g.fillCircle(10, 15, 2);
        g.fillCircle(18, 15, 2);
        g.fillStyle(0x003366, 1);
        g.fillCircle(10, 15, 1);
        g.fillCircle(18, 15, 1);
        // Water droplets on top
        g.fillStyle(0x66bbff, 0.6);
        g.fillCircle(7, 5, 3);
        g.fillCircle(21, 7, 3);
        g.generateTexture('enemy_water', 28, 32);
        g.destroy();

        // ---- Earth Elemental (30x32) ----
        g = this.make.graphics({ add: false });
        g.fillStyle(0x44aa44, 1);
        g.fillRect(3, 4, 24, 26);
        // Rocky texture
        g.fillStyle(0x66cc66, 1);
        g.fillRect(6, 8, 8, 6);
        g.fillRect(16, 14, 8, 6);
        g.fillRect(8, 20, 6, 6);
        g.fillRect(16, 8, 6, 6);
        // Eyes
        g.fillStyle(0xffffff, 1);
        g.fillRect(8, 12, 4, 3);
        g.fillRect(18, 12, 4, 3);
        g.fillStyle(0x000000, 1);
        g.fillRect(10, 13, 2, 2);
        g.fillRect(20, 13, 2, 2);
        // Moss/leaves
        g.fillStyle(0x88dd44, 0.7);
        g.fillCircle(4, 8, 3);
        g.fillCircle(26, 10, 3);
        g.generateTexture('enemy_earth', 30, 32);
        g.destroy();

        // ---- Air Elemental (28x32) ----
        g = this.make.graphics({ add: false });
        g.fillStyle(0x88ddff, 0.8);
        g.fillCircle(14, 16, 12);
        g.fillStyle(0xbbeeff, 0.6);
        g.fillCircle(14, 14, 8);
        g.fillStyle(0xddf4ff, 0.4);
        g.fillCircle(14, 12, 5);
        // Eyes
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(10, 13, 2);
        g.fillCircle(18, 13, 2);
        g.fillStyle(0x446688, 1);
        g.fillCircle(10, 13, 1);
        g.fillCircle(18, 13, 1);
        // Wispy trails
        g.lineStyle(2, 0xbbeeff, 0.5);
        g.beginPath();
        g.moveTo(2, 20);
        g.lineTo(8, 16);
        g.strokePath();
        g.beginPath();
        g.moveTo(26, 20);
        g.lineTo(20, 16);
        g.strokePath();
        g.generateTexture('enemy_air', 28, 32);
        g.destroy();

        // Glow versions
        this.generateGlowTexture('enemy_fire_glow', 28, 32, 0xff4422);
        this.generateGlowTexture('enemy_water_glow', 28, 32, 0x2288ff);
        this.generateGlowTexture('enemy_earth_glow', 30, 32, 0x44aa44);
        this.generateGlowTexture('enemy_air_glow', 28, 32, 0x88ddff);
    }

    generateBossTextures() {
        const bossSize = 80;

        // Fire Boss — giant flame demon
        let g = this.make.graphics({ add: false });
        g.fillStyle(0xff2200, 1);
        g.fillCircle(bossSize / 2, bossSize / 2 + 4, 32);
        g.fillStyle(0xff6600, 1);
        g.fillCircle(bossSize / 2, bossSize / 2, 24);
        g.fillStyle(0xffaa00, 1);
        g.fillCircle(bossSize / 2, bossSize / 2 - 2, 14);
        // Horns
        g.fillStyle(0xcc3300, 1);
        g.fillTriangle(20, 10, 28, 30, 14, 30);
        g.fillTriangle(60, 10, 66, 30, 52, 30);
        // Eyes
        g.fillStyle(0xffffff, 1);
        g.fillCircle(34, 32, 4);
        g.fillCircle(46, 32, 4);
        g.fillStyle(0xffdd00, 1);
        g.fillCircle(34, 32, 2);
        g.fillCircle(46, 32, 2);
        // Flames around
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const fx = bossSize / 2 + Math.cos(a) * 36;
            const fy = bossSize / 2 + 4 + Math.sin(a) * 36;
            g.fillStyle(0xff6600, 0.4);
            g.fillTriangle(fx, fy - 10, fx - 5, fy + 2, fx + 5, fy + 2);
        }
        g.generateTexture('boss_fire', bossSize, bossSize);
        g.destroy();

        // Water Boss — giant serpent
        g = this.make.graphics({ add: false });
        g.fillStyle(0x0066cc, 1);
        g.fillEllipse(bossSize / 2, bossSize / 2 + 6, 56, 40);
        g.fillStyle(0x3388ff, 1);
        g.fillEllipse(bossSize / 2, bossSize / 2, 40, 28);
        g.fillStyle(0x88ccff, 1);
        g.fillEllipse(bossSize / 2, bossSize / 2 - 2, 22, 16);
        // Crown/crest
        g.fillStyle(0x44aaff, 1);
        g.fillTriangle(30, 16, 40, 4, 50, 16);
        g.fillTriangle(36, 14, 48, 2, 58, 14);
        // Eyes
        g.fillStyle(0xffffff, 1);
        g.fillCircle(34, 30, 4);
        g.fillCircle(46, 30, 4);
        g.fillStyle(0x003366, 1);
        g.fillCircle(34, 30, 2);
        g.fillCircle(46, 30, 2);
        g.generateTexture('boss_water', bossSize, bossSize);
        g.destroy();

        // Earth Boss — giant golem
        g = this.make.graphics({ add: false });
        g.fillStyle(0x336633, 1);
        g.fillRect(12, 8, 56, 60);
        g.fillStyle(0x448844, 1);
        g.fillRect(18, 14, 20, 14);
        g.fillRect(42, 14, 20, 14);
        g.fillRect(18, 34, 14, 14);
        g.fillRect(42, 34, 14, 14);
        // Shoulder plates
        g.fillStyle(0x559955, 1);
        g.fillRect(4, 12, 12, 16);
        g.fillRect(64, 12, 12, 16);
        // Eyes
        g.fillStyle(0xffaa00, 1);
        g.fillCircle(30, 26, 5);
        g.fillCircle(50, 26, 5);
        g.fillStyle(0x000000, 1);
        g.fillCircle(30, 26, 2);
        g.fillCircle(50, 26, 2);
        // Moss
        g.fillStyle(0x66dd44, 0.8);
        g.fillCircle(14, 16, 4);
        g.fillCircle(66, 18, 4);
        g.fillCircle(40, 64, 4);
        g.generateTexture('boss_earth', bossSize, bossSize);
        g.destroy();

        // Air Boss — massive storm elemental
        g = this.make.graphics({ add: false });
        g.fillStyle(0x88bbdd, 0.7);
        g.fillCircle(bossSize / 2, bossSize / 2, 34);
        g.fillStyle(0xaaddff, 0.5);
        g.fillCircle(bossSize / 2, bossSize / 2 - 4, 24);
        g.fillStyle(0xcceeFF, 0.3);
        g.fillCircle(bossSize / 2, bossSize / 2 - 6, 14);
        // Storm bolts
        g.lineStyle(3, 0xffffff, 0.6);
        g.beginPath();
        g.moveTo(18, 18);
        g.lineTo(26, 30);
        g.lineTo(20, 36);
        g.strokePath();
        g.beginPath();
        g.moveTo(62, 18);
        g.lineTo(54, 30);
        g.lineTo(60, 36);
        g.strokePath();
        // Eyes
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(34, 30, 4);
        g.fillCircle(46, 30, 4);
        g.fillStyle(0x224466, 1);
        g.fillCircle(34, 30, 2);
        g.fillCircle(46, 30, 2);
        // Storm clouds around
        g.fillStyle(0x8899aa, 0.4);
        g.fillCircle(10, 50, 8);
        g.fillCircle(70, 48, 8);
        g.fillCircle(14, 10, 6);
        g.fillCircle(66, 10, 6);
        g.generateTexture('boss_air', bossSize, bossSize);
        g.destroy();
    }

    generateProjectileTexture() {
        const g = this.make.graphics({ add: false });
        g.fillStyle(0xffffff, 1);
        g.fillCircle(6, 6, 5);
        g.fillStyle(0xffff44, 1);
        g.fillCircle(6, 6, 3);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(6, 6, 1);
        g.generateTexture('projectile', 12, 12);
        g.destroy();
    }

    generateUITextures() {
        // Button background
        let g = this.make.graphics({ add: false });
        g.fillStyle(0x334466, 1);
        g.fillRoundedRect(0, 0, 200, 50, 10);
        g.lineStyle(2, 0xc8a84e, 1);
        g.strokeRoundedRect(0, 0, 200, 50, 10);
        g.generateTexture('button_bg', 200, 50);
        g.destroy();

        // Button hover
        g = this.make.graphics({ add: false });
        g.fillStyle(0x445577, 1);
        g.fillRoundedRect(0, 0, 200, 50, 10);
        g.lineStyle(2, 0xffd700, 1);
        g.strokeRoundedRect(0, 0, 200, 50, 10);
        g.generateTexture('button_hover', 200, 50);
        g.destroy();

        // Health bar background
        g = this.make.graphics({ add: false });
        g.fillStyle(0x222222, 1);
        g.fillRoundedRect(0, 0, 200, 20, 5);
        g.lineStyle(1, 0x444444, 1);
        g.strokeRoundedRect(0, 0, 200, 20, 5);
        g.generateTexture('bar_bg', 200, 20);
        g.destroy();

        // Health bar fill (green)
        g = this.make.graphics({ add: false });
        g.fillStyle(0x22dd44, 1);
        g.fillRoundedRect(0, 0, 200, 20, 5);
        g.generateTexture('bar_hp', 200, 20);
        g.destroy();

        // Element power bar fill
        g = this.make.graphics({ add: false });
        g.fillStyle(0xaa44ff, 1);
        g.fillRoundedRect(0, 0, 200, 12, 4);
        g.generateTexture('bar_power', 200, 12);
        g.destroy();

        // Gate/portal frame texture
        g = this.make.graphics({ add: false });
        g.fillStyle(0x2a2a3e, 1);
        g.fillRoundedRect(0, 0, 240, 300, 16);
        g.lineStyle(3, 0xc8a84e, 1);
        g.strokeRoundedRect(0, 0, 240, 300, 16);
        g.generateTexture('gate_frame', 240, 300);
        g.destroy();

        // Orb texture (small pickup)
        g = this.make.graphics({ add: false });
        g.fillStyle(0xffdd44, 1);
        g.fillCircle(8, 8, 7);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(6, 6, 3);
        g.generateTexture('orb', 16, 16);
        g.destroy();

        // Shield icon
        g = this.make.graphics({ add: false });
        g.fillStyle(0x4488ff, 1);
        g.fillRect(3, 6, 18, 16);
        g.fillTriangle(2, 6, 22, 6, 12, 0);
        g.fillStyle(0x88bbff, 1);
        g.fillRect(7, 10, 10, 8);
        g.generateTexture('shield_icon', 24, 24);
        g.destroy();
    }

    generateParticleTextures() {
        createParticleTexture(this, 'particle_circle', 0xffffff, 4, 'circle');
        createParticleTexture(this, 'particle_star', 0xffd700, 6, 'star');
        createParticleTexture(this, 'particle_flame', 0xff6600, 6, 'flame');
        createParticleTexture(this, 'particle_drop', 0x4488ff, 6, 'drop');
        createParticleTexture(this, 'particle_diamond', 0x88ddff, 6, 'diamond');

        // Element-colored particles
        const elems = [
            { key: 'particle_fire', color: 0xff4422 },
            { key: 'particle_water', color: 0x2288ff },
            { key: 'particle_earth', color: 0x44aa44 },
            { key: 'particle_air', color: 0x88ddff },
        ];
        elems.forEach(e => createParticleTexture(this, e.key, e.color, 4, 'circle'));

        // Spark particle
        createParticleTexture(this, 'particle_spark', 0xffffaa, 3, 'circle');
    }

    generateSymbolTextures() {
        const size = 64;

        // Fire symbol
        let g = this.make.graphics({ add: false });
        g.fillStyle(0xff4422, 0.8);
        g.fillTriangle(size / 2, 6, 8, size - 8, size - 8, size - 8);
        g.fillStyle(0xff6600, 0.6);
        g.fillTriangle(size / 2, 14, 16, size - 14, size - 16, size - 14);
        g.generateTexture('symbol_fire', size, size);
        g.destroy();

        // Water symbol
        g = this.make.graphics({ add: false });
        g.fillStyle(0x2288ff, 0.8);
        g.fillTriangle(8, 10, size / 2, size - 8, size - 8, 10);
        g.lineStyle(3, 0x66bbff, 0.7);
        g.beginPath();
        g.arc(size / 2, size - 14, 18, Math.PI, 0);
        g.strokePath();
        g.generateTexture('symbol_water', size, size);
        g.destroy();

        // Earth symbol
        g = this.make.graphics({ add: false });
        g.fillStyle(0x44aa44, 0.8);
        g.fillRect(10, 10, size - 20, size - 20);
        g.fillStyle(0x66cc66, 0.6);
        g.fillRect(16, 16, size - 32, size - 32);
        g.generateTexture('symbol_earth', size, size);
        g.destroy();

        // Air symbol
        g = this.make.graphics({ add: false });
        g.fillStyle(0x88ddff, 0.7);
        g.fillCircle(size / 2, size / 2, 24);
        g.fillStyle(0xffffff, 0.4);
        g.fillCircle(size / 2, size / 2, 14);
        g.lineStyle(2, 0xbbeeff, 0.5);
        g.beginPath();
        g.moveTo(6, size / 2 + 6);
        g.lineTo(size / 2, size / 2 - 4);
        g.lineTo(size - 6, size / 2 + 6);
        g.strokePath();
        g.generateTexture('symbol_air', size, size);
        g.destroy();
    }

    generateOrbTextures() {
        // HP restore orb
        let g = this.make.graphics({ add: false });
        g.fillStyle(0x22dd44, 1);
        g.fillCircle(10, 10, 9);
        g.fillStyle(0x66ff88, 1);
        g.fillCircle(8, 8, 5);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(7, 7, 2);
        g.generateTexture('orb_hp', 20, 20);
        g.destroy();

        // Score orb
        g = this.make.graphics({ add: false });
        g.fillStyle(0xffd700, 1);
        g.fillCircle(8, 8, 7);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(6, 6, 3);
        g.generateTexture('orb_score', 16, 16);
        g.destroy();
    }

    generateGlowTexture(key, w, h, color) {
        const g = this.make.graphics({ add: false });
        const cx = w / 2, cy = h / 2;
        const r = Math.max(w, h) * 0.7;

        // Radial glow approximation with concentric circles
        for (let i = 5; i >= 1; i--) {
            g.fillStyle(color, (0.15 / 5) * (6 - i));
            g.fillCircle(cx, cy, r * (i / 5));
        }
        g.generateTexture(key, w + r, h + r);
        g.destroy();
    }
}
