/**
 * RENDERER
 */
class Renderer {
    constructor() {
        this.boardElement = document.getElementById('game-board');
        this.mineCountElement = document.getElementById('mine-count');
        this.timerElement = document.getElementById('timer');
        this.modal = document.getElementById('game-over-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.modalMessage = document.getElementById('modal-message');
        this.modalRestartBtn = document.getElementById('modal-restart-btn');
    }

    initBoard(rows, cols, onCellClick, onCellRightClick, onCellDblClick) {
        this.cols = cols;
        this.boardElement.style.gridTemplateColumns = `repeat(${cols}, 30px)`;
        this.boardElement.innerHTML = '';

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = r;
                cell.dataset.col = c;

                // Event listeners
                cell.addEventListener('click', () => onCellClick(r, c));
                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    onCellRightClick(r, c);
                });
                cell.addEventListener('dblclick', () => onCellDblClick(r, c));

                this.boardElement.appendChild(cell);
            }
        }
    }

    updateCell(r, c, cellData) {
        const index = r * this.cols + c;
        const cellNode = this.boardElement.children[index];

        if (!cellNode) return;

        // Reset classes
        cellNode.className = 'cell';
        cellNode.textContent = '';
        delete cellNode.dataset.value;

        if (cellData.isOpen) {
            cellNode.classList.add('revealed');
            if (cellData.isMine) {
                cellNode.classList.add('mine');
                cellNode.textContent = '💣';
            } else if (cellData.neighborCount > 0) {
                cellNode.textContent = cellData.neighborCount;
                cellNode.dataset.value = cellData.neighborCount;
            }
        } else if (cellData.isFlagged) {
            cellNode.classList.add('flagged');
            cellNode.textContent = '🚩';
        }
    }

    revealAll(grid) {
        grid.forEach((row, r) => {
            row.forEach((cellData, c) => {
                if (cellData.isMine) {
                    const index = r * this.cols + c;
                    const cellNode = this.boardElement.children[index];
                    if (!cellData.isFlagged) {
                        cellNode.classList.add('revealed', 'mine');
                        cellNode.textContent = '💣';
                    }
                } else if (cellData.isFlagged && !cellData.isMine) {
                    // Wrong flag
                    const index = r * this.cols + c;
                    const cellNode = this.boardElement.children[index];
                    cellNode.classList.add('revealed');
                    cellNode.style.backgroundColor = '#ffcccc'; // Highlight wrong flag
                    cellNode.textContent = '❌';
                }
            });
        });
    }

    updateStats(minesLeft, timeElapsed) {
        this.mineCountElement.textContent = String(minesLeft).padStart(3, '0');
        this.timerElement.textContent = String(timeElapsed).padStart(3, '0');
    }

    showGameOver(isWin, onRestart) {
        this.modalTitle.textContent = isWin ? 'You Win!' : 'Game Over';
        this.modalMessage.textContent = isWin ? 'Congratulations! You cleared the minefield.' : 'You hit a mine!';
        this.modal.classList.remove('hidden');

        this.modalRestartBtn.onclick = () => {
            this.modal.classList.add('hidden');
            onRestart();
        };
    }
}

/**
 * SOLVER
 */
