export class Renderer {
    constructor() {
        this.boardElement = document.getElementById('game-board');
        this.mineCountElement = document.getElementById('mine-count');
        this.timerElement = document.getElementById('timer');
        this.modal = document.getElementById('game-over-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.modalMessage = document.getElementById('modal-message');
        this.modalRestartBtn = document.getElementById('modal-restart-btn');
    }

    initBoard(rows, cols, onCellClick, onCellRightClick) {
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

                this.boardElement.appendChild(cell);
            }
        }
    }

    updateCell(r, c, cellData) {
        // Find cell by index or coordinates. 
        // Since we clear board on init, we can assume child nodes order matches.
        // But to be safe and robust, we can query selector or store references.
        // For performance in a simple grid, childNodes index is fine.
        // row * cols + col
        const cols = this.boardElement.style.gridTemplateColumns.split(' ').length;
        const index = r * cols + c;
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
        const cols = grid[0].length;
        grid.forEach((row, r) => {
            row.forEach((cellData, c) => {
                if (cellData.isMine) {
                    const index = r * cols + c;
                    const cellNode = this.boardElement.children[index];
                    if (!cellData.isFlagged) {
                        cellNode.classList.add('revealed', 'mine');
                        cellNode.textContent = '💣';
                    }
                } else if (cellData.isFlagged && !cellData.isMine) {
                     // Wrong flag
                    const index = r * cols + c;
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
