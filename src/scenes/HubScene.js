// ============================================================
//  HUB SCENE — Element Selection
// ============================================================

class HubScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HubScene' });
    }

    create() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        this.cameras.main.setBackgroundColor(COLORS.BG_DARK);
        this.cameras.main.fadeIn(600, 10, 10, 15);

        // ---- Background ----
        this.createBackground(w, h);

        // ---- Title ----
        this.add.text(w / 2, 50, 'CHOOSE YOUR PATH', {
            fontFamily: 'Cinzel, serif',
            fontSize: '36px',
            fontStyle: 'bold',
            color: '#c8a84e',
            stroke: '#000000',
            strokeThickness: 5,
        }).setOrigin(0.5);

        // ---- Player Stats ----
        this.createStatsDisplay(w, h);

        // ---- Gates ----
        this.gates = [];
        this.createGates(w, h);

        // ---- Back button ----
        this.createBackButton(w, h);

        // ---- Input ----
        this.input.keyboard.on('keydown-ESC', () => {
            this.cameras.main.fadeOut(400, 0, 0, 0);
            this.time.delayedCall(400, () => this.scene.start('MenuScene'));
        });
    }

    createBackground(w, h) {
        // Dark temple floor
        const bg = this.add.graphics();
        bg.fillStyle(0x0f0f1a, 1);
        bg.fillRect(0, 0, w, h);

        // Floor lines
        bg.lineStyle(1, 0x1a1a2e, 0.5);
        for (let x = 0; x < w; x += 80) {
            bg.beginPath();
            bg.moveTo(x, 0);
            bg.lineTo(x, h);
            bg.strokePath();
        }
        for (let y = 0; y < h; y += 80) {
            bg.beginPath();
            bg.moveTo(0, y);
            bg.lineTo(w, y);
            bg.strokePath();
        }

        // Central circle
        bg.lineStyle(2, 0x2a2a3e, 0.3);
        bg.strokeCircle(w / 2, h / 2, 180);

        // Ambient particles
        this.add.particles(0, 0, 'particle_circle', {
            x: { min: 0, max: w },
            y: { min: 0, max: h },
            speed: { min: 3, max: 12 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.2, end: 0 },
            alpha: { start: 0.1, end: 0 },
            lifespan: 8000,
            frequency: 300,
            quantity: 1,
            blendMode: 'ADD',
        });
    }

    createStatsDisplay(w, h) {
        // Top-right stats
        const statsX = w - 200;
        const statsY = 40;

        this.add.text(statsX, statsY, 'WARRIOR STATS', {
            fontFamily: 'Cinzel, serif',
            fontSize: '14px',
            color: '#888888',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5, 0);

        const killText = this.add.text(statsX, statsY + 28, `Kills: ${GameState.totalKills}`, {
            fontFamily: 'Cinzel, serif',
            fontSize: '16px',
            color: '#cccccc',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5, 0);

        const bossText = this.add.text(statsX, statsY + 50, `Bosses: ${GameState.totalBossesDefeated}`, {
            fontFamily: 'Cinzel, serif',
            fontSize: '16px',
            color: '#cccccc',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5, 0);

        const scoreText = this.add.text(statsX, statsY + 72, `Score: ${GameState.totalScore}`, {
            fontFamily: 'Cinzel, serif',
            fontSize: '16px',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5, 0);

        // Completion status
        if (GameState.completedElements.length > 0) {
            const completedStr = GameState.completedElements
                .map(e => e.charAt(0).toUpperCase() + e.slice(1))
                .join(', ');
            this.add.text(statsX, statsY + 100, `Completed: ${completedStr}`, {
                fontFamily: 'Cinzel, serif',
                fontSize: '12px',
                color: '#c8a84e',
                stroke: '#000000',
                strokeThickness: 2,
            }).setOrigin(0.5, 0);
        }

        // HP Restores left
        this.add.text(statsX, statsY + 120, `HP Restores: ${GameState.hpRestoreCount}`, {
            fontFamily: 'Cinzel, serif',
            fontSize: '12px',
            color: '#22dd44',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5, 0);
    }

    createGates(w, h) {
        // 4 gates in a 2x2 grid with some spacing
        const cols = 2;
        const gateW = 240;
        const gateH = 300;
        const gapX = 40;
        const gapY = 30;
        const totalW = cols * gateW + (cols - 1) * gapX;
        const totalH = 2 * gateH + gapY;

        const startX = (w - totalW) / 2 + gateW / 2;
        const startY = (h - totalH) / 2 + 20;

        ELEMENT_ORDER.forEach((element, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const gx = startX + col * (gateW + gapX);
            const gy = startY + row * (gateH + gapY);

            this.createGate(gx, gy, element, index);
        });
    }

    createGate(x, y, element, index) {
        const colors = ELEMENT_COLORS[element];
        const difficulty = ARENA_DIFFICULTY[element];
        const isCompleted = GameState.completedElements.includes(element);
        const isNext = !isCompleted && (
            GameState.completedElements.length === 0 ||
            ELEMENT_ORDER.indexOf(element) === GameState.completedElements.length
        );
        const isLocked = !isCompleted && !isNext;

        // Gate background frame
        const frame = this.add.image(x, y, 'gate_frame').setAlpha(0);
        this.tweens.add({
            targets: frame,
            alpha: 1,
            duration: 500,
            delay: 200 + index * 100,
        });

        // Element symbol inside gate
        const symbol = this.add.image(x, y - 20, `symbol_${element}`)
            .setScale(1.5)
            .setAlpha(0);

        this.tweens.add({
            targets: symbol,
            alpha: 0.9,
            scale: 1.3,
            duration: 600,
            delay: 300 + index * 100,
            ease: 'Back.easeOut',
        });

        // Continuous rotation
        this.tweens.add({
            targets: symbol,
            angle: 360,
            duration: 15000,
            repeat: -1,
        });

        // Element-specific ambient particles on the gate
        const particleKey = `particle_${element}`;
        const gateParticles = this.add.particles(x, y, particleKey, {
            x: { min: -80, max: 80 },
            y: { min: -100, max: 100 },
            speed: { min: 5, max: 25 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.4, end: 0 },
            lifespan: 2000,
            frequency: 100,
            quantity: 1,
            blendMode: 'ADD',
        });

        // Gate glow
        const gateGlow = this.add.graphics();
        this.tweens.addCounter({
            from: 0,
            to: 1,
            duration: 2500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            onUpdate: (tween) => {
                gateGlow.clear();
                const a = 0.08 + tween.getValue() * 0.1;
                gateGlow.fillStyle(colors.glow, a);
                gateGlow.fillRoundedRect(x - 120, y - 150, 240, 300, 16);
            }
        });

        // ---- Labels ----
        const nameText = this.add.text(x, y + 60, ELEMENT_NAMES[element], {
            fontFamily: 'Cinzel, serif',
            fontSize: '22px',
            fontStyle: 'bold',
            color: Phaser.Display.Color.IntegerToColor(colors.primary).rgba,
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: nameText,
            alpha: 1,
            duration: 400,
            delay: 500 + index * 100,
        });

        const diffText = this.add.text(x, y + 88, `Difficulty: ${difficulty.label}`, {
            fontFamily: 'Cinzel, serif',
            fontSize: '13px',
            color: '#aaaaaa',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: diffText,
            alpha: 1,
            duration: 400,
            delay: 600 + index * 100,
        });

        const enemyText = this.add.text(x, y + 108, `Enemies: ${ENEMIES_PER_ARENA}`, {
            fontFamily: 'Cinzel, serif',
            fontSize: '13px',
            color: '#aaaaaa',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: enemyText,
            alpha: 1,
            duration: 400,
            delay: 700 + index * 100,
        });

        // Status label
        let statusText = null;
        if (isCompleted) {
            statusText = this.add.text(x, y + 135, '✓ COMPLETED', {
                fontFamily: 'Cinzel, serif',
                fontSize: '14px',
                fontStyle: 'bold',
                color: '#22dd44',
                stroke: '#000000',
                strokeThickness: 3,
            }).setOrigin(0.5);
        } else if (isLocked) {
            statusText = this.add.text(x, y + 135, '🔒 LOCKED', {
                fontFamily: 'Cinzel, serif',
                fontSize: '14px',
                fontStyle: 'bold',
                color: '#666666',
                stroke: '#000000',
                strokeThickness: 3,
            }).setOrigin(0.5);
        }

        // Interactive area
        const hitZone = this.add.zone(x, y, 240, 300).setInteractive({ useHandCursor: !isLocked });

        hitZone.on('pointerover', () => {
            if (isLocked) return;
            this.tweens.add({ targets: [frame, symbol], scale: 1.05, duration: 150, ease: 'Power2' });
            this.tweens.add({ targets: nameText, scale: 1.1, duration: 150 });
            // Stronger glow
            gateGlow.clear();
            gateGlow.fillStyle(colors.glow, 0.25);
            gateGlow.fillRoundedRect(x - 120, y - 150, 240, 300, 16);
        });

        hitZone.on('pointerout', () => {
            if (isLocked) return;
            this.tweens.add({ targets: [frame, symbol], scale: 1, duration: 150, ease: 'Power2' });
            this.tweens.add({ targets: nameText, scale: 1, duration: 150 });
        });

        hitZone.on('pointerdown', () => {
            if (isLocked) return;
            this.selectGate(element);
        });

        // Store references
        this.gates.push({ element, frame, symbol, hitZone, particles: gateParticles });
    }

    selectGate(element) {
        playMenuSelect();
        GameState.currentElement = element;
        GameState.arenaData = { kills: 0, score: 0, bossDefeated: false, hpRestoresUsed: 0 };

        const sceneKey = `Arena${element.charAt(0).toUpperCase() + element.slice(1)}Scene`;

        // Transition effect
        this.cameras.main.fadeOut(600, 0, 0, 0);
        this.time.delayedCall(600, () => {
            this.scene.start(sceneKey);
        });
    }

    createBackButton(w, h) {
        const backText = this.add.text(20, h - 30, '< BACK', {
            fontFamily: 'Cinzel, serif',
            fontSize: '16px',
            color: '#888888',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

        backText.on('pointerover', () => backText.setColor('#c8a84e'));
        backText.on('pointerout', () => backText.setColor('#888888'));
        backText.on('pointerdown', () => {
            this.cameras.main.fadeOut(400, 0, 0, 0);
            this.time.delayedCall(400, () => this.scene.start('MenuScene'));
        });
    }
}
