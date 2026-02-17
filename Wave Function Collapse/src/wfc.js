// Wave Function Collapse Algorithm
// Based on mxgmn's WFC with proper arc-consistency (AC-3) constraint propagation.
// Reference: https://github.com/mxgmn/WaveFunctionCollapse

export class WFC {
    // Direction constants: [dx, dy, dirName, oppositeDirName]
    static DIRS = [
        [0, -1, 'up', 'down'],     // neighbor above
        [1, 0, 'right', 'left'],   // neighbor to the right
        [0, 1, 'down', 'up'],      // neighbor below
        [-1, 0, 'left', 'right']   // neighbor to the left
    ];

    constructor(width, height, tiles, rules) {
        this.width = width;
        this.height = height;
        this.tiles = tiles;
        this.rules = rules;

        // Precompute compatibility: for each tile, in each direction,
        // which tiles are allowed as neighbors
        this.compatible = {};
        for (const dir of ['up', 'right', 'down', 'left']) {
            this.compatible[dir] = {};
            for (const tile of this.tiles) {
                this.compatible[dir][tile] = new Set(this.rules[tile]?.[dir] || []);
            }
        }

        // Verify rule symmetry and warn about issues
        this.verifySymmetry();
    }

    // Check that if A allows B to its right, then B allows A to its left, etc.
    verifySymmetry() {
        const oppMap = { up: 'down', down: 'up', left: 'right', right: 'left' };
        for (const tile of this.tiles) {
            for (const dir of ['up', 'right', 'down', 'left']) {
                const opp = oppMap[dir];
                for (const neighbor of this.compatible[dir][tile]) {
                    if (!this.compatible[opp][neighbor]?.has(tile)) {
                        console.warn(
                            `Rule asymmetry: "${tile}" allows "${neighbor}" to its ${dir}, ` +
                            `but "${neighbor}" does NOT allow "${tile}" to its ${opp}`
                        );
                    }
                }
            }
        }
    }

    // Initialize the wave: every cell starts with all tiles possible
    init() {
        this.wave = [];
        for (let y = 0; y < this.height; y++) {
            this.wave[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.wave[y][x] = new Set(this.tiles);
            }
        }
    }

    // Propagate constraints using a stack (AC-3 style).
    // When a cell's options are reduced, check all neighbors:
    //   compute the UNION of tiles allowed by the cell's remaining options,
    //   then intersect with the neighbor's current options.
    //   If the neighbor loses options, push it onto the stack.
    // Returns false on contradiction, or an array of [x, y, tileName] for cells
    // that were resolved to a single option during propagation.
    propagate(stack) {
        const resolved = [];

        while (stack.length > 0) {
            const [cx, cy] = stack.pop();
            const currentOptions = this.wave[cy][cx];

            for (const [dx, dy, dir] of WFC.DIRS) {
                const nx = cx + dx;
                const ny = cy + dy;

                if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue;

                const neighbor = this.wave[ny][nx];
                const prevSize = neighbor.size;

                // Compute what the current cell allows in this direction
                const allowed = new Set();
                for (const tile of currentOptions) {
                    for (const t of this.compatible[dir][tile]) {
                        allowed.add(t);
                    }
                }

                // Remove neighbor tiles that are no longer supported
                let changed = false;
                for (const t of neighbor) {
                    if (!allowed.has(t)) {
                        neighbor.delete(t);
                        changed = true;
                    }
                }

                if (neighbor.size === 0) {
                    return false; // Contradiction
                }

                if (changed) {
                    stack.push([nx, ny]);
                    // Track cells that just became fully resolved
                    if (neighbor.size === 1 && prevSize > 1) {
                        resolved.push([nx, ny, [...neighbor][0]]);
                    }
                }
            }
        }

        return resolved;
    }

    // Find the uncollapsed cell with lowest entropy (fewest remaining options).
    // Ties are broken randomly.
    findLowestEntropy() {
        let minEntropy = Infinity;
        let candidates = [];

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const size = this.wave[y][x].size;
                if (size > 1) {
                    if (size < minEntropy) {
                        minEntropy = size;
                        candidates = [{ x, y }];
                    } else if (size === minEntropy) {
                        candidates.push({ x, y });
                    }
                }
            }
        }

        if (candidates.length === 0) return null;
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    // Collapse a cell to a single tile (weighted random selection)
    collapse(x, y) {
        const options = [...this.wave[y][x]];
        if (options.length === 0) return false;

        // Weight grass higher for more natural-looking maps
        const weights = options.map(t => t === 'grass' ? 3 : 1);
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * totalWeight;

        let chosen = options[0];
        for (let i = 0; i < options.length; i++) {
            r -= weights[i];
            if (r <= 0) {
                chosen = options[i];
                break;
            }
        }

        this.wave[y][x] = new Set([chosen]);
        return true;
    }

    // Main generation loop with retry on contradiction
    generate(maxAttempts = 50) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            this.init();
            let success = true;

            while (true) {
                const next = this.findLowestEntropy();
                if (!next) break; // All cells are collapsed to 1 option

                this.collapse(next.x, next.y);

                const result = this.propagate([[next.x, next.y]]);
                if (result === false) {
                    success = false;
                    break; // Contradiction — retry
                }
            }

            if (success) {
                console.log(`WFC succeeded on attempt ${attempt + 1}`);
                return this.getResult();
            }
        }

        console.warn('WFC failed to find valid solution, returning partial result');
        return this.getResult();
    }

    // Async step-by-step generation with callback after each tile placement.
    // onTilePlaced(x, y, tileName) is called each time a cell collapses.
    // onRetry(attempt) is called when a contradiction forces a restart.
    // Returns a promise that resolves to the final result.
    async generateAnimated(onTilePlaced, onRetry, getDelayMs = () => 20, onWaveUpdate = null, maxAttempts = 50) {
        const delay = () => new Promise(r => setTimeout(r, getDelayMs()));

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            this.init();
            let success = true;

            if (attempt > 0 && onRetry) {
                onRetry(attempt);
                await delay();
            }

            // Show initial entropy state
            if (onWaveUpdate) onWaveUpdate(this.wave);

            while (true) {
                const next = this.findLowestEntropy();
                if (!next) break;

                this.collapse(next.x, next.y);
                const tileName = [...this.wave[next.y][next.x]][0];

                if (onTilePlaced) {
                    onTilePlaced(next.x, next.y, tileName);
                }

                const result = this.propagate([[next.x, next.y]]);
                if (result === false) {
                    success = false;
                    break;
                }

                // Render cells that propagation resolved to a single tile
                if (onTilePlaced && result.length > 0) {
                    for (const [rx, ry, rTile] of result) {
                        onTilePlaced(rx, ry, rTile);
                    }
                }

                // Update entropy display after each step
                if (onWaveUpdate) onWaveUpdate(this.wave);
                await delay();
            }

            if (success) {
                console.log(`WFC succeeded on attempt ${attempt + 1}`);
                return this.getResult();
            }
        }

        console.warn('WFC failed to find valid solution, returning partial result');
        return this.getResult();
    }

    // Convert wave to a 2D array of tile names
    getResult() {
        const result = [];
        for (let y = 0; y < this.height; y++) {
            result[y] = [];
            for (let x = 0; x < this.width; x++) {
                const options = [...this.wave[y][x]];
                result[y][x] = options.length > 0 ? options[0] : 'grass';
            }
        }
        return result;
    }
}
