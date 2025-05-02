// Get canvas elements and context
var mazeCanvas = document.getElementById("myCanvas");
var ctx = mazeCanvas.getContext("2d");
var instructions = document.getElementById("instructions");
instructions.style.display = "none";
var mazeForm = document.getElementById("mazeForm");

// Global game variables
let maze;
let player;
let gameInProgress = false;

/* Depth-first search maze generation */
class Maze {
    constructor(size, rows, columns) {
        this.size = size;
        this.rows = rows;
        this.columns = columns;
        this.grid = [];
        this.stack = [];
        this.complete = false;
        this.finishRow = 0;
        this.finishCol = 0;
    }

    setup() {
        // Create the grid of cells
        for (let r = 0; r < this.rows; r++) {
            let row = [];
            for (let c = 0; c < this.columns; c++) {
                let cell = new Cell(r, c, this.grid, this.size);
                row.push(cell);
            }
            this.grid.push(row);
        }
        this.current = this.grid[0][0]; // Start point (top left)
        this.current.visited = true; // Mark as visited immediately

        // Set up the canvas
        mazeCanvas.width = this.size;
        mazeCanvas.height = this.size;
        mazeCanvas.style.background = "black";

        // Generate a random finish position (not in any corner)
        this.generateRandomFinishPosition();
    }

    // Generate a random finish position that's not in any corner
    generateRandomFinishPosition() {
        // Define the corners to avoid
        const corners = [
            { row: 0, col: 0 }, // Top-left
            { row: 0, col: this.columns - 1 }, // Top-right
            { row: this.rows - 1, col: 0 }, // Bottom-left
            { row: this.rows - 1, col: this.columns - 1 }, // Bottom-right
        ];

        // Generate random positions until we find one that's not a corner
        let isCorner;
        do {
            this.finishRow = Math.floor(Math.random() * this.rows);
            this.finishCol = Math.floor(Math.random() * this.columns);

            // Check if this position is a corner
            isCorner = corners.some(
                (corner) =>
                    corner.row === this.finishRow &&
                    corner.col === this.finishCol
            );
        } while (isCorner);
    }

    // Non-recursive maze generation using animation frame
    generateMaze() {
        if (this.complete) return;

        // Draw all cells in their current state
        this.drawGrid();

        // If there's a current cell, process it
        if (this.current) {
            this.current.highLight(this.columns);
            let next = this.current.checkNeighbours();

            if (next) {
                next.visited = true;
                this.stack.push(this.current);
                this.current.removeWalls(this.current, next);
                this.current = next;
            } else if (this.stack.length > 0) {
                this.current = this.stack.pop();
            } else {
                this.current = null; // No more cells to process
            }
        }

        // Check if generation is complete
        if (!this.current && this.stack.length === 0) {
            this.complete = true;
            console.log("Maze generation complete!");
            // Make sure the finish cell is different from start
            if (this.finishRow === 0 && this.finishCol === 0) {
                this.generateRandomFinishPosition();
            }
            this.drawGrid(); // Final draw
            this.drawFinishSpot();
            createPlayer(); // Create the player once maze is complete
            console.log(
                `Finish position confirmed at: row ${this.finishRow}, column ${this.finishCol}`
            );
            return;
        }

        // Continue generation in the next frame
        requestAnimationFrame(() => this.generateMaze());
    }

    // Draw the entire grid
    drawGrid() {
        ctx.clearRect(0, 0, this.size, this.size);
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.columns; c++) {
                this.grid[r][c].show(this.size, this.rows, this.columns);
            }
        }

        if (player) {
            player.draw();
        }
    }

    // Draw the maze with the player
    draw() {
        this.drawGrid();
        this.drawFinishSpot(); // Draw the finish spot AFTER the grid
        if (player) {
            player.draw();
        }
    }

    drawFinishSpot() {
        // Only draw the finish spot if the cell is explored
        if (this.grid[this.finishRow][this.finishCol].explored) {
            const cellSize = this.size / this.columns;
            const x = this.finishCol * cellSize + 2;
            const y = this.finishRow * cellSize + 2;
            const size = cellSize - 4;

            // Use a distinctive color and logging to debug
            ctx.fillStyle = "gold";
            ctx.fillRect(x, y, size, size);

            // Draw a distinctive border around it to make it more visible
            ctx.strokeStyle = "red";
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, size, size);
        }
    }
}

class Cell {
    constructor(rowNum, colNum, parentGrid, parentSize) {
        this.rowNum = rowNum;
        this.colNum = colNum;
        this.parentGrid = parentGrid;
        this.parentSize = parentSize;
        this.visited = false;
        this.walls = {
            topWall: true,
            rightWall: true,
            bottomWall: true,
            leftWall: true,
        };
        this.explored = false;
    }

