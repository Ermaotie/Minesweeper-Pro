import { Game } from './game.js';
import { Renderer } from './renderer.js';

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
                    (r, c) => this.currentGame.handleRightClick(r, c)
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
    new App();
});
