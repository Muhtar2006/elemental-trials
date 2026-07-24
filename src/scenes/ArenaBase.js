// ============================================================
//  ARENA BASE — Shared combat logic for all four arenas
//
//  Subclasses set only their Phaser scene key in the constructor.
//  Everything else is driven by GameState.currentElement, which
//  HubScene writes before calling scene.start(sceneKey).
// ============================================================

class ArenaBase extends Phaser.Scene {
    constructor(config) {
        // config is { key: 'ArenaBase' } or the subclass key
        super(config);
    }

    // -------------------------------------------------------
    //  LIFECYCLE
    // -------------------------------------------------------

    create() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        // Pull element and difficulty from the global state HubScene wrote
        this.element    = GameState.currentElement;
        this.difficulty = ARENA_DIFFICULTY[this.element];
        this.colors     = ELEMENT_COLORS[this.element];

        // ---- Arena counters ----
        this.enemiesSpawned  = 0;
        this.enemiesKilled   = 0;
        this.bossSpawned     = false;
        this.bossDefeated    = false;
        this.arenaScore      = 0;
        this.gameOver        = false;
        this.paused          = false;

        // ---- Player state ----
        this.playerHP        = PLAYER.MAX_HP;
        this.playerPower     = 0;       // builds from kills; fuels Q special
        this.lastAttackTime  = 0;
        this.lastSpecialTime = 0;
        this.lastDashTime    = 0;
        this.isDashing       = false;
        this.isInvincible    = false;

        // ---- Boss state ----
        this.boss            = null;
        this.bossCharging    = false;
        this._lastBossCharge = 0;

        // Build the scene
        this.createBackground(w, h);
        this.createPlayer(w, h);
        this.createEnemyGroup();
        this.createProjectileGroup();
        this.createUI(w, h);
        this.setupInput();
        this.setupPhysics();

        // Spawn first enemy after a short intro delay, then on the interval
        this.time.delayedCall(800, () => this.spawnEnemy());
        this.spawnTimer = this.time.addEvent({
            delay: this.difficulty.spawnInterval,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true,
        });

