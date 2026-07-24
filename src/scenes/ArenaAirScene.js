// ============================================================
//  ARENA AIR SCENE
//
//  Thin subclass of ArenaBase. All gameplay logic lives in the
//  base class. HubScene starts this with:
//
//    this.scene.start('ArenaAirScene')
//
//  Difficulty and visuals are driven by ARENA_DIFFICULTY['air']
//  and ELEMENT_COLORS['air'] via GameState.currentElement.
// ============================================================

class ArenaAirScene extends ArenaBase {
    constructor() {
        super({ key: 'ArenaAirScene' });
    }
}
