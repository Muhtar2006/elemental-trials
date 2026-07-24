// ============================================================
//  ARENA EARTH SCENE
//
//  Thin subclass of ArenaBase. All gameplay logic lives in the
//  base class. HubScene starts this with:
//
//    this.scene.start('ArenaEarthScene')
//
//  Difficulty and visuals are driven by ARENA_DIFFICULTY['earth']
//  and ELEMENT_COLORS['earth'] via GameState.currentElement.
// ============================================================

class ArenaEarthScene extends ArenaBase {
    constructor() {
        super({ key: 'ArenaEarthScene' });
    }
}
