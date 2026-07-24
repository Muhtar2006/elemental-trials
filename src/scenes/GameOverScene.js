// ============================================================
//  GAME OVER SCENE
//
//  Shown when the player dies in an arena. Reads GameState to
//  display which arena they fell in, kills, score, and total
//  progress. Two buttons: Try Again (restart same arena) and
//  Hub (return to element selection).
//
//  Visual style matches MenuScene and HubScene: dark background,
//  Cinzel font, gold accent color, particle atmosphere, fade
//  transitions.
// ============================================================

class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    create() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        // Snapshot the data we need before anything could change it
        const element    = GameState.currentElement;
        const arenaData  = GameState.arenaData;
        const colors     = element ? ELEMENT_COLORS[element] : null;
        const difficulty = element ? ARENA_DIFFICULTY[element] : null;

        this.cameras.main.setBackgroundColor(COLORS.BG_DARK);
        this.cameras.main.fadeIn(700, 10, 10, 15);

        this.createBackground(w, h, element, colors);
        this.createTitle(w, h);
        this.createArenaInfo(w, h, element, colors, difficulty);
        this.createStats(w, h, arenaData);
        this.createProgressSummary(w, h);
        this.createButtons(w, h, element);

        // Keyboard shortcuts
        this.input.keyboard.on('keydown-ENTER', () => this.goToHub());
        this.input.keyboard.on('keydown-R',     () => this.tryAgain(element));
        this.input.keyboard.on('keydown-ESC',   () => this.goToHub());
    }

    // Dark grid + element-tinted vignette + ambient particles
    createBackground(w, h, element, colors) {
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

        // Red vignette for defeat mood
        const vignette = this.add.graphics();
        vignette.fillStyle(0x330000, 0.35);
        vignette.fillRect(0, 0, w, h);

        // Element particles if we know which arena the player was in
        if (element) {
            this.add.particles(0, 0, `particle_${element}`, {
                x:         { min: 0, max: w },
                y:         { min: 0, max: h },
                speed:     { min: 4, max: 16 },
                angle:     { min: 0, max: 360 },
                scale:     { start: 0.3, end: 0 },
                alpha:     { start: 0.12, end: 0 },
                lifespan:  7000,
                frequency: 220,
                quantity:  1,
                blendMode: 'ADD',
            });
        }

        // Ambient dark spark particles
        this.add.particles(0, 0, 'particle_spark', {
            x:         { min: 0, max: w },
            y:         { min: 0, max: h },
            speed:     { min: 2, max: 10 },
            angle:     { min: 0, max: 360 },
            scale:     { start: 0.15, end: 0 },
            alpha:     { start: 0.18, end: 0 },
            lifespan:  9000,
            frequency: 180,
            quantity:  1,
            blendMode: 'ADD',
        });

        // Decorative horizontal lines flanking the title area
        const deco = this.add.graphics();
        deco.lineStyle(1, COLORS.GOLD_DIM, 0.45);
        deco.beginPath(); deco.moveTo(w / 2 - 280, h / 2 - 155); deco.lineTo(w / 2 + 280, h / 2 - 155); deco.strokePath();
        deco.beginPath(); deco.moveTo(w / 2 - 280, h / 2 + 180); deco.lineTo(w / 2 + 280, h / 2 + 180); deco.strokePath();
    }

    // "DEFEATED" title with glow layer, animated in
    createTitle(w, h) {
        const titleY = h / 2 - 210;

        // Glow copy behind the main text
        const glow = this.add.text(w / 2, titleY, 'DEFEATED', {
            fontFamily: 'Cinzel, serif',
            fontSize: '74px',
            fontStyle: 'bold',
            color: '#cc2222',
            stroke: '#880000',
            strokeThickness: 14,
        }).setOrigin(0.5).setAlpha(0).setBlendMode('ADD');

        const title = this.add.text(w / 2, titleY, 'DEFEATED', {
            fontFamily: 'Cinzel, serif',
            fontSize: '74px',
            fontStyle: 'bold',
            color: '#ff4444',
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
    }

    // Which arena and its difficulty label
    createArenaInfo(w, h, element, colors, difficulty) {
        const infoY = h / 2 - 130;

        let arenaName  = 'Unknown Arena';
        let diffLabel  = '';
        let nameColor  = '#888888';

        if (element && colors && difficulty) {
            arenaName = `${ELEMENT_NAMES[element]} ARENA`;
            diffLabel = `Difficulty: ${difficulty.label}`;
            nameColor = Phaser.Display.Color.IntegerToColor(colors.primary).rgba;
        }

        const arenaText = this.add.text(w / 2, infoY, arenaName, {
            fontFamily: 'Cinzel, serif',
            fontSize: '26px',
            fontStyle: 'bold',
            color: nameColor,
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({ targets: arenaText, alpha: 1, duration: 600, delay: 300 });

        if (diffLabel) {
            const diffText = this.add.text(w / 2, infoY + 36, diffLabel, {
                fontFamily: 'Cinzel, serif',
                fontSize: '15px',
                color: '#666666',
                stroke: '#000000',
                strokeThickness: 2,
            }).setOrigin(0.5).setAlpha(0);

            this.tweens.add({ targets: diffText, alpha: 1, duration: 500, delay: 450 });
        }
    }

    // Run stats from arenaData: kills, score, boss status, HP restores used
    createStats(w, h, arenaData) {
        const centerX = w / 2;
        const startY  = h / 2 - 72;
        const rowH    = 36;

        const stats = [
            {
                label: 'Enemies Slain',
                value: `${arenaData.kills}`,
                color: '#cccccc',
            },
            {
                label: 'Score',
                value: `${arenaData.score}`,
                color: '#ffd700',
            },
            {
                label: 'Boss',
                value: arenaData.bossDefeated ? 'Defeated' : 'Not reached',
                color: arenaData.bossDefeated ? '#22dd44' : '#884444',
            },
            {
                label: 'HP Restores Used',
                value: `${arenaData.hpRestoresUsed}`,
                color: '#cccccc',
            },
        ];

        stats.forEach((stat, i) => {
            const y     = startY + i * rowH;
            const delay = 500 + i * 100;

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
    }

    // Cumulative totals across all arenas so far
    createProgressSummary(w, h) {
        const summaryY = h / 2 + 88;

        const completedCount = GameState.completedElements.length;
        const totalArenas    = 4;
        const progressStr    = completedCount > 0
            ? `Arenas Completed: ${completedCount} / ${totalArenas}  ·  Total Score: ${GameState.totalScore}`
            : `Total Score: ${GameState.totalScore}`;

        const summary = this.add.text(w / 2, summaryY, progressStr, {
            fontFamily: 'Cinzel, serif',
            fontSize: '13px',
            color: '#555555',
            stroke: '#000000',
            strokeThickness: 1,
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({ targets: summary, alpha: 1, duration: 500, delay: 1000 });

        // HP restores remaining hint (relevant since they persist between arenas)
        const restoreHint = this.add.text(w / 2, summaryY + 24,
            `HP Restores Remaining: ${GameState.hpRestoreCount}`,
            {
                fontFamily: 'Cinzel, serif',
                fontSize: '13px',
                color: '#336633',
                stroke: '#000000',
                strokeThickness: 1,
            }
        ).setOrigin(0.5).setAlpha(0);

        this.tweens.add({ targets: restoreHint, alpha: 1, duration: 500, delay: 1100 });
    }

    // Two buttons: Try Again and Return to Hub
    createButtons(w, h, element) {
        const btnY    = h / 2 + 148;
        const btnW    = 220;
        const btnH    = 52;
        const gap     = 30;

        // ---- Try Again ---- (only shown if there is an element to retry)
        if (element) {
            const tryX = w / 2 - btnW / 2 - gap / 2;
            this.createButton(tryX, btnY, btnW, btnH, 'TRY AGAIN', '[R]', 0x2a1a1a, 0xcc3333,
                1100, () => this.tryAgain(element));
        }

        // ---- Return to Hub ----
        const hubX = element ? w / 2 + btnW / 2 + gap / 2 : w / 2;
        this.createButton(hubX, btnY, btnW, btnH, 'RETURN TO HUB', '[ENTER]', 0x1a1a2a, COLORS.GOLD,
            1200, () => this.goToHub());
    }

    // Reusable button builder matching HubScene/MenuScene visual style
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

        // Hit zone
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

    // Restart the same arena — GameState.currentElement and arenaData are reset
    tryAgain(element) {
        if (!element) return;

        playMenuSelect();

        // Reset arena data for a fresh run
        GameState.arenaData = { kills: 0, score: 0, bossDefeated: false, hpRestoresUsed: 0 };

        const sceneKey = `Arena${element.charAt(0).toUpperCase() + element.slice(1)}Scene`;

        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.time.delayedCall(500, () => this.scene.start(sceneKey));
    }

    goToHub() {
        playMenuSelect();
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.time.delayedCall(500, () => this.scene.start('HubScene'));
    }
}
