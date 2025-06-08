const rotateBtn = document.getElementById("rotate");
let horizontal = true;
rotateBtn.onclick = () => {
    horizontal = !horizontal;
    rotateBtn.textContent = horizontal ? "Горизонтально" : "Вертикально";
};

const shipSizes = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];
let shipsToPlace = [...shipSizes];
let tempPlayerBoard = Array(10).fill(null).map(() => Array(10).fill(0));
let placedShips = [];

function createBoard(container, isInteractive, handler) {
    container.innerHTML = "";
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");
            cell.dataset.x = x;
            cell.dataset.y = y;
            if (isInteractive) {
                cell.addEventListener("click", () => handler(x, y, cell));
            }
            container.appendChild(cell);
        }
    }
}

function placeShip(x, y, size) {
    const coords = [];
    for (let i = 0; i < size; i++) {
        const nx = x + (horizontal ? i : 0);
        const ny = y + (!horizontal ? i : 0);
        if (nx >= 10 || ny >= 10 || tempPlayerBoard[ny][nx] !== 0) return false;
        coords.push([nx, ny]);
    }
    coords.forEach(([nx, ny]) => tempPlayerBoard[ny][nx] = 1);
    placedShips.push(coords);
    return true;
}

const setupBoard = document.getElementById("player-board");
createBoard(setupBoard, true, (x, y, cell) => {
    if (!shipsToPlace.length) return;
    const size = parseInt(document.getElementById("ship-size").value);
    if (placeShip(x, y, size)) {
        shipsToPlace.splice(shipsToPlace.indexOf(size), 1);
        updateSetupBoard();
        if (!shipsToPlace.length) {
            document.getElementById("ready").disabled = false;
        }
    }
});

function updateSetupBoard() {
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
            const idx = y * 10 + x;
            const cell = setupBoard.children[idx];
            if (tempPlayerBoard[y][x] === 1) cell.classList.add("ship");
        }
    }
}

// ==== GAME ====

let playerId = null;
let myTurn = false;
let socket = new WebSocket(`wss://${location.host}/ws`);
let playerBoardGame = document.getElementById("player-board-game");
let enemyBoard = document.getElementById("enemy-board");

createBoard(playerBoardGame, false);
createBoard(enemyBoard, true, (x, y, cell) => {
    if (!myTurn || cell.classList.contains("hit") || cell.classList.contains("miss")) return;
    socket.send(JSON.stringify({ type: "shoot", x, y }));
});

document.getElementById("ready").onclick = () => {
    document.getElementById("setup").style.display = "none";
    document.getElementById("game").style.display = "block";
    socket.send(JSON.stringify({ type: "board", board: tempPlayerBoard }));
    updateSetupBoardGame();
};

function updateSetupBoardGame() {
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
            const idx = y * 10 + x;
            const cell = playerBoardGame.children[idx];
            if (tempPlayerBoard[y][x] === 1) cell.classList.add("ship");
        }
    }
}

socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    const status = document.getElementById("status");

    if (msg.type === "init") {
        playerId = msg.playerId;
        myTurn = msg.start;
        status.textContent = myTurn ? "Ваш ход" : "Ход противника";
    }

    else if (msg.type === "result") {
        const idx = msg.y * 10 + msg.x;
        const cell = enemyBoard.children[idx];
        if (msg.hit) {
            cell.classList.add("hit");
            status.textContent = "Попал!";
        } else {
            cell.classList.add("miss");
            status.textContent = "Мимо!";
        }
        myTurn = false;
    }

    else if (msg.type === "incoming") {
        const idx = msg.y * 10 + msg.x;
        const cell = playerBoardGame.children[idx];
        if (msg.hit) {
            cell.classList.add("hit-received");
        } else {
            cell.classList.add("miss");
        }
        myTurn = true;
        status.textContent = "Ваш ход";
    }

    else if (msg.type === "end") {
        status.textContent = msg.winner === playerId ? "Вы выиграли!" : "Вы проиграли!";
        myTurn = false;
    }
};