    checkNeighbours() {
        let grid = this.parentGrid;
        let row = this.rowNum;
        let col = this.colNum;
        let neighbours = [];

        // Check all four neighboring cells
        let top = row !== 0 ? grid[row - 1][col] : undefined;
        let right = col !== grid[0].length - 1 ? grid[row][col + 1] : undefined;
        let bottom = row !== grid.length - 1 ? grid[row + 1][col] : undefined;
        let left = col !== 0 ? grid[row][col - 1] : undefined;

        // Add unvisited neighbors to the list
        if (top && !top.visited) neighbours.push(top);
        if (right && !right.visited) neighbours.push(right);
        if (bottom && !bottom.visited) neighbours.push(bottom);
        if (left && !left.visited) neighbours.push(left);

        // Return a random unvisited neighbor
        if (neighbours.length !== 0) {
            let random = Math.floor(Math.random() * neighbours.length);
            return neighbours[random];
        } else {
            return undefined;
        }
    }

    // Drawing methods for each wall
    drawTopWall(x, y, size, columns, rows) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + size / columns, y);
        ctx.stroke();
    }

    drawRightWall(x, y, size, columns, rows) {
        ctx.beginPath();
        ctx.moveTo(x + size / columns, y);
        ctx.lineTo(x + size / columns, y + size / rows);
        ctx.stroke();
    }

    drawBottomWall(x, y, size, columns, rows) {
        ctx.beginPath();
        ctx.moveTo(x, y + size / rows);
        ctx.lineTo(x + size / columns, y + size / rows);
        ctx.stroke();
    }

    drawLeftWall(x, y, size, columns, rows) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + size / rows);
        ctx.stroke();
    }

    // Highlight the current cell during generation
    highLight(columns) {
        let x = (this.colNum * this.parentSize) / columns + 1;
        let y = (this.rowNum * this.parentSize) / columns + 1;
        let cellSize = this.parentSize / columns - 3;

        ctx.fillStyle = "green";
        ctx.fillRect(x, y, cellSize, cellSize);
    }

    // Remove walls between two adjacent cells
    removeWalls(cell1, cell2) {
        let x = cell1.colNum - cell2.colNum;

        if (x === 1) {
            cell1.walls.leftWall = false;
            cell2.walls.rightWall = false;
        } else if (x === -1) {
            cell1.walls.rightWall = false;
            cell2.walls.leftWall = false;
        }

        let y = cell1.rowNum - cell2.rowNum;

        if (y === 1) {
            cell1.walls.topWall = false;
            cell2.walls.bottomWall = false;
        } else if (y === -1) {
            cell1.walls.bottomWall = false;
            cell2.walls.topWall = false;
        }
    }

    // Draw the cell with its walls - fixed version with proper fog of war
    show(size, rows, columns) {
        let x = (this.colNum * size) / columns;
        let y = (this.rowNum * size) / rows;

        if (this.explored) {
            // This cell has been explored, draw walls and floor
            ctx.strokeStyle = "white";
            ctx.fillStyle = this.visited ? "black" : "darkgray";

            // Draw the walls if they exist
            if (this.walls.topWall) this.drawTopWall(x, y, size, columns, rows);
            if (this.walls.rightWall)
                this.drawRightWall(x, y, size, columns, rows);
            if (this.walls.bottomWall)
                this.drawBottomWall(x, y, size, columns, rows);
            if (this.walls.leftWall)
                this.drawLeftWall(x, y, size, columns, rows);

            // Draw the cell's floor
            ctx.fillRect(x + 1, y + 1, size / columns - 2, size / rows - 2);
        } else {
            // This cell has not been explored yet, draw fog
            ctx.fillStyle = "black"; // Fog color
            ctx.fillRect(x, y, size / columns, size / rows);
        }
    }
}

class Player {
    constructor(name, cellSize, color = "red") {
        this.name = name;
        this.row = 0;
        this.col = 0;
        this.cellSize = cellSize;
        this.color = color;
        this.x = this.col * this.cellSize + 5;
        this.y = this.row * this.cellSize + 5;

        // Explore the starting position and surroundings
        this.exploreSurroundings();
    }

    move(direction) {
        // Store previous position
        const previousRow = this.row;
        const previousCol = this.col;

        // Check if move is valid and update position
        switch (direction) {
            case "up":
                if (
                    this.row > 0 &&
                    !maze.grid[this.row][this.col].walls.topWall
                ) {
                    this.row--;
                }
                break;
            case "down":
                if (
                    this.row < maze.rows - 1 &&
                    !maze.grid[this.row][this.col].walls.bottomWall
                ) {
                    this.row++;
                }
                break;
            case "left":
                if (
                    this.col > 0 &&
                    !maze.grid[this.row][this.col].walls.leftWall
                ) {
                    this.col--;
                }
                break;
            case "right":
                if (
                    this.col < maze.columns - 1 &&
                    !maze.grid[this.row][this.col].walls.rightWall
                ) {
                    this.col++;
                }
                break;
        }

        if (previousRow !== this.row || previousCol !== this.col) {
            this.x = this.col * this.cellSize + 5;
            this.y = this.row * this.cellSize + 5;

            // Mark current and nearby cells as explored
            this.exploreSurroundings();

            // Check for win condition (reaching the finish spot)
            if (this.row === maze.finishRow && this.col === maze.finishCol) {
                setTimeout(() => {
                    alert("Congratulations! You solved the maze!");
                    gameInProgress = false;
                }, 100);
            }
        }
    }

