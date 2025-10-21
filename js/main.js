class CandyCrushGame {
    constructor(canvasId, assets) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.screenWidth = this.canvas.width;
        this.screenHeight = this.canvas.height;
        this.assets = assets;

        this.gameState = 'playing'; // 'playing', 'gameOver'
        this.board = new Board(this.assets, 8, 10, 70);
        this.ui = new UI(this.screenWidth, this.screenHeight);
        this.gameOverScreen = new GameOverScreen(this.screenWidth, this.screenHeight, () => this.resetGame());

        // Assign loaded assets
        this.ui.setMascotImages({
            happy: this.assets.images.mascot_happy,
            normal: this.assets.images.mascot_normal,
            sad: this.assets.images.mascot_sad,
            nervous: this.assets.images.mascot_nervous
        });
        window.background = this.assets.images.background;
        window.frame = this.assets.images.frame;
        window.gameOverBackground = this.assets.images.game_over;
        window.buttonBackground = this.assets.images.button_background;

        // Assign candy images to window for Candy class to use
        window.red = this.assets.images.red;
        window.green = this.assets.images.green;
        window.blue = this.assets.images.blue;
        window.yellow = this.assets.images.yellow;
        window.stripe_h = this.assets.images.stripe_h;
        window.stripe_v = this.assets.images.stripe_v;
        window.bomb = this.assets.images.bomb;
        window.rainbow = this.assets.images.rainbow;

        this.score = 0;
        this.timeLeft = 60;

        this.boardX = (this.screenWidth - this.board.width * this.board.cellSize) / 2;
        this.boardY = 150;

        this.lastTime = 0;

        this.initEvents();
    }

    initEvents() {
        let bgmPlayed = false; // Add a flag to ensure BGM plays only once
        this.canvas.addEventListener('click', (e) => {
            console.log('Canvas clicked!');
            // Play BGM on first user interaction
            if (!bgmPlayed) {
                this.assets.sounds.bgm.play().catch(e => console.log("BGM play failed, user interaction needed."));
                bgmPlayed = true;
            }

            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            console.log(`Mouse X: ${mouseX}, Mouse Y: ${mouseY}`);

            if (this.gameState === 'playing') {
                console.log('Game state is playing.');
                const gridX = Math.floor((mouseX - this.boardX) / this.board.cellSize);
                const gridY = Math.floor((mouseY - this.boardY) / this.board.cellSize);
                console.log(`Grid X: ${gridX}, Grid Y: ${gridY}`);
                const { needsProcessing } = this.board.select(gridX, gridY);
                console.log(`Needs processing: ${needsProcessing}`);
                if (needsProcessing) {
                    this.assets.sounds.swap.play();
                }
            } else if (this.gameState === 'gameOver') {
                console.log('Game state is game over.');
                if (this.gameOverScreen.handleClick({ x: mouseX, y: mouseY })) {
                    // Reset logic is handled in the constructor callback
                }
            }
        });
    }

    startGame() {
        this.assets.sounds.bgm.play().catch(e => console.log("BGM play failed, user interaction needed."));
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    gameLoop(timestamp) {
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(dt);
        this.draw();

        requestAnimationFrame(this.gameLoop.bind(this));
    }

    update(dt) {
        if (this.gameState !== 'playing') return;

        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.endGame();
        }

        const isAnimating = this.board.update(dt);

        if (!isAnimating) {
            let scoreGained = 0;
            let changed = false;

            const specialActivationResult = this.board.handlePendingSpecialActivation();
            if (specialActivationResult.activated) {
                scoreGained += specialActivationResult.score;
                this.assets.sounds.special.play();
                changed = true;
            }

            const matchResult = this.board.processMatches();
            if (matchResult.matched) {
                console.log('Match detected, playing match sound.');
                scoreGained += matchResult.score;
                this.assets.sounds.match.play();
                changed = true;
            }

            if (changed) {
                this.score += scoreGained;
            }
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.screenWidth, this.screenHeight);

        if (this.gameState === 'playing') {
            this.ui.drawGameUI(this.ctx, this.score, this.timeLeft);
            this.ui.drawBoardFrame(this.ctx, this.board, this.boardX, this.boardY);
            this.board.draw(this.ctx, this.boardX, this.boardY);
        } else if (this.gameState === 'gameOver') {
            this.gameOverScreen.draw(this.ctx, this.score);
        }
    }

    endGame() {
        this.gameState = 'gameOver';
        this.assets.sounds.bgm.pause();
    }

    resetGame() {
        this.score = 0;
        this.timeLeft = 60;
        this.board.initializeBoard();
        this.gameState = 'playing';
        this.assets.sounds.bgm.currentTime = 0;
        this.assets.sounds.bgm.play().catch(e => console.log("BGM play failed, user interaction needed."));
    }
}

async function loadAssets() {
    const imagePaths = {
        red: 'images/candies/red.png',
        green: 'images/candies/green.png',
        blue: 'images/candies/blue.png',
        yellow: 'images/candies/yellow.png',
        stripe_h: 'images/candies/stripe_h.png',
        stripe_v: 'images/candies/stripe_v.png',
        bomb: 'images/candies/bomb.png',
        rainbow: 'images/candies/rainbow.png',
        background: 'images/ui/background.png',
        frame: 'images/ui/frame.png',
        game_over: 'images/ui/game_over.png',
        button_background: 'images/ui/button_background.png',
        mascot_happy: 'images/mascot/happy.png',
        mascot_normal: 'images/mascot/normal.png',
        mascot_sad: 'images/mascot/sad.png',
        mascot_nervous: 'images/mascot/nervous.png',
    };

    const soundPaths = {
        bgm: 'sounds/bgm.MP3',
        match: 'sounds/match.MP3',
        special: 'sounds/special.MP3',
        swap: 'sounds/swap.MP3',
    };

    const imagePromises = Object.entries(imagePaths).map(([name, src]) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({ name, img });
            img.onerror = () => reject(`Failed to load image: ${src}`);
            img.src = src;
        });
    });

    const soundPromises = Object.entries(soundPaths).map(([name, src]) => {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.oncanplaythrough = () => resolve({ name, audio });
            audio.onerror = () => reject(`Failed to load sound: ${src}`);
            audio.src = src;
        });
    });

    const images = (await Promise.all(imagePromises)).reduce((acc, { name, img }) => {
        acc[name] = img;
        return acc;
    }, {});

    const sounds = (await Promise.all(soundPromises)).reduce((acc, { name, audio }) => {
        acc[name] = audio;
        return acc;
    }, {});
    
    sounds.bgm.loop = true;

    return { images, sounds };
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const assets = await loadAssets();
        const game = new CandyCrushGame('gameCanvas', assets);
        game.startGame();
    } catch (error) {
        console.error("Could not start game:", error);
        document.body.innerHTML = `<div style="color: red; font-size: 24px;">Error loading game assets. Please check the console for details.</div>`;
    }
});