        this.cameras.main.fadeIn(600, 10, 10, 15);
        this.input.keyboard.on('keydown-ESC', () => this.togglePause());
    }

    update(time, delta) {
        if (this.gameOver || this.paused) return;

        this.handleMovement();
        this.handleAttack(time);
        this.handleSpecial(time);
        this.handleDash(time);
        this.handleHPRestore();

        // Run AI for every live enemy
        this.enemies.getChildren().forEach(e => {
            if (e.active) this.updateEnemyAI(e);
        });

        // Run boss AI when the boss is alive
        if (this.boss && this.boss.active) {
            this.updateBossAI(time, delta);
        }

        this.updateUI();
    }

    // -------------------------------------------------------
    //  SCENE CONSTRUCTION
    // -------------------------------------------------------

    // Dark grid background with a glowing element-colored arena border
    createBackground(w, h) {
        const bg = this.add.graphics();
        bg.fillStyle(COLORS.BG_DARK, 1);
        bg.fillRect(0, 0, w, h);

        bg.lineStyle(1, COLORS.BG_MID, 0.35);
        for (let x = 0; x < w; x += 60) {
            bg.beginPath(); bg.moveTo(x, 0); bg.lineTo(x, h); bg.strokePath();
        }
        for (let y = 0; y < h; y += 60) {
            bg.beginPath(); bg.moveTo(0, y); bg.lineTo(w, y); bg.strokePath();
        }

        // Glowing arena border
        bg.lineStyle(3, this.colors.glow, 0.55);
        bg.strokeRect(22, 62, w - 44, h - 84);

        // Ambient element particles for atmosphere
        this.add.particles(0, 0, `particle_${this.element}`, {
            x:         { min: 30, max: w - 30 },
            y:         { min: 70, max: h - 30 },
            speed:     { min: 5, max: 18 },
            angle:     { min: 0, max: 360 },
            scale:     { start: 0.35, end: 0 },
            alpha:     { start: 0.15, end: 0 },
            lifespan:  5000,
            frequency: 280,
            quantity:  1,
            blendMode: 'ADD',
        });
    }

    // Player physics sprite, centered in the arena
    createPlayer(w, h) {
        this.player = this.physics.add.sprite(w / 2, h / 2, 'player');
        this.player.setCollideWorldBounds(true);
        this.player.setDepth(10);
    }

    // Physics group that holds all normal enemies
    createEnemyGroup() {
        this.enemies = this.physics.add.group();
    }

    // Physics group for special-attack projectiles (Q ability)
    createProjectileGroup() {
        this.projectiles = this.physics.add.group();
    }

    // HUD: HP bar, power bar, score, kill counter, boss HP bar
    createUI(w, h) {
        // ---- Player HP bar (top-left) ----
        this.hpBarBg   = this.add.image(10, 10, 'bar_bg').setOrigin(0, 0).setDepth(20);
        this.hpBarFill = this.add.image(10, 10, 'bar_hp').setOrigin(0, 0).setDepth(21);
        this.hpLabel   = this.add.text(14, 13, 'HP', {
            fontFamily: 'Cinzel, serif', fontSize: '11px', color: '#ffffff',
        }).setDepth(22);
        this.hpValueText = this.add.text(110, 13, '100/100', {
            fontFamily: 'Cinzel, serif', fontSize: '11px', color: '#ffffff',
        }).setOrigin(0.5, 0).setDepth(22);

        // ---- Power bar (below HP, narrower) ----
        // Uses bar_bg scaled vertically; fills with bar_power tinted to element color
        this.powerBarBg   = this.add.image(10, 34, 'bar_bg')
            .setOrigin(0, 0).setDepth(20).setScale(1, 0.55);
        this.powerBarFill = this.add.image(10, 34, 'bar_power')
            .setOrigin(0, 0).setDepth(21).setScale(0, 0.55);
        this.powerBarFill.setTint(this.colors.primary);
        this.add.text(14, 36, 'PWR', {
            fontFamily: 'Cinzel, serif', fontSize: '10px', color: '#aaaaaa',
        }).setDepth(22);

        // ---- HP restore hint ----
        this.hpRestoreHint = this.add.text(10, 50, `[R] Restore HP (${GameState.hpRestoreCount})`, {
            fontFamily: 'Cinzel, serif', fontSize: '11px', color: '#22dd44',
            stroke: '#000000', strokeThickness: 1,
        }).setDepth(20);

        // ---- Arena name (top-center) ----
        this.add.text(w / 2, 10, `${ELEMENT_NAMES[this.element]} ARENA`, {
            fontFamily: 'Cinzel, serif',
            fontSize: '14px',
            fontStyle: 'bold',
            color: Phaser.Display.Color.IntegerToColor(this.colors.primary).rgba,
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5, 0).setDepth(20);

        // ---- Score (top-center, below name) ----
        this.scoreText = this.add.text(w / 2, 30, 'Score: 0', {
            ...TEXT_STYLES.score, fontSize: '18px',
        }).setOrigin(0.5, 0).setDepth(20);

        // ---- Kill counter (top-right) ----
        this.killText = this.add.text(w - 10, 10, `Kills: 0 / ${ENEMIES_PER_ARENA}`, {
            fontFamily: 'Cinzel, serif', fontSize: '14px', color: '#cccccc',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(1, 0).setDepth(20);

        // ---- Boss HP bar (top-center, hidden until boss spawns) ----
        // bar_bg is 200px wide; scale 1.5x → 300px, centered around w/2
        const bossBarX = w / 2 - 150;
        this.bossHpBg   = this.add.image(bossBarX, 55, 'bar_bg')
            .setOrigin(0, 0).setDepth(20).setScale(1.5, 1).setVisible(false);
        this.bossHpFill = this.add.image(bossBarX, 55, 'bar_hp')
            .setOrigin(0, 0).setDepth(21).setScale(1.5, 1).setVisible(false);
        this.bossHpFill.setTint(this.colors.primary);
        this.bossLabel  = this.add.text(w / 2, 58, `${ELEMENT_NAMES[this.element]} BOSS`, {
            fontFamily: 'Cinzel, serif', fontSize: '11px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5, 0).setDepth(22).setVisible(false);
    }

    // WASD + SPACE/Q/E/R key bindings
    setupInput() {
        this.cursors = this.input.keyboard.addKeys({
            up:      Phaser.Input.Keyboard.KeyCodes.W,
            down:    Phaser.Input.Keyboard.KeyCodes.S,
            left:    Phaser.Input.Keyboard.KeyCodes.A,
            right:   Phaser.Input.Keyboard.KeyCodes.D,
            attack:  Phaser.Input.Keyboard.KeyCodes.SPACE,
            special: Phaser.Input.Keyboard.KeyCodes.Q,
            dash:    Phaser.Input.Keyboard.KeyCodes.E,
            restore: Phaser.Input.Keyboard.KeyCodes.R,
        });
    }

    // Persistent overlap checks — enemy-to-boss overlaps are wired in spawnBoss()
    setupPhysics() {
        this.physics.add.overlap(
            this.player, this.enemies,
            this.onPlayerEnemyOverlap, null, this
        );
        this.physics.add.overlap(
            this.projectiles, this.enemies,
            this.onProjectileHitEnemy, null, this
        );
    }

    // -------------------------------------------------------
    //  INPUT HANDLERS  (called every frame from update)
    // -------------------------------------------------------

    // WASD movement with diagonal normalisation
    handleMovement() {
        if (this.isDashing) return; // dash velocity takes over

        let vx = 0, vy = 0;
        if (this.cursors.left.isDown)  vx -= PLAYER.SPEED;
        if (this.cursors.right.isDown) vx += PLAYER.SPEED;
        if (this.cursors.up.isDown)    vy -= PLAYER.SPEED;
        if (this.cursors.down.isDown)  vy += PLAYER.SPEED;

        if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }

        this.player.setVelocity(vx, vy);
        if (vx < 0) this.player.setFlipX(true);
        if (vx > 0) this.player.setFlipX(false);
    }

    // SPACE — melee swing that hits everything within ATTACK_RANGE
    handleAttack(time) {
        if (!Phaser.Input.Keyboard.JustDown(this.cursors.attack)) return;
        if (time - this.lastAttackTime < PLAYER.ATTACK_COOLDOWN) return;

        this.lastAttackTime = time;
        playSwing();
        this.cameras.main.shake(50, 0.003);

        // Gain a little power on each swing
        this.playerPower = Math.min(100, this.playerPower + 5);

        const px = this.player.x;
        const py = this.player.y;

        // Hit normal enemies
        this.enemies.getChildren().forEach(enemy => {
            if (!enemy.active) return;
            if (distanceBetween(px, py, enemy.x, enemy.y) <= PLAYER.ATTACK_RANGE) {
                this.damageEnemy(enemy, PLAYER.ATTACK_DAMAGE);
            }
        });

        // Hit boss (slightly larger hitbox since the sprite is 80×80)
        if (this.boss && this.boss.active) {
            if (distanceBetween(px, py, this.boss.x, this.boss.y) <= PLAYER.ATTACK_RANGE + 24) {
                this.damageBoss(PLAYER.ATTACK_DAMAGE);
            }
        }
    }

    // Q — 8-directional projectile burst, costs SPECIAL_COST power
    handleSpecial(time) {
        if (!Phaser.Input.Keyboard.JustDown(this.cursors.special)) return;
        if (time - this.lastSpecialTime < PLAYER.SPECIAL_COOLDOWN) return;
        if (this.playerPower < PLAYER.SPECIAL_COST) return;

        this.lastSpecialTime = time;
        this.playerPower -= PLAYER.SPECIAL_COST;
        playSpecial();
        this.cameras.main.flash(180, 100, 50, 180, false);

        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const proj = this.projectiles.create(this.player.x, this.player.y, 'projectile');
            proj.setDepth(8);
            proj.setTint(this.colors.primary);
            proj.setVelocity(Math.cos(angle) * 420, Math.sin(angle) * 420);
            // Destroy automatically if it travels off-screen
            this.time.delayedCall(1400, () => { if (proj.active) proj.destroy(); });
        }
    }

    // E — short burst of speed with brief invincibility
    handleDash(time) {
        if (!Phaser.Input.Keyboard.JustDown(this.cursors.dash)) return;
        if (time - this.lastDashTime < PLAYER.DASH_COOLDOWN) return;
        if (this.isDashing) return;

        this.lastDashTime  = time;
        this.isDashing     = true;
        this.isInvincible  = true;
        playDash();

        // Dash in current direction; default forward if stationary
        const rawVx = this.player.body.velocity.x || PLAYER.DASH_SPEED;
        const rawVy = this.player.body.velocity.y;
        const len   = Math.sqrt(rawVx * rawVx + rawVy * rawVy) || 1;
        this.player.setVelocity(
            (rawVx / len) * PLAYER.DASH_SPEED,
            (rawVy / len) * PLAYER.DASH_SPEED
        );

        // Ghost trail via alpha blink
        this.tweens.add({
            targets: this.player,
            alpha: 0.4,
            duration: PLAYER.DASH_DURATION / 2,
            yoyo: true,
        });

        this.time.delayedCall(PLAYER.DASH_DURATION,    () => { this.isDashing    = false; });
        this.time.delayedCall(PLAYER.INVINCIBLE_MS,    () => { this.isInvincible = false; });
    }

    // R — consume one HP restore charge to refill health completely
    handleHPRestore() {
        if (!Phaser.Input.Keyboard.JustDown(this.cursors.restore)) return;
        if (GameState.hpRestoreCount <= 0) return;
        if (this.playerHP >= PLAYER.MAX_HP) return;

        GameState.hpRestoreCount--;
        GameState.arenaData.hpRestoresUsed++;
        this.playerHP = PLAYER.MAX_HP;

        this.cameras.main.flash(300, 20, 180, 50, false);
        this.hpRestoreHint.setText(`[R] Restore HP (${GameState.hpRestoreCount})`);
    }

    // -------------------------------------------------------
    //  SPAWNING
    // -------------------------------------------------------

    // Spawn one enemy at a random arena edge, keeping a safe distance from the player
    spawnEnemy() {
        if (this.gameOver) return;
        if (this.enemiesSpawned >= ENEMIES_PER_ARENA) {
            if (this.spawnTimer) { this.spawnTimer.remove(); this.spawnTimer = null; }
            return;
        }

        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        const side = randomInt(0, 3);
        let x, y;
        if      (side === 0) { x = randomRange(40, w - 40); y = 80; }
        else if (side === 1) { x = randomRange(40, w - 40); y = h - 40; }
        else if (side === 2) { x = 40;      y = randomRange(80, h - 40); }
        else                 { x = w - 40;  y = randomRange(80, h - 40); }

        const enemy    = this.enemies.create(x, y, `enemy_${this.element}`);
        enemy.setDepth(9);
        enemy.hp       = this.difficulty.enemyHP;
        enemy.maxHP    = this.difficulty.enemyHP;

        // Pop-in animation
        enemy.setScale(0);
        this.tweens.add({ targets: enemy, scale: 1, duration: 280, ease: 'Back.easeOut' });

        this.enemiesSpawned++;
    }

    // Spawn the boss dramatically at the top-center of the arena
    spawnBoss() {
        if (this.bossSpawned || this.gameOver) return;
        this.bossSpawned = true;

        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        this.boss = this.physics.add.sprite(w / 2, 130, `boss_${this.element}`);
        this.boss.setDepth(9);
        this.boss.hp    = this.difficulty.bossHP;
        this.boss.maxHP = this.difficulty.bossHP;
        this.boss.setScale(0);

        // Wire up boss-specific overlaps now that the sprite exists
        this.physics.add.overlap(this.player, this.boss,
            this.onPlayerBossOverlap, null, this);
        this.physics.add.overlap(this.projectiles, this.boss,
            this.onProjectileHitBoss, null, this);

        playBossRoar();
        this.cameras.main.shake(320, 0.012);
        this.cameras.main.flash(400, 160, 20, 0, false);

        this.tweens.add({
            targets: this.boss,
            scale: 1,
            duration: 600,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.bossHpBg.setVisible(true);
                this.bossHpFill.setVisible(true);
                this.bossLabel.setVisible(true);
            },
        });

        // "BOSS" announcement
        const alert = this.add.text(w / 2, h / 2,
            `${ELEMENT_NAMES[this.element]} BOSS`,
            {
                fontFamily: 'Cinzel, serif',
                fontSize: '62px',
                fontStyle: 'bold',
                color: Phaser.Display.Color.IntegerToColor(this.colors.primary).rgba,
                stroke: '#000000',
                strokeThickness: 9,
            }
        ).setOrigin(0.5).setDepth(50).setAlpha(0);

        this.tweens.add({
            targets: alert,
            alpha: 1,
            duration: 300,
            yoyo: true,
            hold: 900,
            onComplete: () => alert.destroy(),
        });
    }

    // -------------------------------------------------------
    //  AI
    // -------------------------------------------------------

    // Basic enemy AI: always move directly toward the player
    updateEnemyAI(enemy) {
        const angle = angleBetween(enemy.x, enemy.y, this.player.x, this.player.y);
        enemy.setVelocity(
            Math.cos(angle) * this.difficulty.enemySpeed,
            Math.sin(angle) * this.difficulty.enemySpeed
        );
    }

    // Boss AI: slowly tracks player, charges every 4 seconds
    updateBossAI(time, delta) {
        if (this.bossCharging) return;

        const angle = angleBetween(this.boss.x, this.boss.y, this.player.x, this.player.y);
        this.boss.setVelocity(
            Math.cos(angle) * this.difficulty.enemySpeed * 0.75,
            Math.sin(angle) * this.difficulty.enemySpeed * 0.75
        );

        if (time - this._lastBossCharge > 4000) {
            this._lastBossCharge = time;
            this.bossCharge();
        }
    }

    // Boss charges at full speed for 650 ms then returns to normal tracking
    bossCharge() {
        if (!this.boss || !this.boss.active) return;
        this.bossCharging = true;

        const angle = angleBetween(this.boss.x, this.boss.y, this.player.x, this.player.y);
        this.boss.setVelocity(
            Math.cos(angle) * this.difficulty.enemySpeed * 3.2,
            Math.sin(angle) * this.difficulty.enemySpeed * 3.2
        );

        this.time.delayedCall(650, () => { this.bossCharging = false; });
    }

    // -------------------------------------------------------
    //  COMBAT
    // -------------------------------------------------------

    // Apply damage to a normal enemy, kill if HP reaches 0
    damageEnemy(enemy, amount) {
        enemy.hp -= amount;
        playHit();

        // White flash on hit
        enemy.setTint(0xffffff);
        this.time.delayedCall(80, () => { if (enemy.active) enemy.clearTint(); });

        this.showDamageNumber(enemy.x, enemy.y, amount);

        if (enemy.hp <= 0) this.killEnemy(enemy);
    }

    // Apply damage to the boss, kill if HP reaches 0
    damageBoss(amount) {
        if (!this.boss || !this.boss.active) return;
        this.boss.hp -= amount;
        playHit();

        this.boss.setTint(0xffffff);
        this.time.delayedCall(80, () => { if (this.boss && this.boss.active) this.boss.clearTint(); });

        this.showDamageNumber(this.boss.x, this.boss.y - 30, amount);
        this.updateBossHPBar();

        if (this.boss.hp <= 0) this.killBoss();
    }

    // Destroy enemy, add score, emit particles, check for boss spawn trigger
    killEnemy(enemy) {
        playDeath();

        const points = Math.round(10 * this.difficulty.scoreMultiplier);
        this.arenaScore += points;
        GameState.arenaData.score = this.arenaScore;

        // Floating score orb
        const orb = this.add.image(enemy.x, enemy.y, 'orb_score').setDepth(5);
        this.tweens.add({
            targets: orb,
            y: enemy.y - 35,
            alpha: 0,
            duration: 750,
            onComplete: () => orb.destroy(),
        });

        // Burst particles
        this.add.particles(enemy.x, enemy.y, `particle_${this.element}`, {
            speed:     { min: 60, max: 160 },
            scale:     { start: 0.9, end: 0 },
            alpha:     { start: 1, end: 0 },
            lifespan:  600,
            quantity:  10,
            blendMode: 'ADD',
            emitting:  false,
        }).explode(10);

        enemy.destroy();

        this.enemiesKilled++;
        GameState.arenaData.kills = this.enemiesKilled;

        // Killing enemies builds power toward the Q special
        this.playerPower = Math.min(100, this.playerPower + 15);

        // Once all normal enemies are dead, spawn the boss after a brief pause
        if (this.enemiesKilled >= ENEMIES_PER_ARENA && !this.bossSpawned) {
            this.time.delayedCall(1200, () => this.spawnBoss());
        }
    }

    // Destroy boss, give score bonus, trigger win sequence
    killBoss() {
        if (!this.boss) return;

        playVictory();
        this.cameras.main.shake(500, 0.015);
        this.cameras.main.flash(600, 240, 180, 0, false);

        // Three staggered explosion bursts
        for (let i = 0; i < 3; i++) {
            this.time.delayedCall(i * 180, () => {
                if (!this.boss) return;
                this.add.particles(this.boss.x, this.boss.y, `particle_${this.element}`, {
                    speed:     { min: 120, max: 320 },
                    scale:     { start: 1.6, end: 0 },
                    alpha:     { start: 1, end: 0 },
                    lifespan:  800,
                    quantity:  20,
                    blendMode: 'ADD',
                    emitting:  false,
                }).explode(20);
            });
        }

        this.boss.destroy();
        this.boss = null;

        const bossPoints = Math.round(100 * this.difficulty.scoreMultiplier);
        this.arenaScore += bossPoints;

        this.bossDefeated = true;
        GameState.arenaData.bossDefeated = true;
        GameState.arenaData.score        = this.arenaScore;

        this.bossHpBg.setVisible(false);
        this.bossHpFill.setVisible(false);
        this.bossLabel.setVisible(false);

        this.time.delayedCall(1300, () => this.winArena());
    }

    // Apply damage to the player; grant brief invincibility after each hit
    damagePlayer(amount) {
        if (this.isInvincible || this.gameOver) return;

        this.playerHP     = Math.max(0, this.playerHP - amount);
        this.isInvincible = true;
        playPlayerHit();

        this.player.setTint(0xff3333);
        this.time.delayedCall(200, () => { if (this.player.active) this.player.clearTint(); });
        this.cameras.main.shake(100, 0.008);
        this.time.delayedCall(PLAYER.INVINCIBLE_MS, () => { this.isInvincible = false; });

        if (this.playerHP <= 0) this.loseArena();
    }

    // -------------------------------------------------------
    //  OVERLAP CALLBACKS
    // -------------------------------------------------------

    onPlayerEnemyOverlap(player, enemy) {
        if (this.isInvincible || this.gameOver) return;
        this.damagePlayer(10);
    }

    onPlayerBossOverlap(player, boss) {
        if (this.isInvincible || this.gameOver) return;
        this.damagePlayer(15);
    }

    // Projectile hits a normal enemy: destroy projectile, deal double attack damage
    onProjectileHitEnemy(projectile, enemy) {
        if (!projectile.active || !enemy.active) return;
        projectile.destroy();
        this.damageEnemy(enemy, PLAYER.ATTACK_DAMAGE * 2);
    }

    // Projectile hits the boss: destroy projectile, deal double attack damage
    onProjectileHitBoss(projectile, boss) {
        if (!projectile.active || !boss.active) return;
        projectile.destroy();
        this.damageBoss(PLAYER.ATTACK_DAMAGE * 2);
    }

    // -------------------------------------------------------
    //  HUD UPDATES
    // -------------------------------------------------------

    updateUI() {
        // HP bar: scale fill image on X axis (origin 0,0 so it shrinks from the right)
        const hpRatio = this.playerHP / PLAYER.MAX_HP;
        this.hpBarFill.setScale(Math.max(0, hpRatio), 1);
        this.hpValueText.setText(`${Math.ceil(this.playerHP)} / 100`);

        if      (hpRatio > 0.5)  this.hpBarFill.setTint(COLORS.HP_GREEN);
        else if (hpRatio > 0.25) this.hpBarFill.setTint(COLORS.HP_YELLOW);
        else                     this.hpBarFill.setTint(COLORS.HP_RED);

        // Power bar
        const powerRatio = this.playerPower / 100;
        this.powerBarFill.setScale(Math.max(0, powerRatio), 0.55);

        // Score
        this.scoreText.setText(`Score: ${this.arenaScore}`);

        // Kill counter switches to boss status once boss spawns
        if (!this.bossSpawned) {
            this.killText.setText(`Kills: ${this.enemiesKilled} / ${ENEMIES_PER_ARENA}`);
        } else {
            this.killText.setText(this.bossDefeated ? 'BOSS SLAIN!' : 'BOSS ALIVE');
        }
    }

    // Shrink the boss HP bar fill proportionally to remaining HP
    updateBossHPBar() {
        if (!this.boss) return;
        const ratio = Math.max(0, this.boss.hp / this.boss.maxHP);
        // Base scaleX is 1.5 (= 300 px); multiply by ratio to show depletion
        this.bossHpFill.setScale(ratio * 1.5, 1);
    }

    // Floating red number that drifts upward and fades out
    showDamageNumber(x, y, amount) {
        const t = this.add.text(x, y - 18, `-${amount}`, TEXT_STYLES.damage)
            .setOrigin(0.5).setDepth(30);
        this.tweens.add({
            targets: t,
            y: y - 65,
            alpha: 0,
            duration: 680,
            onComplete: () => t.destroy(),
        });
    }

    // -------------------------------------------------------
    //  WIN / LOSE
    // -------------------------------------------------------

    // All enemies and boss defeated — persist results to GameState, return to hub
    winArena() {
        if (this.gameOver) return;
        this.gameOver = true;

        // Persist arena results into the global state
        GameState.arenaData.score        = this.arenaScore;
        GameState.arenaData.bossDefeated = true;
        GameState.arenaData.kills        = this.enemiesKilled;

        GameState.totalKills          += this.enemiesKilled;
        GameState.totalBossesDefeated += 1;
        GameState.totalScore          += this.arenaScore;

        if (!GameState.completedElements.includes(this.element)) {
            GameState.completedElements.push(this.element);
        }

        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        const victoryText = this.add.text(w / 2, h / 2 - 70, 'VICTORY!', {
            ...TEXT_STYLES.title, color: '#ffd700',
        }).setOrigin(0.5).setDepth(50).setAlpha(0);

        const scoreText = this.add.text(w / 2, h / 2, `Score: ${this.arenaScore}`, {
            ...TEXT_STYLES.subtitle,
        }).setOrigin(0.5).setDepth(50).setAlpha(0);

        const hintText = this.add.text(w / 2, h / 2 + 55, 'Returning to hub...', {
            fontFamily: 'Cinzel, serif', fontSize: '16px', color: '#888888',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(50).setAlpha(0);

        this.tweens.add({ targets: [victoryText, scoreText, hintText], alpha: 1, duration: 600 });

        this.time.delayedCall(2800, () => {
            this.cameras.main.fadeOut(600, 0, 0, 0);
            this.time.delayedCall(600, () => this.scene.start('HubScene'));
        });
    }

    // Player HP reached 0 — save partial results, go to game over screen
    loseArena() {
        if (this.gameOver) return;
        this.gameOver = true;

        // Freeze all physics bodies
        this.player.setVelocity(0, 0);
        this.enemies.getChildren().forEach(e => e.setVelocity(0, 0));
        if (this.boss && this.boss.active) this.boss.setVelocity(0, 0);
        if (this.spawnTimer) { this.spawnTimer.remove(); this.spawnTimer = null; }

        GameState.arenaData.kills = this.enemiesKilled;
        GameState.arenaData.score = this.arenaScore;

        playDeath();
        this.cameras.main.shake(400, 0.02);
        this.cameras.main.flash(300, 200, 0, 0, false);

        // Player death animation
        this.tweens.add({
            targets: this.player,
            alpha: 0,
            scale: 0.1,
            angle: 180,
            duration: 850,
        });

        this.time.delayedCall(1600, () => {
            this.cameras.main.fadeOut(600, 0, 0, 0);
            this.time.delayedCall(600, () => this.scene.start('GameOverScene'));
        });
    }

    // -------------------------------------------------------
    //  PAUSE
    // -------------------------------------------------------

    togglePause() {
        if (this.gameOver) return;
        this.paused = !this.paused;

        if (this.paused) {
            // Stop all movement while paused
            this.player.setVelocity(0, 0);
            this.enemies.getChildren().forEach(e => e.setVelocity(0, 0));
            if (this.boss && this.boss.active) this.boss.setVelocity(0, 0);
            if (this.spawnTimer) this.spawnTimer.paused = true;
            this.showPauseOverlay();
        } else {
            if (this.spawnTimer) this.spawnTimer.paused = false;
            if (this.pauseOverlay) {
                this.pauseOverlay.forEach(obj => obj.destroy());
                this.pauseOverlay = null;
            }
        }
    }

    showPauseOverlay() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        const bg = this.add.graphics().setDepth(60);
        bg.fillStyle(0x000000, 0.62);
        bg.fillRect(0, 0, w, h);

        const title = this.add.text(w / 2, h / 2 - 50, 'PAUSED', TEXT_STYLES.pauseTitle)
            .setOrigin(0.5).setDepth(61);

        const hint = this.add.text(w / 2, h / 2 + 30, 'Press ESC to resume', TEXT_STYLES.body)
            .setOrigin(0.5).setDepth(61);

        const controls = this.add.text(w / 2, h / 2 + 80,
            'WASD Move  ·  SPACE Attack  ·  Q Special  ·  E Dash  ·  R Restore HP',
            { ...TEXT_STYLES.small, fontSize: '13px' }
        ).setOrigin(0.5).setDepth(61);

        this.pauseOverlay = [bg, title, hint, controls];
    }
}
