const socket = new WebSocket(`wss://${location.host}/ws`);
let playerId = null;
let myTurn = false;
let enemyBoard, playerBoard;
let enemyState = Array(10).fill().map(() => Array(10).fill(0));
let playerState = Array(10).fill().map(() => Array(10).fill(0));
const status = document.getElementById('status');

// Генерация доски
function generateBoard(container, isEnemy) {
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.x = x;
            cell.dataset.y = y;
            if (isEnemy) {
                cell.addEventListener('click', () => {
                    if (!myTurn || cell.classList.contains('hit') || cell.classList.contains('miss')) return;
                    socket.send(JSON.stringify({ type: 'shoot', x, y }));
                });
            }
            container.appendChild(cell);
        }
    }
}

// Расстановка кораблей случайно (простейшая логика)
function placeShipsRandomly(state) {
    const ships = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];
    for (const size of ships) {
        let placed = false;
        while (!placed) {
            const x = Math.floor(Math.random() * 10);
            const y = Math.floor(Math.random() * 10);
            const horizontal = Math.random() < 0.5;
            let fits = true;
            for (let i = 0; i < size; i++) {
                const nx = x + (horizontal ? i : 0);
                const ny = y + (horizontal ? 0 : i);
                if (nx >= 10 || ny >= 10 || state[ny][nx] !== 0) {
                    fits = false;
                    break;
                }
            }
            if (fits) {
                for (let i = 0; i < size; i++) {
                    const nx = x + (horizontal ? i : 0);
                    const ny = y + (horizontal ? 0 : i);
                    state[ny][nx] = 1;
                }
                placed = true;
            }
        }
    }
}

socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'init') {
        playerId = msg.playerId;
        myTurn = msg.start;
        status.textContent = myTurn ? "Ваш ход" : "Ход соперника";
    } else if (msg.type === 'result') {
        const board = document.getElementById('enemy-board');
        const idx = msg.y * 10 + msg.x;
        const cell = board.children[idx];
        if (msg.hit) {
            cell.classList.add('hit');
            status.textContent = 'Попал!';
        } else {
            cell.classList.add('miss');
            status.textContent = 'Мимо!';
        }
        myTurn = false;
    } else if (msg.type === 'incoming') {
        const board = document.getElementById('player-board');
        const idx = msg.y * 10 + msg.x;
        const cell = board.children[idx];
        if (msg.hit) {
            cell.classList.add('hit-received');
        } else {
            cell.classList.add('miss');
        }
        myTurn = true;
        status.textContent = 'Ваш ход';
    } else if (msg.type === 'end') {
        status.textContent = msg.winner === playerId ? 'Вы выиграли!' : 'Вы проиграли!';
        myTurn = false;
    }
};

window.onload = () => {
    enemyBoard = document.getElementById('enemy-board');
    playerBoard = document.getElementById('player-board');
    generateBoard(enemyBoard, true);
    generateBoard(playerBoard, false);
    placeShipsRandomly(playerState);

    // Отправляем свою доску на сервер
    socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'board', board: playerState }));
    };
};