function checkSolvability(grid, startR, startC) {
    const rows = grid.length;
    const cols = grid[0].length;

    // Simulation state
    // 0: hidden, 1: revealed, 2: flagged
    const state = Array(rows).fill().map(() => Array(cols).fill(0));

    // Reveal start
    state[startR][startC] = 1; // Revealed

    // Helper to get neighbors
    const getNeighbors = (r, c) => {
        const n = [];
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                if (i === 0 && j === 0) continue;
                const nr = r + i, nc = c + j;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) n.push([nr, nc]);
            }
        }
        return n;
    };

    let changed = true;
    while (changed) {
        changed = false;
        let basicMoveFound = false;

        // 1. Basic Neighbors Check
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (state[r][c] === 1) { // Revealed
                    const cell = grid[r][c];
                    if (cell.isMine) continue;

                    const neighbors = getNeighbors(r, c);
                    const hidden = neighbors.filter(([nr, nc]) => state[nr][nc] === 0);
                    const flagged = neighbors.filter(([nr, nc]) => state[nr][nc] === 2);

                    // Rule: If value === flagged count, reveal all hidden
                    if (cell.neighborCount === flagged.length && hidden.length > 0) {
                        hidden.forEach(([nr, nc]) => {
                            state[nr][nc] = 1; // Reveal
                            changed = true;
                            basicMoveFound = true;
                        });
                    }

                    // Rule: If value === flagged + hidden, flag all hidden
                    if (cell.neighborCount === flagged.length + hidden.length && hidden.length > 0) {
                        hidden.forEach(([nr, nc]) => {
                            state[nr][nc] = 2; // Flag
                            changed = true;
                            basicMoveFound = true;
                        });
                    }
                }
            }
        }

        if (basicMoveFound) continue; // Always exhaust basic logic first

        // 2. Set Analysis (Advanced)
        // Gather active numbers
        const active = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (state[r][c] === 1) {
                    const cell = grid[r][c];
                    const neighbors = getNeighbors(r, c);
                    const hidden = neighbors.filter(([nr, nc]) => state[nr][nc] === 0);
                    const flagged = neighbors.filter(([nr, nc]) => state[nr][nc] === 2);

                    if (hidden.length > 0) {
                        active.push({
                            r, c,
                            val: cell.neighborCount,
                            flagged: flagged.length,
                            hidden: hidden,
                            minesNeeded: cell.neighborCount - flagged.length
                        });
                    }
                }
            }
        }

        for (let i = 0; i < active.length; i++) {
            for (let j = 0; j < active.length; j++) {
                if (i === j) continue;
                const A = active[i];
                const B = active[j];

                // Only compare if they are neighbors (heuristic optimization)
                // Actually, strict subset logic doesn't require them to be neighbors, 
                // but usually they share neighbors.
                // Distance check: |rA - rB| <= 2 && |cA - cB| <= 2 to limit complexity
                if (Math.abs(A.r - B.r) > 2 || Math.abs(A.c - B.c) > 2) continue;

                if (isSubset(A.hidden, B.hidden)) {
                    const diff = getDifference(B.hidden, A.hidden);
                    if (diff.length === 0) continue;

                    const minesDiff = B.minesNeeded - A.minesNeeded;

                    if (minesDiff === 0) {
                        // All in diff are safe
                        diff.forEach(([dr, dc]) => {
                            if (state[dr][dc] === 0) {
                                state[dr][dc] = 1; // Reveal
                                changed = true;
                            }
                        });
                    } else if (minesDiff === diff.length) {
                        // All in diff are mines
                        diff.forEach(([dr, dc]) => {
                            if (state[dr][dc] === 0) {
                                state[dr][dc] = 2; // Flag
                                changed = true;
                            }
                        });
                    }
                }
            }
            if (changed) break; // Restart loop to propogate basic moves
        }
    }

    // Check if solved: All non-mines are revealed
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (!grid[r][c].isMine && state[r][c] !== 1) {
                return false; // Unsolved safe cell
            }
        }
    }

    return true;
}

// Helper for Set Analysis
function isSubset(setA, setB) {
    // Check if setA is a subset of setB
    // sets are arrays of strings "r,c" or objects. Strings are easier for Set interaction
    // But our arrays are coordinates [r, c].
    // Let's use string keys for comparison
    const keysB = new Set(setB.map(([r, c]) => `${r},${c}`));
    return setA.every(([r, c]) => keysB.has(`${r},${c}`));
}

function getDifference(setBig, setSmall) {
    const keysSmall = new Set(setSmall.map(([r, c]) => `${r},${c}`));
    return setBig.filter(([r, c]) => !keysSmall.has(`${r},${c}`));
}

