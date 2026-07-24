// ============================================================
//  ARENA WATER SCENE
//
//  Thin subclass of ArenaBase. All gameplay logic lives in the
//  base class. HubScene starts this with:
//
//    this.scene.start('ArenaWaterScene')
//
//  Difficulty and visuals are driven by ARENA_DIFFICULTY['water']
//  and ELEMENT_COLORS['water'] via GameState.currentElement.
// ============================================================

class ArenaWaterScene extends ArenaBase {
    constructor() {
        super({ key: 'ArenaWaterScene' });
    }
}
