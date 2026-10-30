// ============================================================
//  WIN SCENE
//
//  Shown once, when the fourth and final arena is cleared.
//  ArenaBase.winArena() starts this scene instead of the
//  upgrade/hub hand-off, so all run totals are already in
//  GameState by the time we read them.
//
//  Visual style follows GameOverScene / HubScene: dark grid,
//  Cinzel font, gold accents, ambient particles, fade in/out.
// ============================================================

class WinScene extends Phaser.Scene {
    constructor() {
        super({ key: 'WinScene' });
    }

    create() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        this.cameras.main.setBackgroundColor(COLORS.BG_DARK);
        this.cameras.main.fadeIn(700, 10, 10, 15);

        this.createBackground(w, h);
        this.createTitle(w, h);
        this.createSigils(w, h);
        this.createStats(w, h);
        this.createButtons(w, h);

        playVictory();

        // Keyboard shortcuts
        this.input.keyboard.on('keydown-ENTER', () => this.goToHub());
        this.input.keyboard.on('keydown-ESC',   () => this.goToMenu());
    }

    // Dark grid + warm gold wash + drifting particles
    createBackground(w, h) {
        const bg = this.add.graphics();
        bg.fillStyle(COLORS.BG_DARK, 1);
        bg.fillRect(0, 0, w, h);

        // Subtle grid
        bg.lineStyle(1, COLORS.BG_MID, 0.3);
        for (let x = 0; x < w; x += 80) {
            bg.beginPath(); bg.moveTo(x, 0); bg.lineTo(x, h); bg.strokePath();
        }
        for (let y = 0; y < h; y += 80) {
            bg.beginPath(); bg.moveTo(0, y); bg.lineTo(w, y); bg.strokePath();
        }

        // Warm gold wash for the victory mood
        const wash = this.add.graphics();
        wash.fillStyle(0x2a2008, 0.35);
        wash.fillRect(0, 0, w, h);

        // Ambient sparks
        this.add.particles(0, 0, 'particle_spark', {
            x:         { min: 0, max: w },
            y:         { min: 0, max: h },
            speed:     { min: 2, max: 10 },
            angle:     { min: 0, max: 360 },
            scale:     { start: 0.18, end: 0 },
            alpha:     { start: 0.22, end: 0 },
            lifespan:  9000,
            frequency: 170,
            quantity:  1,
            blendMode: 'ADD',
        });

        // Gold stars drifting upward
        this.add.particles(0, 0, 'particle_star', {
            x:         { min: 0, max: w },
            y:         h + 10,
            speedY:    { min: -18, max: -6 },
            speedX:    { min: -6, max: 6 },
            scale:     { start: 0.35, end: 0 },
            alpha:     { start: 0.3, end: 0 },
            lifespan:  11000,
            frequency: 320,
            quantity:  1,
            blendMode: 'ADD',
        });

        // Decorative horizontal rules flanking the sigil row
        const deco = this.add.graphics();
        deco.lineStyle(1, COLORS.GOLD_DIM, 0.45);
        deco.beginPath(); deco.moveTo(w / 2 - 300, 178); deco.lineTo(w / 2 + 300, 178); deco.strokePath();
        deco.beginPath(); deco.moveTo(w / 2 - 300, 512); deco.lineTo(w / 2 + 300, 512); deco.strokePath();
    }

    // "TRIALS COMPLETE" with a glow copy behind it
    createTitle(w, h) {
        const titleY = 100;

        const glow = this.add.text(w / 2, titleY, 'TRIALS COMPLETE', {
            fontFamily: 'Cinzel, serif',
            fontSize: '60px',
            fontStyle: 'bold',
            color: '#c8a84e',
            stroke: '#8a6e2e',
            strokeThickness: 14,
        }).setOrigin(0.5).setAlpha(0).setBlendMode('ADD');

        const title = this.add.text(w / 2, titleY, 'TRIALS COMPLETE', {
            fontFamily: 'Cinzel, serif',
            fontSize: '60px',
            fontStyle: 'bold',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 7,
            shadow: { offsetX: 4, offsetY: 4, color: '#000', blur: 14, fill: true },
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({ targets: [glow, title], alpha: 1, duration: 900, ease: 'Power2' });

        // Slow pulse on the glow
        this.tweens.add({
            targets: glow,
            alpha: 0.4,
            duration: 2200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: 900,
        });

        const sub = this.add.text(w / 2, 148, 'The four realms are quiet.', {
            fontFamily: 'Cinzel, serif',
            fontSize: '18px',
            color: '#888888',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({ targets: sub, alpha: 1, duration: 700, delay: 500 });
    }

    // The four elemental sigils, lit in their own colors
    createSigils(w, h) {
        const y     = 245;
        const gap   = 140;
        const start = w / 2 - gap * (ELEMENT_ORDER.length - 1) / 2;

        ELEMENT_ORDER.forEach((element, i) => {
            const x      = start + i * gap;
            const colors = ELEMENT_COLORS[element];

            // Halo ring behind the sigil
            const ring = this.add.graphics().setAlpha(0);
            ring.lineStyle(2, colors.primary, 0.6);
            ring.strokeCircle(x, y, 40);
            ring.lineStyle(1, colors.light, 0.3);
            ring.strokeCircle(x, y, 46);

            const sigil = this.add.image(x, y, `symbol_${element}`)
                .setScale(0.9)
                .setAlpha(0);

            const label = this.add.text(x, y + 66, ELEMENT_NAMES[element], {
                fontFamily: 'Cinzel, serif',
                fontSize: '15px',
                fontStyle: 'bold',
                color: Phaser.Display.Color.IntegerToColor(colors.primary).rgba,
                stroke: '#000000',
                strokeThickness: 3,
            }).setOrigin(0.5).setAlpha(0);

            const delay = 400 + i * 130;

            this.tweens.add({
                targets: [ring, label],
                alpha: 1,
                duration: 500,
                delay,
            });

            this.tweens.add({
                targets: sigil,
                alpha: 0.95,
                scale: 1.15,
                duration: 500,
                delay,
                ease: 'Back.easeOut',
            });

            // Gentle idle pulse so the row feels alive
            this.tweens.add({
                targets: sigil,
                scale: 1.08,
                duration: 1800,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: delay + 500,
            });
        });
    }

    // Run totals pulled from GameState
    createStats(w, h) {
        const centerX = w / 2;
        const startY  = 352;
        const rowH    = 36;

        const stats = [
            { label: 'Final Score',     value: `${GameState.totalScore}`,          color: '#ffd700' },
            { label: 'Enemies Slain',   value: `${GameState.totalKills}`,          color: '#cccccc' },
            { label: 'Bosses Defeated', value: `${GameState.totalBossesDefeated}`, color: '#22dd44' },
            { label: 'Powers Taken',    value: `${GameState.upgrades.length}`,     color: '#aa88ff' },
        ];

        stats.forEach((stat, i) => {
            const y     = startY + i * rowH;
            const delay = 900 + i * 100;

            const labelText = this.add.text(centerX - 20, y, `${stat.label}:`, {
                fontFamily: 'Cinzel, serif',
                fontSize: '17px',
                color: '#777777',
                stroke: '#000000',
                strokeThickness: 2,
            }).setOrigin(1, 0.5).setAlpha(0);

            const valueText = this.add.text(centerX + 20, y, stat.value, {
                fontFamily: 'Cinzel, serif',
                fontSize: '17px',
                fontStyle: 'bold',
                color: stat.color,
                stroke: '#000000',
                strokeThickness: 2,
            }).setOrigin(0, 0.5).setAlpha(0);

            this.tweens.add({ targets: [labelText, valueText], alpha: 1, duration: 400, delay });
        });

        const hint = this.add.text(w / 2, 482,
            'Every gate stands open. Nothing left to prove — unless you want to run it again.',
            {
                fontFamily: 'Cinzel, serif',
                fontSize: '13px',
                color: '#555555',
                stroke: '#000000',
                strokeThickness: 1,
            }
        ).setOrigin(0.5).setAlpha(0);

        this.tweens.add({ targets: hint, alpha: 1, duration: 500, delay: 1400 });
    }

    // Two buttons: Return to Hub and Main Menu
    createButtons(w, h) {
        const btnY = 570;
        const btnW = 240;
        const btnH = 52;
        const gap  = 30;

        const hubX  = w / 2 - btnW / 2 - gap / 2;
        const menuX = w / 2 + btnW / 2 + gap / 2;

        this.createButton(hubX, btnY, btnW, btnH, 'RETURN TO HUB', '[ENTER]',
            0x1a1a2a, COLORS.GOLD, 1500, () => this.goToHub());

        this.createButton(menuX, btnY, btnW, btnH, 'MAIN MENU', '[ESC]',
            0x1a1a1a, 0x666666, 1600, () => this.goToMenu());
    }

    // Reusable button builder matching GameOverScene / HubScene
    createButton(cx, cy, bw, bh, label, shortcut, fillColor, borderColor, delay, callback) {
        const bg = this.add.graphics().setAlpha(0);
        bg.fillStyle(fillColor, 1);
        bg.fillRoundedRect(cx - bw / 2, cy - bh / 2, bw, bh, 10);
        bg.lineStyle(2, borderColor, 0.85);
        bg.strokeRoundedRect(cx - bw / 2, cy - bh / 2, bw, bh, 10);

        const text = this.add.text(cx, cy - 6, label, {
            fontFamily: 'Cinzel, serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5, 0.5).setAlpha(0);

        const hint = this.add.text(cx, cy + 14, shortcut, {
            fontFamily: 'Cinzel, serif',
            fontSize: '11px',
            color: '#666666',
        }).setOrigin(0.5, 0.5).setAlpha(0);

        const zone = this.add.zone(cx, cy, bw, bh)
            .setInteractive({ useHandCursor: true });

        zone.on('pointerover', () => {
            this.tweens.add({ targets: [text, hint], scale: 1.06, duration: 120, ease: 'Power2' });
            bg.clear();
            bg.fillStyle(Phaser.Display.Color.ValueToColor(fillColor).lighten(15).color, 1);
            bg.fillRoundedRect(cx - bw / 2, cy - bh / 2, bw, bh, 10);
            bg.lineStyle(2, borderColor, 1);
            bg.strokeRoundedRect(cx - bw / 2, cy - bh / 2, bw, bh, 10);
        });

        zone.on('pointerout', () => {
            this.tweens.add({ targets: [text, hint], scale: 1, duration: 120, ease: 'Power2' });
            bg.clear();
            bg.fillStyle(fillColor, 1);
            bg.fillRoundedRect(cx - bw / 2, cy - bh / 2, bw, bh, 10);
            bg.lineStyle(2, borderColor, 0.85);
            bg.strokeRoundedRect(cx - bw / 2, cy - bh / 2, bw, bh, 10);
        });

        zone.on('pointerdown', () => callback());

        this.tweens.add({ targets: [bg, text, hint], alpha: 1, duration: 500, delay });
    }

    // -------------------------------------------------------
    //  NAVIGATION
    // -------------------------------------------------------

    goToHub() {
        playMenuSelect();
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.time.delayedCall(500, () => this.scene.start('HubScene'));
    }

    goToMenu() {
        playMenuSelect();
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.time.delayedCall(500, () => this.scene.start('MenuScene'));
    }
}
