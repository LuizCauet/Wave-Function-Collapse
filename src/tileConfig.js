// Summer Tileset Configuration
//
// Edge analysis - each tile has 4 edges that must match neighbors:
//   G = pure grass
//   W = pure water
//   WT_GB = water-top / grass-bottom (split on a vertical edge)
//   GT_WB = grass-top / water-bottom
//   WL_GR = water-left / grass-right (split on a horizontal edge)
//   GL_WR = grass-left / water-right
//
// Tile edge map (top, right, bottom, left):
//   grass:                            G,     G,     G,     G
//   water (a/b/c):                    W,     W,     W,     W
//   waterside - water up grass down:  W,     WT_GB, G,     WT_GB
//   waterside water down grass up:    G,     GT_WB, W,     GT_WB
//   waterside water left grass right: WL_GR, G,     WL_GR, W
//   waterside water right grass left: GL_WR, W,     GL_WR, G
//   water top left corner:            G,     GT_WB, GL_WR, G
//   water top right corner:           G,     G,     WL_GR, GT_WB
//   water bottom left corner:         GL_WR, WT_GB, G,     G
//   water bottom right corner:        WL_GR, G,     G,     WT_GB
//
// Valid lake layout:
//   [grass]  [grass]                         [grass]                        [grass]
//   [grass]  [water TL corner]               [waterside water dn grass up]  [water TR corner]  [grass]
//   [grass]  [waterside water R grass L]     [WATER]                        [waterside water L grass R]  [grass]
//   [grass]  [water BL corner]               [waterside water up grass dn]  [water BR corner]  [grass]
//   [grass]  [grass]                         [grass]                        [grass]

export const TILES = [
    'grass',
    'water_a 0',
    'water_b 0',
    'water_c 0',
    'water top left corner',
    'water top right corner',
    'water bottom left corner',
    'water bottom right corner',
    'waterside - water up grass down',
    'waterside water down grass up',
    'waterside water left grass right',
    'waterside water right grass left'
];

const W = ['water_a 0', 'water_b 0', 'water_c 0'];

// Adjacency rules derived from edge matching.
// For tile A, direction D lists tiles that can appear in that direction from A.
export const ADJACENCY_RULES = {

    // grass: all edges = G
    'grass': {
        up:    ['grass', 'waterside - water up grass down', 'water bottom left corner', 'water bottom right corner'],
        right: ['grass', 'waterside water right grass left', 'water top left corner', 'water bottom left corner'],
        down:  ['grass', 'waterside water down grass up', 'water top left corner', 'water top right corner'],
        left:  ['grass', 'waterside water left grass right', 'water top right corner', 'water bottom right corner']
    },

    // water tiles: all edges = W
    'water_a 0': {
        up:    [...W, 'waterside water down grass up'],
        right: [...W, 'waterside water left grass right'],
        down:  [...W, 'waterside - water up grass down'],
        left:  [...W, 'waterside water right grass left']
    },
    'water_b 0': {
        up:    [...W, 'waterside water down grass up'],
        right: [...W, 'waterside water left grass right'],
        down:  [...W, 'waterside - water up grass down'],
        left:  [...W, 'waterside water right grass left']
    },
    'water_c 0': {
        up:    [...W, 'waterside water down grass up'],
        right: [...W, 'waterside water left grass right'],
        down:  [...W, 'waterside - water up grass down'],
        left:  [...W, 'waterside water right grass left']
    },

    // waterside - water up grass down: top=W, right=WT_GB, bottom=G, left=WT_GB
    'waterside - water up grass down': {
        up:    [...W, 'waterside water down grass up'],
        right: ['waterside - water up grass down', 'water bottom right corner'],
        down:  ['grass', 'waterside water down grass up', 'water top left corner', 'water top right corner'],
        left:  ['waterside - water up grass down', 'water bottom left corner']
    },

    // waterside water down grass up: top=G, right=GT_WB, bottom=W, left=GT_WB
    'waterside water down grass up': {
        up:    ['grass', 'waterside - water up grass down', 'water bottom left corner', 'water bottom right corner'],
        right: ['waterside water down grass up', 'water top right corner'],
        down:  [...W, 'waterside - water up grass down'],
        left:  ['waterside water down grass up', 'water top left corner']
    },

    // waterside water left grass right: top=WL_GR, right=G, bottom=WL_GR, left=W
    'waterside water left grass right': {
        up:    ['waterside water left grass right', 'water top right corner'],
        right: ['grass', 'waterside water right grass left', 'water top left corner', 'water bottom left corner'],
        down:  ['waterside water left grass right', 'water bottom right corner'],
        left:  [...W, 'waterside water right grass left']
    },

    // waterside water right grass left: top=GL_WR, right=W, bottom=GL_WR, left=G
    'waterside water right grass left': {
        up:    ['waterside water right grass left', 'water top left corner'],
        right: [...W, 'waterside water left grass right'],
        down:  ['waterside water right grass left', 'water bottom left corner'],
        left:  ['grass', 'waterside water left grass right', 'water top right corner', 'water bottom right corner']
    },

    // water top left corner: top=G, right=GT_WB, bottom=GL_WR, left=G
    'water top left corner': {
        up:    ['grass', 'waterside - water up grass down', 'water bottom left corner', 'water bottom right corner'],
        right: ['waterside water down grass up', 'water top right corner'],
        down:  ['waterside water right grass left', 'water bottom left corner'],
        left:  ['grass', 'waterside water left grass right', 'water top right corner', 'water bottom right corner']
    },

    // water top right corner: top=G, right=G, bottom=WL_GR, left=GT_WB
    'water top right corner': {
        up:    ['grass', 'waterside - water up grass down', 'water bottom left corner', 'water bottom right corner'],
        right: ['grass', 'waterside water right grass left', 'water top left corner', 'water bottom left corner'],
        down:  ['waterside water left grass right', 'water bottom right corner'],
        left:  ['waterside water down grass up', 'water top left corner']
    },

    // water bottom left corner: top=GL_WR, right=WT_GB, bottom=G, left=G
    'water bottom left corner': {
        up:    ['waterside water right grass left', 'water top left corner'],
        right: ['waterside - water up grass down', 'water bottom right corner'],
        down:  ['grass', 'waterside water down grass up', 'water top left corner', 'water top right corner'],
        left:  ['grass', 'waterside water left grass right', 'water top right corner', 'water bottom right corner']
    },

    // water bottom right corner: top=WL_GR, right=G, bottom=G, left=WT_GB
    'water bottom right corner': {
        up:    ['waterside water left grass right', 'water top right corner'],
        right: ['grass', 'waterside water right grass left', 'water top left corner', 'water bottom left corner'],
        down:  ['grass', 'waterside water down grass up', 'water top left corner', 'water top right corner'],
        left:  ['waterside - water up grass down', 'water bottom left corner']
    }
};
