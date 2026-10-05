// ============================================================
//  UPGRADE SCENE — Roguelite upgrade selection between arenas
// ============================================================

class UpgradeScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UpgradeScene' });
    }

    create() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        const available = UPGRADE_POOL.filter(u => !GameState.upgrades.includes(u.id));
        if (available.length === 0) {
            this.scene.start('HubScene');
            return;
        }

        // Fisher-Yates shuffle then take up to 3
        for (let i = available.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [available[i], available[j]] = [available[j], available[i]];
        }
        this.cards = available.slice(0, Math.min(3, available.length));
        this._selecting = false;

        this.cameras.main.setBackgroundColor(COLORS.BG_DARK);
        this.cameras.main.fadeIn(500, 10, 10, 15);

        this.createBackground(w, h);
        this.createHeader(w, h);
        this.createCards(w, h);
        this.setupKeyboard();
    }

    createBackground(w, h) {
        const bg = this.add.graphics();
        bg.fillStyle(0x0f0f1a, 1);
        bg.fillRect(0, 0, w, h);

        bg.lineStyle(1, 0x1a1a2e, 0.4);
        for (let x = 0; x < w; x += 80) {
            bg.beginPath(); bg.moveTo(x, 0); bg.lineTo(x, h); bg.strokePath();
        }
        for (let y = 0; y < h; y += 80) {
            bg.beginPath(); bg.moveTo(0, y); bg.lineTo(w, y); bg.strokePath();
        }

        // Ambient gold drift particles
        this.add.particles(0, 0, 'particle_circle', {
            x:         { min: 0, max: w },
            y:         { min: 0, max: h },
            speed:     { min: 3, max: 14 },
            angle:     { min: 0, max: 360 },
            scale:     { start: 0.25, end: 0 },
            alpha:     { start: 0.1, end: 0 },
            tint:      [0xc8a84e, 0xffd700],
            lifespan:  8000,
            frequency: 280,
            quantity:  1,
            blendMode: 'ADD',
        });
    }

    createHeader(w, h) {
        this.add.text(w / 2, 48, 'POWER ASCENDING', {
            fontFamily:      'Cinzel, serif',
            fontSize:        '40px',
            fontStyle:       'bold',
            color:           '#c8a84e',
            stroke:          '#000000',
            strokeThickness: 6,
            shadow: { offsetX: 3, offsetY: 3, color: '#000', blur: 10, fill: true },
        }).setOrigin(0.5);

        this.add.text(w / 2, 105, 'Arena cleared!  Choose one upgrade — it persists for the entire run.', {
            fontFamily:      'Cinzel, serif',
            fontSize:        '15px',
            color:           '#888888',
            stroke:          '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5);

        const deco = this.add.graphics();
        deco.lineStyle(2, COLORS.GOLD, 0.3);
        deco.beginPath();
        deco.moveTo(w / 2 - 340, 128);
        deco.lineTo(w / 2 + 340, 128);
        deco.strokePath();

        // Show already-chosen upgrades as small chips under the divider
        if (GameState.upgrades.length > 0) {
            const names = GameState.upgrades
                .map(id => UPGRADE_POOL.find(u => u.id === id)?.name)
                .filter(Boolean)
                .join('  ·  ');
            this.add.text(w / 2, 148, `Active: ${names}`, {
                fontFamily:      'Cinzel, serif',
                fontSize:        '12px',
                color:           '#c8a84e',
                stroke:          '#000000',
                strokeThickness: 1,
            }).setOrigin(0.5);
        }
    }

    createCards(w, h) {
        const CARD_W = 300;
        const CARD_H = 330;
        const GAP    = 44;
        const n      = this.cards.length;
        const totalW = n * CARD_W + (n - 1) * GAP;
        const startX = (w - totalW) / 2;
        const cardCY = h / 2 + 60;

        this.cards.forEach((upgrade, i) => {
            const cx  = startX + i * (CARD_W + GAP) + CARD_W / 2;
            const cy  = cardCY;
            const top = cy - CARD_H / 2;

            // Background frame
            const frame = this.add.graphics();
            frame.fillStyle(0x141428, 1);
            frame.fillRoundedRect(cx - CARD_W / 2, top, CARD_W, CARD_H, 14);
            frame.lineStyle(2, 0x5a4a2a, 0.8);
            frame.strokeRoundedRect(cx - CARD_W / 2, top, CARD_W, CARD_H, 14);

            // Hover glow (hidden until pointerover)
            const glow = this.add.graphics();
            glow.fillStyle(COLORS.GOLD, 0.07);
            glow.fillRoundedRect(cx - CARD_W / 2 - 3, top - 3, CARD_W + 6, CARD_H + 6, 16);
            glow.lineStyle(2, COLORS.GOLD, 1);
            glow.strokeRoundedRect(cx - CARD_W / 2 - 3, top - 3, CARD_W + 6, CARD_H + 6, 16);
            glow.setAlpha(0);

            // Number badge
            const numBadge = this.add.text(cx, top + 34, `${i + 1}`, {
                fontFamily:      'Cinzel, serif',
                fontSize:        '28px',
                fontStyle:       'bold',
                color:           '#c8a84e',
                stroke:          '#000000',
                strokeThickness: 4,
            }).setOrigin(0.5);

            // Name
            const nameText = this.add.text(cx, top + 92, upgrade.name, {
                fontFamily:      'Cinzel, serif',
                fontSize:        '21px',
                fontStyle:       'bold',
                color:           '#ffffff',
                stroke:          '#000000',
                strokeThickness: 3,
            }).setOrigin(0.5);

            // Divider
            const div = this.add.graphics();
            div.lineStyle(1, COLORS.GOLD, 0.35);
            div.beginPath();
            div.moveTo(cx - CARD_W / 2 + 28, top + 118);
            div.lineTo(cx + CARD_W / 2 - 28, top + 118);
            div.strokePath();

            // Description
            const descText = this.add.text(cx, top + 190, upgrade.desc, {
                fontFamily:      'Cinzel, serif',
                fontSize:        '14px',
                color:           '#aaaaaa',
                stroke:          '#000000',
                strokeThickness: 1,
                wordWrap:        { width: CARD_W - 44 },
                align:           'center',
            }).setOrigin(0.5, 0.5);

            // Select button
            const btnY   = top + CARD_H - 52;
            const selBtn = this.add.graphics();
            selBtn.fillStyle(0x2a2a3e, 1);
            selBtn.fillRoundedRect(cx - 76, btnY - 19, 152, 38, 9);
            selBtn.lineStyle(2, COLORS.GOLD, 0.7);
            selBtn.strokeRoundedRect(cx - 76, btnY - 19, 152, 38, 9);

            const selText = this.add.text(cx, btnY, 'SELECT', {
                fontFamily:      'Cinzel, serif',
                fontSize:        '16px',
                fontStyle:       'bold',
                color:           '#ffffff',
                stroke:          '#000000',
                strokeThickness: 2,
            }).setOrigin(0.5);

            // Interactive hit zone over the whole card
            const zone = this.add.zone(cx, cy, CARD_W, CARD_H)
                .setInteractive({ useHandCursor: true });

            zone.on('pointerover', () => {
                glow.setAlpha(1);
                selText.setColor('#ffd700');
            });
            zone.on('pointerout', () => {
                glow.setAlpha(0);
                selText.setColor('#ffffff');
            });
            zone.on('pointerdown', () => this.selectUpgrade(upgrade));

            // Entrance fade-in (glow excluded — it stays at 0 until hover)
            const animObjs = [frame, numBadge, nameText, div, descText, selBtn, selText];
            animObjs.forEach(o => o.setAlpha(0));
            this.tweens.add({
                targets:  animObjs,
                alpha:    1,
                duration: 420,
                delay:    120 + i * 130,
            });
        });

        // Key-press hint at the bottom
        const keys = ['1', '2', '3'].slice(0, n).join('  ·  ');
        this.add.text(w / 2, h - 28, `Click a card  or press  ${keys}  to choose`, {
            fontFamily:      'Cinzel, serif',
            fontSize:        '14px',
            color:           '#555555',
            stroke:          '#000000',
            strokeThickness: 1,
        }).setOrigin(0.5);
    }

    selectUpgrade(upgrade) {
        if (this._selecting) return;
        this._selecting = true;

        GameState.upgrades.push(upgrade.id);

        // One-time effects applied immediately on pick
        if (upgrade.id === 'hp_restore_charge') {
            GameState.hpRestoreCount++;
        }

        playUpgrade();

        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        this.cameras.main.flash(500, 200, 160, 20, false);

        const msg = this.add.text(w / 2, h / 2, `✦  ${upgrade.name}  ✦`, {
            fontFamily:      'Cinzel, serif',
            fontSize:        '40px',
            fontStyle:       'bold',
            color:           '#ffd700',
            stroke:          '#000000',
            strokeThickness: 7,
        }).setOrigin(0.5).setDepth(80).setAlpha(0);

        const sub = this.add.text(w / 2, h / 2 + 58, 'Acquired!', {
            fontFamily:      'Cinzel, serif',
            fontSize:        '22px',
            color:           '#c8a84e',
            stroke:          '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5).setDepth(80).setAlpha(0);

        this.tweens.add({ targets: [msg, sub], alpha: 1, y: '-=10', duration: 380 });

        this.time.delayedCall(1400, () => {
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(500, () => this.scene.start('HubScene'));
        });
    }

    setupKeyboard() {
        this.input.keyboard.on('keydown-ONE',   () => { if (this.cards[0]) this.selectUpgrade(this.cards[0]); });
        this.input.keyboard.on('keydown-TWO',   () => { if (this.cards[1]) this.selectUpgrade(this.cards[1]); });
        this.input.keyboard.on('keydown-THREE', () => { if (this.cards[2]) this.selectUpgrade(this.cards[2]); });
    }
}