    exploreSurroundings() {
        const radius = 1; // How many cells around the player to explore
        for (let i = -radius; i <= radius; i++) {
            for (let j = -radius; j <= radius; j++) {
                const row = this.row + i;
                const col = this.col + j;

                if (
                    row >= 0 &&
                    row < maze.rows &&
                    col >= 0 &&
                    col < maze.columns
                ) {
                    maze.grid[row][col].explored = true;
                }
            }
        }
        maze.grid[this.row][this.col].explored = true; // Ensure current cell is always explored
    }

    draw() {
        // Draw the player as a colored rectangle
        ctx.fillStyle = this.color;
        const drawSize = this.cellSize - 10;
        ctx.fillRect(this.x, this.y, drawSize, drawSize);
    }
}

// Form validation for maze parameters
function validateInput(value, min, max, defaultVal) {
    const num = parseInt(value);
    if (isNaN(num) || num < min || num > max) {
        return defaultVal;
    }
    return num;
}

// Function to start generating a new maze
function generateNewMaze() {
    instructions.style.display = "";
    if (gameInProgress) return;

    // Get and validate form values
    const size = validateInput(
        document.getElementById("mazeSize").value,
        300,
        800,
        400
    );
    const rows = validateInput(
        document.getElementById("mazeRows").value,
        5,
        50,
        10
    );
    const columns = validateInput(
        document.getElementById("mazeColumns").value,
        5,
        50,
        10
    );

    // Create new maze
    maze = new Maze(size, rows, columns);
    maze.setup();

    // Explicitly set a random finish position for testing
    maze.generateRandomFinishPosition();
    console.log(
        `Initial finish position set to: row ${maze.finishRow}, column ${maze.finishCol}`
    );

    // Start generation
    gameInProgress = true;
    maze.generateMaze();

    // Instructions
    console.log(
        "Use arrow keys to navigate the maze. Find the golden square with red border to win!"
    );
}

// Create player once maze is complete
function createPlayer() {
    const cellSize = maze.size / maze.rows;
    player = new Player("Hero", cellSize);
    player.draw();
}

// Handle keyboard input
function handleKeyDown(event) {
    if (!gameInProgress || !player || !maze || !maze.complete) return;

    switch (event.key) {
        case "ArrowUp":
            player.move("up");
            break;
        case "ArrowDown":
            player.move("down");
            break;
        case "ArrowLeft":
            player.move("left");
            break;
        case "ArrowRight":
            player.move("right");
            break;
    }

    // Redraw the maze with the player
    maze.draw();
}
// Get references to the control buttons
const upButton = document.getElementById("up-btn");
const downButton = document.getElementById("down-btn");
const leftButton = document.getElementById("left-btn");
const rightButton = document.getElementById("right-btn");

// Function to handle button press and trigger movement
function handleButtonPress(direction) {
    if (!gameInProgress || !player || !maze || !maze.complete) return;
    player.move(direction);
    maze.draw();
}

// Add event listeners for touchstart (for mobile) and mousedown (for desktop testing)
upButton.addEventListener("touchstart", () => handleButtonPress("up"));
upButton.addEventListener("mousedown", () => handleButtonPress("up"));

downButton.addEventListener("touchstart", () => handleButtonPress("down"));
downButton.addEventListener("mousedown", () => handleButtonPress("down"));

leftButton.addEventListener("touchstart", () => handleButtonPress("left"));
leftButton.addEventListener("mousedown", () => handleButtonPress("left"));

rightButton.addEventListener("touchstart", () => handleButtonPress("right"));
rightButton.addEventListener("mousedown", () => handleButtonPress("right"));

class Enemy {
    constructor(name, cellSize, color = "blue", movement) {
        this.name = name;
        this.row = 0;
        this.col = 0;
        this.cellSize = cellSize;
        this.color = color;
        this.x = this.col * this.cellSize + 5;
        this.y = this.row * this.cellSize + 5;
        this.movement = movement;
    }
}

// Initialize game
function initGame() {
    window.addEventListener("keydown", handleKeyDown);
    document
        .getElementById("startMazeBtn")
        .addEventListener("click", generateNewMaze);
}

// Start initialization when the page loads
window.addEventListener("load", initGame);
