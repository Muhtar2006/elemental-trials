// ============================================================
//  ARENA FIRE SCENE
//
//  Thin subclass of ArenaBase. All gameplay logic lives in the
//  base class. This file only exists to give Phaser a distinct
//  scene key so HubScene can start it with:
//
//    this.scene.start('ArenaFireScene')
//
//  Difficulty, enemy textures, colors, and scoring are all
//  driven by ARENA_DIFFICULTY['fire'] and ELEMENT_COLORS['fire']
//  in utils.js, read from GameState.currentElement at runtime.
// ============================================================

class ArenaFireScene extends ArenaBase {
    constructor() {
        super({ key: 'ArenaFireScene' });
    }
}