/**
 * GAME
 */
class Game {
    constructor(rows, cols, mines, onUpdate) {
        this.rows = rows;
        this.cols = cols;
        this.totalMines = mines;
        this.onUpdate = onUpdate; // Callback for UI updates

        this.grid = [];
        this.state = 'new'; // new, playing, won, lost
        this.minesLeft = mines;
        this.timeElapsed = 0;
        this.timerInterval = null;
        this.firstClick = true;
    }

    start() {
        this.grid = this.createEmptyGrid();
        this.state = 'playing';
        this.minesLeft = this.totalMines;
        this.timeElapsed = 0;
        this.firstClick = true;
        this.stopTimer();
        this.onUpdate({ type: 'init', rows: this.rows, cols: this.cols });
        this.onUpdate({ type: 'stats', mines: this.minesLeft, time: 0 });
    }

    createEmptyGrid() {
        const grid = [];
        for (let r = 0; r < this.rows; r++) {
            const row = [];
            for (let c = 0; c < this.cols; c++) {
                row.push({
                    isMine: false,
                    isOpen: false,
                    isFlagged: false,
                    neighborCount: 0
                });
            }
            grid.push(row);
        }
        return grid;
    }

    generateBoard(safeR, safeC) {
        let attempts = 0;
        const maxAttempts = 1000;

        while (attempts < maxAttempts) {
            // Reset grid
            this.grid = this.createEmptyGrid();

            // Place mines
            let minesPlaced = 0;
            while (minesPlaced < this.totalMines) {
                const r = Math.floor(Math.random() * this.rows);
                const c = Math.floor(Math.random() * this.cols);

                // Don't place mine on safe spot or neighbors (ensure 0 start)
                if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;

                if (!this.grid[r][c].isMine) {
                    this.grid[r][c].isMine = true;
                    minesPlaced++;
                }
            }

            // Calculate numbers
            this.calculateNumbers();

            // Verify solvability
            if (checkSolvability(this.grid, safeR, safeC)) {
                console.log(`Board generated in ${attempts + 1} attempts`);
                return;
            }

            attempts++;
        }
        console.warn("Could not generate a guaranteed solvable board in max attempts. Using last attempt.");
    }

