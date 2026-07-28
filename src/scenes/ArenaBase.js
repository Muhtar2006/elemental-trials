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

        // Texture key for this element's insect enemy sprite
        const _insectMap = { fire: 'insect_beetle', water: 'insect_maggot',
                             earth: 'insect_mantis', air:  'insect_beetle' };
        this.enemyTextureKey = _insectMap[this.element];

        // ---- Arena counters ----
        this.enemiesSpawned  = 0;
        this.enemiesKilled   = 0;
        this.bossSpawned     = false;
        this.bossDefeated    = false;
        this.arenaScore      = 0;
        this.gameOver        = false;
        this.paused          = false;

        // ---- Player state ----
        this.playerBaseScale = 3;           // 48×64 adventurer frames scaled up 3×
        this.playerHP        = PLAYER.MAX_HP;
        this.playerPower     = 0;       // builds from kills; fuels Q special
        this.lastAttackTime   = 0;
        this.lastSpecialTime  = 0;
        this.lastDashTime     = 0;
        this.lastFireballTime = 0;
        this.aimX             = 0;    // last non-zero normalized input direction
        this.aimY             = 1;    // default: facing down
        this.isDashing        = false;
        this.isInvincible     = false;

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

        // Set up the element-specific hazard mechanic
        this.initElementMechanic(w, h);

        this.cameras.main.fadeIn(600, 10, 10, 15);
        this.input.keyboard.on('keydown-ESC', () => this.togglePause());
    }

    update(time, delta) {
        if (this.gameOver || this.paused) return;

        this.handleMovement();
        this.handleAttack(time);
        this.handleSpecial(time);
        this.handleFireball(time);
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
        this.updateElementMechanic(time, delta);
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

    // Player physics sprite using directional adventurer animations
    createPlayer(w, h) {
        // Register all 12 animations once; guard prevents re-registration on scene restart
        if (!this.anims.exists('walk_Down')) {
            this.createAdventurerAnims();
        }

        this.player = this.physics.add.sprite(w / 2, h / 2, 'adventurer_idle_Down', 0);
        this.player.setScale(this.playerBaseScale);
        this.player.setCollideWorldBounds(true);
        this.player.setDepth(10);
        // Trim the physics body to the visible character (middle 20 px wide, bottom 40 px tall
        // of the 48×64 frame). setSize/setOffset work in pre-scale frame pixels; Phaser
        // multiplies by displayWidth/Height automatically for the actual body.
        this.player.body.setSize(20, 40).setOffset(14, 24);

        this.facing = 'Down';
        this.player.anims.play('idle_Down');
    }

    // Create walk and idle animations for all six directions.
    createAdventurerAnims() {
        ['Down', 'Up', 'Left_Down', 'Left_Up', 'Right_Down', 'Right_Up'].forEach(dir => {
            this.anims.create({
                key:       `walk_${dir}`,
                frames:    this.anims.generateFrameNumbers(`adventurer_walk_${dir}`, { start: 0, end: 7 }),
                frameRate: 10,
                repeat:    -1,
            });
            this.anims.create({
                key:       `idle_${dir}`,
                frames:    this.anims.generateFrameNumbers(`adventurer_idle_${dir}`, { start: 0, end: 7 }),
                frameRate: 8,
                repeat:    -1,
            });
        });
    }

    // Physics group that holds all normal enemies
    createEnemyGroup() {
        this.enemies = this.physics.add.group();
        // Register insect walk animations once; guard prevents re-registration on restart
        if (!this.anims.exists('insect_beetle_walk')) {
            this.createInsectAnims();
        }
    }

    // Walk animations for the three insect sprites (4 frames each at 8 fps)
    createInsectAnims() {
        ['insect_beetle', 'insect_maggot', 'insect_mantis'].forEach(key => {
            this.anims.create({
                key:       `${key}_walk`,
                frames:    this.anims.generateFrameNumbers(key, { start: 0, end: 3 }),
                frameRate: 8,
                repeat:    -1,
            });
        });
    }

    // Physics groups for player projectiles
    createProjectileGroup() {
        this.projectiles = this.physics.add.group(); // Q special — 8-way burst
        this.fireballs   = this.physics.add.group(); // F fireball — single-target bolt
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

        // ---- Fireball cooldown indicator ----
        // Bright orange = ready; dim grey = cooling down; flashes red when pressed during cooldown
        this.fireballIndicator = this.add.text(10, 64, '[F] Fireball  ●', {
            fontFamily: 'Cinzel, serif', fontSize: '11px', color: '#ff8844',
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
            restore:  Phaser.Input.Keyboard.KeyCodes.R,
            fireball: Phaser.Input.Keyboard.KeyCodes.F,
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
        this.physics.add.overlap(
            this.fireballs, this.enemies,
            this.onFireballHitEnemy, null, this
        );
    }

    // -------------------------------------------------------
    //  INPUT HANDLERS  (called every frame from update)
    // -------------------------------------------------------

    // WASD movement with diagonal normalisation and directional animation
    handleMovement() {
        if (this.isDashing) return;
        if (this.time.now < (this._recoilUntil || 0)) return; // brief post-cast lock

        const left  = this.cursors.left.isDown;
        const right = this.cursors.right.isDown;
        const up    = this.cursors.up.isDown;
        const down  = this.cursors.down.isDown;

        let vx = 0, vy = 0;
        if (left)  vx -= PLAYER.SPEED;
        if (right) vx += PLAYER.SPEED;
        if (up)    vy -= PLAYER.SPEED;
        if (down)  vy += PLAYER.SPEED;

        const moving = (vx !== 0 || vy !== 0);
        if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }

        // Store exact normalized aim vector — updated only when keys are held so the
        // fireball still has a direction when the player is standing still.
        if (moving) {
            const len = Math.sqrt(vx * vx + vy * vy) || 1;
            this.aimX = vx / len;
            this.aimY = vy / len;
        }

        // Determine facing from raw input before velocity mods.
        // No pure-left or pure-right sprites exist — use Left_Down / Right_Down instead.
        if (moving) {
            if      (!left && !right && up)   this.facing = 'Up';
            else if (!left && !right && down) this.facing = 'Down';
            else if (right && up)             this.facing = 'Right_Up';
            else if (left  && up)             this.facing = 'Left_Up';
            else if (right)                   this.facing = 'Right_Down';
            else                              this.facing = 'Left_Down';
        }

        // Switch animation only when direction or move-state changes
        const animKey = `${moving ? 'walk' : 'idle'}_${this.facing}`;
        if (this.player.anims.currentAnim?.key !== animKey) {
            this.player.anims.play(animKey, true);
        }

        // WATER: lerp toward target each frame — pressing keys converges quickly,
        // releasing them lets momentum carry for ~1.5 seconds before stopping.
        if (this.element === 'water') {
            const t = moving ? 0.12 : 0.05;
            vx = lerp(this.player.body.velocity.x, vx, t);
            vy = lerp(this.player.body.velocity.y, vy, t);
        }

        // AIR: constant lateral wind pushes the player on top of their input.
        if (this.element === 'air') {
            vx = clamp(
                vx + this.windDirection * this.windForce,
                -PLAYER.SPEED * 1.5, PLAYER.SPEED * 1.5
            );
        }

        this.player.setVelocity(vx, vy);
        // No setFlipX — directional sprites handle orientation
    }

    // SPACE — melee swing that hits everything within ATTACK_RANGE
    handleAttack(time) {
        if (!Phaser.Input.Keyboard.JustDown(this.cursors.attack)) return;
        if (time - this.lastAttackTime < PLAYER.ATTACK_COOLDOWN) return;

        this.lastAttackTime = time;
        playSwing();

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

        const onCooldown = time - this.lastSpecialTime < PLAYER.SPECIAL_COOLDOWN;
        const lacksPower = this.playerPower < PLAYER.SPECIAL_COST;

        if (onCooldown || lacksPower) {
            // Flash the PWR bar to communicate why Q failed.
            // Guard against re-triggering during the same flash window.
            if (!this._pwrFlashActive) {
                this._pwrFlashActive = true;
                // Cooldown → dim grey; not enough power → angry red
                this.powerBarFill.setTint(onCooldown ? 0x555555 : 0xff2222);
                this.time.delayedCall(220, () => {
                    this._pwrFlashActive = false;
                    this.powerBarFill.setTint(this.colors.primary);
                });
                // Low error tone for the no-power case (skipped silently if helper absent)
                if (!onCooldown && lacksPower && typeof playError === 'function') playError();
            }
            return;
        }

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

        // Squash in the launch direction, spring back once dash ends.
        // Targets are fractions of playerBaseScale so the effect scales correctly.
        this.tweens.add({
            targets:  this.player,
            scaleX:   this.playerBaseScale * 0.65,
            scaleY:   this.playerBaseScale * 1.30,
            duration: 70,
            ease:     'Power2.easeOut',
            yoyo:     true,
            onComplete: () => { if (this.player.active) this.player.setScale(this.playerBaseScale); },
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

        const enemy = this.enemies.create(x, y, this.enemyTextureKey);
        enemy.setDepth(9);
        enemy.setTint(this.colors.primary);
        enemy.hp    = this.difficulty.enemyHP;
        enemy.maxHP = this.difficulty.enemyHP;
        enemy.anims.play(`${this.enemyTextureKey}_walk`);

        // Pop-in animation — tween to target display scale
        enemy.setScale(0);
        this.tweens.add({ targets: enemy, scale: 2, duration: 280, ease: 'Back.easeOut' });

        this.enemiesSpawned++;
    }

    // Spawn the boss dramatically at the top-center of the arena
    spawnBoss() {
        if (this.bossSpawned || this.gameOver) return;
        this.bossSpawned = true;

        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        this.boss = this.physics.add.sprite(w / 2, 130, 'boss_sprite');
        this.boss.setDepth(9);
        this.boss.hp    = this.difficulty.bossHP;
        this.boss.maxHP = this.difficulty.bossHP;
        this.boss.setScale(0);

        // Fire uses the sprite's natural colors; other elements get an element tint
        // until their unique boss art is ready. Store the post-flash tint so damageBoss
        // can restore it correctly after the white hit-flash.
        this.bossTint = (this.element !== 'fire') ? this.colors.primary : null;
        if (this.bossTint) this.boss.setTint(this.bossTint);

        // Wire up boss-specific overlaps now that the sprite exists
        this.physics.add.overlap(this.player, this.boss,
            this.onPlayerBossOverlap, null, this);
        this.physics.add.overlap(this.projectiles, this.boss,
            this.onProjectileHitBoss, null, this);
        this.physics.add.overlap(this.fireballs, this.boss,
            this.onFireballHitBoss, null, this);

        playBossRoar();
        this.cameras.main.shake(320, 0.012);
        this.cameras.main.flash(400, 160, 20, 0, false);

        this.tweens.add({
            targets: this.boss,
            scale: 2,
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
        // Let knockback play out before resuming steering
        if (enemy.knockbackUntil && this.time.now < enemy.knockbackUntil) return;

        const angle = angleBetween(enemy.x, enemy.y, this.player.x, this.player.y);
        enemy.setVelocity(
            Math.cos(angle) * this.difficulty.enemySpeed,
            Math.sin(angle) * this.difficulty.enemySpeed
        );
    }

    // Boss AI: slowly tracks player, charges every 4 seconds
    updateBossAI(time, delta) {
        if (this.bossCharging) return;
        // Let knockback play out before resuming steering
        if (this.boss.knockbackUntil && this.time.now < this.boss.knockbackUntil) return;

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

        // White flash for 60 ms, then restore the element color tint
        enemy.setTint(0xffffff);
        this.time.delayedCall(60, () => { if (enemy.active) enemy.setTint(this.colors.primary); });

        // Knock enemy away from the player; AI steering resumes after 120 ms
        const kbAngle = angleBetween(this.player.x, this.player.y, enemy.x, enemy.y);
        enemy.setVelocity(Math.cos(kbAngle) * 280, Math.sin(kbAngle) * 280);
        enemy.knockbackUntil = this.time.now + 120;

        // Per-hit shake (only fires when something actually connects)
        this.cameras.main.shake(55, 0.004);
        this.hitStop(40);

        this.showDamageNumber(enemy.x, enemy.y, amount);

        if (enemy.hp <= 0) this.killEnemy(enemy);
    }

    // Apply damage to the boss, kill if HP reaches 0
    damageBoss(amount) {
        if (!this.boss || !this.boss.active) return;
        this.boss.hp -= amount;
        playHit();

        // White flash for 60 ms, then restore element tint (or clear for fire's natural colors)
        this.boss.setTint(0xffffff);
        this.time.delayedCall(60, () => {
            if (this.boss && this.boss.active) {
                if (this.bossTint) this.boss.setTint(this.bossTint);
                else               this.boss.clearTint();
            }
        });

        // Slight knockback on boss (shorter duration — boss is heavy)
        const kbAngle = angleBetween(this.player.x, this.player.y, this.boss.x, this.boss.y);
        this.boss.setVelocity(Math.cos(kbAngle) * 120, Math.sin(kbAngle) * 120);
        this.boss.knockbackUntil = this.time.now + 100;

        this.cameras.main.shake(70, 0.005);
        this.hitStop(40);

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

        // Element-colored burst
        this.add.particles(enemy.x, enemy.y, `particle_${this.element}`, {
            speed:     { min: 60, max: 180 },
            scale:     { start: 1.0, end: 0 },
            alpha:     { start: 1, end: 0 },
            lifespan:  600,
            quantity:  14,
            blendMode: 'ADD',
            emitting:  false,
        }).explode(14);

        // White spark ring for extra pop
        this.add.particles(enemy.x, enemy.y, 'particle_spark', {
            speed:     { min: 90, max: 220 },
            scale:     { start: 0.7, end: 0 },
            alpha:     { start: 1, end: 0 },
            lifespan:  350,
            quantity:  8,
            blendMode: 'ADD',
            emitting:  false,
        }).explode(8);

        // Trigger element mechanic (e.g. fire leaves a burning patch at the kill site)
        this.onEnemyKillMechanic(enemy.x, enemy.y);

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
        // Stronger shake than enemy hit to signal the player got hurt
        this.cameras.main.shake(120, 0.011);
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

        // PWR ready-glow: pulse alpha when enough power to use special.
        // Skipped while a blocked-Q flash is in progress to avoid fighting the tint.
        if (!this._pwrFlashActive) {
            const pwrReady = this.playerPower >= PLAYER.SPECIAL_COST;
            if (pwrReady && !this._pwrPulse) {
                this._pwrPulse = this.tweens.add({
                    targets:  this.powerBarFill,
                    alpha:    0.45,
                    duration: 380,
                    yoyo:     true,
                    repeat:   -1,
                    ease:     'Sine.easeInOut',
                });
            } else if (!pwrReady && this._pwrPulse) {
                this._pwrPulse.stop();
                this._pwrPulse = null;
                this.powerBarFill.setAlpha(1);
            }
        }

        // Score
        this.scoreText.setText(`Score: ${this.arenaScore}`);

        // Kill counter switches to boss status once boss spawns
        if (!this.bossSpawned) {
            this.killText.setText(`Kills: ${this.enemiesKilled} / ${ENEMIES_PER_ARENA}`);
        } else {
            this.killText.setText(this.bossDefeated ? 'BOSS SLAIN!' : 'BOSS ALIVE');
        }

        // HP restore hint: pulse bright green when a charge is available and HP isn't full;
        // dim to grey when pressing R would do nothing.
        const restoreUsable = GameState.hpRestoreCount > 0 && this.playerHP < PLAYER.MAX_HP;
        if (restoreUsable && !this._restorePulse) {
            this.hpRestoreHint.setColor('#22dd44').setAlpha(1);
            this._restorePulse = this.tweens.add({
                targets:  this.hpRestoreHint,
                alpha:    0.45,
                duration: 550,
                yoyo:     true,
                repeat:   -1,
                ease:     'Sine.easeInOut',
            });
        } else if (!restoreUsable && this._restorePulse) {
            this._restorePulse.stop();
            this._restorePulse = null;
            this.hpRestoreHint.setAlpha(0.3).setColor('#555555');
        }

        // Fireball indicator: bright orange when ready, dim when on cooldown.
        // Skipped while a blocked-F flash is running so it doesn't fight the tint.
        if (!this._fireballFlashActive) {
            const fbReady = this.time.now - this.lastFireballTime >= 1500;
            this.fireballIndicator
                .setColor(fbReady ? '#ff8844' : '#444444')
                .setAlpha(fbReady ? 1 : 0.5);
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

    // Pause physics for `ms` milliseconds — creates the brief impact freeze ("hit-stop")
    // that makes melee hits feel weighty. Scene time is unaffected so the resume
    // callback always fires on schedule. Guards against stacking multiple hit-stops.
    hitStop(ms) {
        if (this.hitStopped) return;
        this.hitStopped = true;
        this.physics.world.pause();
        this.time.delayedCall(ms, () => {
            this.physics.world.resume();
            this.hitStopped = false;
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

    // -------------------------------------------------------
    //  FIREBALL SKILL  (F key)
    // -------------------------------------------------------

    // F — directional bolt that travels toward this.facing, hits the first target
    handleFireball(time) {
        if (!Phaser.Input.Keyboard.JustDown(this.cursors.fireball)) return;

        const FIREBALL_CD = 1500; // ms; must match the 1500 literal in updateUI

        if (time - this.lastFireballTime < FIREBALL_CD) {
            if (!this._fireballFlashActive) {
                this._fireballFlashActive = true;
                this.fireballIndicator.setColor('#ff3322').setAlpha(1);
                this.time.delayedCall(200, () => {
                    this._fireballFlashActive = false;
                    // updateUI will restore the correct colour next frame
                });
            }
            return;
        }

        this.lastFireballTime = time;

        // Launch angle from the exact input vector — pure right/left/up/down all work
        // correctly because aimX/aimY are stored from raw keys, not from the sprite
        // facing (which has no pure-left or pure-right variant).
        const angle = Math.atan2(this.aimY, this.aimX);
        const speed = 540;

        // Spawn fireball — natural colors from the hand-drawn sprite, no tint applied
        const fb = this.fireballs.create(this.player.x, this.player.y, 'fireball_sprite');
        fb.setDepth(12);
        fb.setScale(1.2);
        fb.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

        // Particle trail follows the projectile
        fb._trail = this.add.particles(0, 0, `particle_${this.element}`, {
            follow:    fb,
            speed:     { min: 6, max: 28 },
            scale:     { start: 0.85, end: 0 },
            alpha:     { start: 0.9,  end: 0 },
            lifespan:  180,
            frequency: 16,
            quantity:  1,
            blendMode: 'ADD',
        });
        fb._trail.setDepth(11);

        // Auto-destroy after crossing the arena (~540 px/s × 1.8 s ≈ 972 px)
        this.time.delayedCall(1800, () => {
            if (fb.active) {
                if (fb._trail) { fb._trail.destroy(); fb._trail = null; }
                fb.destroy();
            }
        });

        // --- Cast feedback ---
        // Small camera shake
        this.cameras.main.shake(55, 0.003);

        // Recoil: push player back for 130 ms, suppress movement input during that window
        this._recoilUntil = this.time.now + 130;
        this.player.setVelocity(
            Math.cos(angle + Math.PI) * 140,
            Math.sin(angle + Math.PI) * 140
        );

        // Visual squash in the cast direction
        this.tweens.add({
            targets:  this.player,
            scaleX:   this.playerBaseScale * 1.12,
            scaleY:   this.playerBaseScale * 0.88,
            duration: 70,
            ease:     'Power2.easeOut',
            yoyo:     true,
            onComplete: () => { if (this.player.active) this.player.setScale(this.playerBaseScale); },
        });

        playSpecial(); // reuse special sound; swap for a dedicated cast sound if added later
    }

    // Fireball overlaps a normal enemy: impact + 3× base damage
    onFireballHitEnemy(fireball, enemy) {
        if (!fireball.active || !enemy.active) return;
        this.fireballImpact(fireball, enemy.x, enemy.y);
        this.damageEnemy(enemy, PLAYER.ATTACK_DAMAGE * 3);
    }

    // Fireball overlaps the boss: impact + 3× base damage
    onFireballHitBoss(fireball, boss) {
        if (!fireball.active || !boss.active) return;
        this.fireballImpact(fireball, boss.x, boss.y);
        this.damageBoss(PLAYER.ATTACK_DAMAGE * 3);
    }

    // Shared impact: element burst + spark ring, then destroy the fireball
    fireballImpact(fireball, x, y) {
        if (!fireball.active) return;

        // Stop trail before destroying
        if (fireball._trail) { fireball._trail.destroy(); fireball._trail = null; }
        fireball.destroy();

        // Element-colored burst
        this.add.particles(x, y, `particle_${this.element}`, {
            speed:     { min: 80, max: 230 },
            scale:     { start: 1.3, end: 0 },
            alpha:     { start: 1,   end: 0 },
            lifespan:  500,
            quantity:  16,
            blendMode: 'ADD',
            emitting:  false,
        }).explode(16);

        // White spark ring for extra pop
        this.add.particles(x, y, 'particle_spark', {
            speed:     { min: 60, max: 180 },
            scale:     { start: 0.7, end: 0 },
            alpha:     { start: 1,   end: 0 },
            lifespan:  300,
            quantity:  10,
            blendMode: 'ADD',
            emitting:  false,
        }).explode(10);
    }

    // -------------------------------------------------------
    //  ELEMENT MECHANICS  — one unique hazard per arena type
    // -------------------------------------------------------

    // Dispatch table: called once from create() after the scene is built.
    initElementMechanic(w, h) {
        if (this.element === 'fire')  this.initFireMechanic();
        if (this.element === 'water') this.initWaterMechanic();
        if (this.element === 'earth') this.initEarthMechanic();
        if (this.element === 'air')   this.initAirMechanic(w, h);
    }

    // Called every frame from update(); dispatch by element.
    updateElementMechanic(time, delta) {
        if (this.element === 'fire')  this.updateFireMechanic();
        if (this.element === 'earth') this.updateEarthMechanic(time);
    }

    // Called from killEnemy() right before enemy.destroy().
    onEnemyKillMechanic(x, y) {
        if (this.element === 'fire') this.spawnBurnPatch(x, y);
    }

    // ---- FIRE: burning ground patches -------------------------

    initFireMechanic() {
        this.burnPatches  = [];   // { graphic, particles, x, y, radius, expired }
        this.lastBurnTick = 0;    // tracks the last time burn dealt damage
    }

    // Spawns an orange-red glow at (x, y) that deals 3 damage every 600 ms for 3 s.
    spawnBurnPatch(x, y) {
        const radius = 42;

        const g = this.add.graphics().setDepth(3);
        g.fillStyle(0xff5500, 0.5);
        g.fillCircle(0, 0, radius);
        g.x = x;
        g.y = y;

        // Flickering alpha over 3 s, then auto-destroy
        this.tweens.add({
            targets:  g,
            alpha:    0.18,
            duration: 280,
            yoyo:     true,
            repeat:   10,
            onComplete: () => { g.destroy(); },
        });

        // Continuous flame particles rising from the patch
        const flames = this.add.particles(x, y, 'particle_fire', {
            speed:     { min: 8, max: 36 },
            angle:     { min: 255, max: 285 },
            scale:     { start: 0.55, end: 0 },
            alpha:     { start: 0.85, end: 0 },
            lifespan:  750,
            frequency: 90,
            quantity:  1,
            blendMode: 'ADD',
        });

        const entry = { g, flames, x, y, radius, expired: false };
        this.burnPatches.push(entry);

        this.time.delayedCall(3000, () => {
            entry.expired = true;
            flames.destroy();
        });
    }

    // Checks every frame whether the player is standing in any patch.
    // Burn damage bypasses isInvincible (it's environmental, not enemy contact).
    updateFireMechanic() {
        // Purge entries that finished burning
        this.burnPatches = this.burnPatches.filter(p => !p.expired);

        if (this.gameOver || this.isDashing) return;

        const inFire = this.burnPatches.some(p =>
            distanceBetween(this.player.x, this.player.y, p.x, p.y) < p.radius
        );

        if (inFire && this.time.now > this.lastBurnTick + 600) {
            this.lastBurnTick = this.time.now;
            this.playerHP = Math.max(0, this.playerHP - 3);
            // Brief orange tint to signal burn (doesn't interfere with enemy-hit red)
            this.player.setTint(0xff7700);
            this.time.delayedCall(140, () => { if (this.player.active) this.player.clearTint(); });
            if (this.playerHP <= 0) this.loseArena();
        }
    }

    // ---- WATER: slippery momentum ------------------------------
    // Movement is fully handled inline in handleMovement() — no extra state needed.

    initWaterMechanic() {
        // nothing to initialise; water slide is driven by the lerp in handleMovement()
    }

    // ---- EARTH: falling rocks ---------------------------------

    initEarthMechanic() {
        this.earthRubble = [];   // { g, x, y, radius, expiresAt }

        // Drop rocks every 6 s; first rock falls after a 3-second warmup.
        this.time.delayedCall(3000, () => {
            if (this.gameOver) return;
            this.dropRock();
            this.rockTimer = this.time.addEvent({
                delay:         6000,
                callback:      this.dropRock,
                callbackScope: this,
                loop:          true,
            });
        });
    }

    // Warns at the landing site, then drops a rock that hurts and leaves rubble.
    dropRock() {
        if (this.gameOver) return;

        const w  = this.cameras.main.width;
        const h  = this.cameras.main.height;
        const tx = randomRange(90, w - 90);
        const ty = randomRange(100, h - 70);

        // Warning: pulsing red shadow at the landing site
        const shadow = this.add.graphics().setDepth(3);
        shadow.fillStyle(0xbb4400, 0.35);
        shadow.fillCircle(tx, ty, 38);

        this.tweens.add({
            targets:  shadow,
            alpha:    0.65,
            duration: 180,
            yoyo:     true,
            repeat:   3,
        });

        this.time.delayedCall(850, () => {
            shadow.destroy();
            if (this.gameOver) return;

            // Falling rock — a graphics circle that drops from the top
            const rock = this.add.graphics().setDepth(15);
            rock.fillStyle(0x6a5540, 1);
            rock.fillCircle(0, 0, 18);
            rock.x = tx;
            rock.y = -30;

            this.tweens.add({
                targets:  rock,
                y:        ty,
                duration: 280,
                ease:     'Quad.easeIn',
                onComplete: () => {
                    rock.destroy();
                    if (this.gameOver) return;

                    // Impact particles
                    this.add.particles(tx, ty, 'particle_earth', {
                        speed:     { min: 50, max: 150 },
                        scale:     { start: 1.1, end: 0 },
                        alpha:     { start: 1,   end: 0 },
                        lifespan:  450,
                        quantity:  10,
                        blendMode: 'ADD',
                        emitting:  false,
                    }).explode(10);

                    this.cameras.main.shake(160, 0.009);

                    // Hurt player if they are in the impact zone
                    if (distanceBetween(this.player.x, this.player.y, tx, ty) < 52) {
                        this.damagePlayer(15);
                    }

                    // Leave rubble that slows the player for 2.5 s
                    const rubbleG = this.add.graphics().setDepth(3);
                    rubbleG.fillStyle(0x5a4430, 0.7);
                    rubbleG.fillCircle(tx, ty, 34);

                    const rubbleEntry = { g: rubbleG, x: tx, y: ty, radius: 34,
                                         expiresAt: this.time.now + 2500 };
                    this.earthRubble.push(rubbleEntry);
                },
            });
        });
    }

    // Removes expired rubble and slows the player whenever they step into a rubble zone.
    updateEarthMechanic(time) {
        // Clean up expired rubble graphics
        this.earthRubble = this.earthRubble.filter(r => {
            if (time > r.expiresAt) { r.g.destroy(); return false; }
            return true;
        });

        if (this.gameOver || this.isDashing) return;

        const inRubble = this.earthRubble.some(r =>
            distanceBetween(this.player.x, this.player.y, r.x, r.y) < r.radius
        );

        // 30 % speed cap while wading through rubble
        if (inRubble) {
            this.player.setVelocity(
                this.player.body.velocity.x * 0.3,
                this.player.body.velocity.y * 0.3
            );
        }
    }

    // ---- AIR: shifting wind -----------------------------------

    initAirMechanic(w, h) {
        this.windDirection = (Math.random() > 0.5) ? 1 : -1;
        this.windForce     = 82;   // px/s added to player x-velocity
        this.windWarning   = false;

        // Wind direction indicator sits just below the kill counter (top-right)
        this.windLabel = this.add.text(w - 10, 30, this._windText(), {
            fontFamily:      'Cinzel, serif',
            fontSize:        '12px',
            color:           '#88ddff',
            stroke:          '#000000',
            strokeThickness: 2,
        }).setOrigin(1, 0).setDepth(20);

        // Schedule the first direction shift
        this.scheduleWindShift();
    }

    _windText() {
        return this.windDirection > 0 ? 'WIND  ▶' : '◀  WIND';
    }

    // 8-second cycle: 6.5 s of steady wind → 1.5 s warning → direction flip.
    scheduleWindShift() {
        this.time.delayedCall(6500, () => {
            if (this.gameOver) return;
            this.windWarning = true;
            this._showWindWarning();

            this.time.delayedCall(1500, () => {
                if (this.gameOver) return;
                this.windWarning    = false;
                this.windDirection *= -1;
                this.windLabel.setText(this._windText()).setColor('#88ddff');
                this.scheduleWindShift();
            });
        });
    }

    // Brief center-screen flash warning that wind is about to shift.
    _showWindWarning() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        this.windLabel.setColor('#ffdd00');

        const msg = this.add.text(w / 2, h / 2 + 90, 'WIND SHIFTING!', {
            fontFamily:      'Cinzel, serif',
            fontSize:        '20px',
            fontStyle:       'bold',
            color:           '#ffdd00',
            stroke:          '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5).setDepth(25).setAlpha(0);

        this.tweens.add({
            targets:  msg,
            alpha:    1,
            duration: 260,
            yoyo:     true,
            hold:     980,
            onComplete: () => msg.destroy(),
        });
    }
}
