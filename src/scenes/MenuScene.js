// ============================================================
//  MENU SCENE — Professional Main Menu
// ============================================================

class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        // Black background
        this.cameras.main.setBackgroundColor(COLORS.BG_DARK);

        // ---- Ambient particle background ----
        this.ambientParticles = this.add.particles(0, 0, 'particle_circle', {
            x: { min: 0, max: w },
            y: { min: 0, max: h },
            speed: { min: 5, max: 20 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.3, end: 0 },
            alpha: { start: 0.15, end: 0 },
            lifespan: 6000,
            frequency: 200,
            quantity: 1,
            blendMode: 'ADD',
        });

        // ---- Background Particles ----
        this.bgStars = this.add.particles(0, 0, 'particle_spark', {
            x: { min: 0, max: w },
            y: { min: 0, max: h },
            speed: { min: 2, max: 8 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.2, end: 0 },
            alpha: { start: 0.2, end: 0 },
            lifespan: 8000,
            frequency: 150,
            quantity: 1,
            blendMode: 'ADD',
        });

        // ---- Elemental Symbols in Corners ----
        this.createCornerSymbols(w, h);

        // ---- Decorative Line ----
        const deco = this.add.graphics();
        deco.lineStyle(2, COLORS.GOLD, 0.4);
        deco.beginPath();
        deco.moveTo(w / 2 - 200, h / 2 - 100);
        deco.lineTo(w / 2 + 200, h / 2 - 100);
        deco.strokePath();

        // ---- Title ----
        this.titleText = this.add.text(w / 2, h / 2 - 60, 'ELEMENTAL\nTRIALS', {
            fontFamily: 'Cinzel, serif',
            fontSize: '72px',
            fontStyle: 'bold',
            color: '#c8a84e',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 8,
            shadow: { offsetX: 4, offsetY: 4, color: '#000', blur: 12, fill: true },
        }).setOrigin(0.5).setAlpha(0);

        // Title glow effect
        this.titleGlow = this.add.text(w / 2, h / 2 - 60, 'ELEMENTAL\nTRIALS', {
            fontFamily: 'Cinzel, serif',
            fontSize: '72px',
            fontStyle: 'bold',
            color: '#ffd700',
            align: 'center',
            stroke: '#c8a84e',
            strokeThickness: 12,
        }).setOrigin(0.5).setAlpha(0).setBlendMode('ADD');

        // Animate title in
        this.tweens.add({
            targets: [this.titleText, this.titleGlow],
            alpha: 1,
            duration: 1500,
            ease: 'Power2',
        });

        // Subtle floating animation for title
        this.tweens.add({
            targets: [this.titleText, this.titleGlow],
            y: h / 2 - 65,
            duration: 2500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // ---- Subtitle ----
        this.subText = this.add.text(w / 2, h / 2 + 30, 'Master the Four Elements', {
            fontFamily: 'Cinzel, serif',
            fontSize: '22px',
            color: '#888888',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: this.subText,
            alpha: 1,
            duration: 1000,
            delay: 800,
        });

        // ---- Start Button ----
        this.createStartButton(w, h);

        // ---- Instructions ----
        this.instructions = this.add.text(w / 2, h / 2 + 160, 'WASD · SPACE Attack · Q Special · E Dash', {
            fontFamily: 'Cinzel, serif',
            fontSize: '14px',
            color: '#555555',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: this.instructions,
            alpha: 1,
            duration: 800,
            delay: 1600,
        });

        // ---- Version Text ----
        this.add.text(w - 10, h - 10, 'v1.0', {
            fontFamily: 'Cinzel, serif',
            fontSize: '12px',
            color: '#333333',
        }).setOrigin(1, 1);

        // ---- Input ----
        this.input.keyboard.on('keydown-ENTER', () => this.startGame());
        this.input.keyboard.on('keydown-SPACE', () => this.startGame());

        // Click on start
        this.startBtn.setInteractive({ useHandCursor: true });
        this.startBtn.on('pointerover', () => this.onButtonHover(true));
        this.startBtn.on('pointerout', () => this.onButtonHover(false));
        this.startBtn.on('pointerdown', () => this.startGame());

        // Fade in from black
        this.cameras.main.fadeIn(800, 10, 10, 15);
    }

    createCornerSymbols(w, h) {
        const elements = ['fire', 'water', 'earth', 'air'];
        const positions = [
            { x: 80, y: 80 },
            { x: w - 80, y: 80 },
            { x: 80, y: h - 80 },
            { x: w - 80, y: h - 80 },
        ];

        this.cornerSymbols = [];
        elements.forEach((elem, i) => {
            const pos = positions[i];
            const colors = ELEMENT_COLORS[elem];
            const sym = this.add.image(pos.x, pos.y, `symbol_${elem}`);
            sym.setAlpha(0.3);
            sym.setScale(0);

            this.tweens.add({
                targets: sym,
                scale: 1,
                alpha: 0.4,
                duration: 800,
                delay: 200 + i * 150,
                ease: 'Back.easeOut',
            });

            // Slow rotation
            this.tweens.add({
                targets: sym,
                angle: 360,
                duration: 20000 + i * 5000,
                repeat: -1,
            });

            // Pulsing glow
            const glow = this.add.graphics();
            const glowColor = colors.glow;
            this.tweens.addCounter({
                from: 0,
                to: 1,
                duration: 2000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                onUpdate: (tween) => {
                    glow.clear();
                    const a = 0.1 + tween.getValue() * 0.15;
                    glow.fillStyle(glowColor, a);
                    glow.fillCircle(pos.x, pos.y, 45);
                }
            });

            this.cornerSymbols.push(sym);
        });
    }

    createStartButton(w, h) {
        // Button background
        const btnY = h / 2 + 100;
        const btnW = 220;
        const btnH = 55;

        this.startBtnBg = this.add.graphics();
        this.startBtnBg.fillStyle(0x2a2a3e, 1);
        this.startBtnBg.fillRoundedRect(w / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 12);
        this.startBtnBg.lineStyle(2, COLORS.GOLD, 0.8);
        this.startBtnBg.strokeRoundedRect(w / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 12);
        this.startBtnBg.setAlpha(0);

        // Button glow
        this.btnGlow = this.add.graphics();
        this.btnGlow.setAlpha(0);

        // Button text
        this.startBtn = this.add.text(w / 2, btnY, 'START GAME', {
            fontFamily: 'Cinzel, serif',
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5).setAlpha(0);

        this.btnY = btnY;
        this.btnW = btnW;
        this.btnH = btnH;

        // Animate button in
        this.tweens.add({
            targets: [this.startBtnBg, this.startBtn],
            alpha: 1,
            duration: 800,
            delay: 1200,
            onComplete: () => {
                // Pulse glow
                this.tweens.add({
                    targets: this.btnGlow,
                    alpha: 1,
                    duration: 1500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                });

                // Pulsing animation
                this.tweens.add({
                    targets: this.startBtn,
                    scale: 1.03,
                    duration: 1200,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                });
                this.tweens.add({
                    targets: this.startBtnBg,
                    scale: 1.01,
                    duration: 1200,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                });
            }
        });

        // Hit area for the button
        this.startBtn.setInteractive(new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, btnW, btnH), Phaser.Geom.Rectangle.Contains);

        // Initial glow pulse
        this.time.addEvent({
            delay: 50,
            callback: () => {
                const t = this.time.now / 1000;
                this.btnGlow.clear();
                const pulse = 0.1 + Math.sin(t * 2) * 0.05 + 0.05;
                this.btnGlow.fillStyle(COLORS.GOLD, pulse);
                this.btnGlow.fillRoundedRect(
                    w / 2 - btnW / 2 - 6,
                    btnY - btnH / 2 - 6,
                    btnW + 12,
                    btnH + 12,
                    16
                );
            },
            loop: true,
        });
    }

    onButtonHover(isHover) {
        if (isHover) {
            this.tweens.add({
                targets: this.startBtn,
                scale: 1.08,
                duration: 150,
                ease: 'Power2',
            });
            this.tweens.add({
                targets: this.startBtnBg,
                scale: 1.04,
                duration: 150,
                ease: 'Power2',
            });
        } else {
            this.tweens.add({
                targets: this.startBtn,
                scale: 1.03,
                duration: 150,
                ease: 'Power2',
            });
            this.tweens.add({
                targets: this.startBtnBg,
                scale: 1.01,
                duration: 150,
                ease: 'Power2',
            });
        }
    }

    startGame() {
        playMenuSelect();
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.time.delayedCall(500, () => {
            this.scene.start('HubScene');
        });
    }

    update() {
        // Update floating particles
        if (this.btnGlow && this.startBtnBg && this.startBtnBg.active) {
            const w = this.cameras.main.width;
            const t = this.time.now / 1000;
            this.btnGlow.clear();
            const pulse = 0.15 + Math.sin(t * 1.8) * 0.08;
            this.btnGlow.fillStyle(COLORS.GOLD, pulse);
            this.btnGlow.fillRoundedRect(
                w / 2 - this.btnW / 2 - 6,
                this.btnY - this.btnH / 2 - 6,
                this.btnW + 12,
                this.btnH + 12,
                16
            );
        }
    }
}