    calculateNumbers() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c].isMine) continue;
                let count = 0;
                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        if (i === 0 && j === 0) continue;
                        const nr = r + i, nc = c + j;
                        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                            if (this.grid[nr][nc].isMine) count++;
                        }
                    }
                }
                this.grid[r][c].neighborCount = count;
            }
        }
    }

    handleLeftClick(r, c) {
        if (this.state !== 'playing') return;
        if (this.grid[r][c].isFlagged) return;
        if (this.grid[r][c].isOpen) return; // Already open

        if (this.firstClick) {
            this.firstClick = false;
            this.startTimer();
            this.generateBoard(r, c);
        }

        if (this.grid[r][c].isMine) {
            this.gameOver(false);
            return;
        }

        this.revealCell(r, c);
        this.checkWin();
    }

    handleRightClick(r, c) {
        if (this.state !== 'playing') return;
        if (this.grid[r][c].isOpen) return;

        const cell = this.grid[r][c];
        cell.isFlagged = !cell.isFlagged;
        this.minesLeft += cell.isFlagged ? -1 : 1;

        this.onUpdate({ type: 'cell', r, c, data: cell });
        this.onUpdate({ type: 'stats', mines: this.minesLeft, time: this.timeElapsed });
    }

    handleDblClick(r, c) {
        if (this.state !== 'playing') return;
        const cell = this.grid[r][c];
        if (!cell.isOpen || cell.neighborCount === 0) return;

        let flags = 0;
        let hiddenNeighbors = [];

        // Scan neighbors
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                if (i === 0 && j === 0) continue;
                const nr = r + i, nc = c + j;
                if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                    const n = this.grid[nr][nc];
                    if (n.isFlagged) flags++;
                    else if (!n.isOpen) hiddenNeighbors.push({ r: nr, c: nc });
                }
            }
        }

        if (flags === cell.neighborCount) {
            let hitMine = false;
            hiddenNeighbors.forEach(pos => {
                const target = this.grid[pos.r][pos.c];
                if (target.isMine) {
                    hitMine = true;
                    // Ensure we show it's a mine by opening it, gameOver handles the rest validation usually
                    // But we need to make sure we don't just reveal it as safe.
                    // Actually handleLeftClick logic for mine handles Game Over.
                    // We can reuse that logic or manual trigger.
                    // For distinctness, let's manual trigger.
                    target.isOpen = true; // Force open to show bomb
                } else {
                    this.revealCell(pos.r, pos.c);
                }
            });

            if (hitMine) {
                this.gameOver(false);
            } else {
                this.checkWin();
            }
        }
    }

    revealCell(r, c) {
        const cell = this.grid[r][c];
        if (cell.isOpen || cell.isFlagged) return;

        cell.isOpen = true;
        this.onUpdate({ type: 'cell', r, c, data: cell });

        if (cell.neighborCount === 0) {
            // Flood fill
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    const nr = r + i, nc = c + j;
                    if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                        this.revealCell(nr, nc);
                    }
                }
            }
        }
    }

    checkWin() {
        let won = true;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (!this.grid[r][c].isMine && !this.grid[r][c].isOpen) {
                    won = false;
                    break;
                }
            }
        }

        if (won) {
            this.gameOver(true);
        }
    }

    gameOver(won) {
        this.state = won ? 'won' : 'lost';
        this.stopTimer();
        this.onUpdate({ type: 'gameOver', won, grid: this.grid });
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timeElapsed++;
            this.onUpdate({ type: 'stats', mines: this.minesLeft, time: this.timeElapsed });
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
}

/**
 * MAIN APP
 */
const DIFFICULTY = {
    beginner: { rows: 9, cols: 9, mines: 10 },
    intermediate: { rows: 16, cols: 16, mines: 40 },
    advanced: { rows: 16, cols: 30, mines: 99 }
};

class App {
    constructor() {
        this.renderer = new Renderer();
        this.difficultySelect = document.getElementById('difficulty-select');
        this.newGameBtn = document.getElementById('new-game-btn');

        this.currentGame = null;
        this.currentDifficulty = 'beginner';

        this.init();
    }

    init() {
        this.difficultySelect.addEventListener('change', (e) => {
            this.currentDifficulty = e.target.value;
            this.startNewGame();
        });

        this.newGameBtn.addEventListener('click', () => {
            this.startNewGame();
        });

        this.startNewGame();
    }

    startNewGame() {
        const config = DIFFICULTY[this.currentDifficulty];

        if (this.currentGame) {
            this.currentGame.stopTimer();
        }

        this.currentGame = new Game(
            config.rows,
            config.cols,
            config.mines,
            (update) => this.handleGameUpdate(update)
        );

        this.currentGame.start();
    }

    handleGameUpdate(update) {
        switch (update.type) {
            case 'init':
                this.renderer.initBoard(
                    update.rows,
                    update.cols,
                    (r, c) => this.currentGame.handleLeftClick(r, c),
                    (r, c) => this.currentGame.handleRightClick(r, c),
                    (r, c) => this.currentGame.handleDblClick(r, c)
                );
                break;
            case 'cell':
                this.renderer.updateCell(update.r, update.c, update.data);
                break;
            case 'stats':
                this.renderer.updateStats(update.mines, update.time);
                break;
            case 'gameOver':
                this.renderer.revealAll(update.grid);
                this.renderer.showGameOver(update.won, () => this.startNewGame());
                break;
        }
    }
}

// Start the app
window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
