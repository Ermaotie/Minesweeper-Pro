import { checkSolvability } from './solver.js';

export class Game {
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
        const maxAttempts = 50; // Prevent infinite loop

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
