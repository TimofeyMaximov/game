const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const clients = [];
const boards = [null, null];
const hits = [[], []];

const server = http.createServer((req, res) => {
    let filePath = path.join(__dirname, '../client', req.url === '/' ? 'index.html' : req.url);
    const ext = path.extname(filePath);
    const contentType = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript'
    }[ext] || 'text/plain';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

const wss = new WebSocket.Server({ server, path: '/ws' });

wss.on('connection', (ws) => {
    if (clients.length >= 2) {
        ws.close();
        return;
    }

    const playerId = clients.length;
    clients[playerId] = ws;
    hits[playerId] = [];

    ws.on('message', (data) => {
        const msg = JSON.parse(data);

        if (msg.type === 'board') {
            boards[playerId] = msg.board;
            if (boards[0] && boards[1]) {
                clients[0].send(JSON.stringify({ type: 'init', playerId: 0, start: true }));
                clients[1].send(JSON.stringify({ type: 'init', playerId: 1, start: false }));
            }
        }

        else if (msg.type === 'shoot') {
            const enemyId = playerId === 0 ? 1 : 0;
            const { x, y } = msg;
            const enemyBoard = boards[enemyId];
            if (!enemyBoard || !enemyBoard[y]) return;

            const alreadyShot = hits[playerId].some(hit => hit.x === x && hit.y === y);
            if (alreadyShot) return;

            const isHit = enemyBoard[y][x] === 1;
            hits[playerId].push({ x, y });

            ws.send(JSON.stringify({ type: 'result', x, y, hit: isHit }));
            clients[enemyId].send(JSON.stringify({ type: 'incoming', x, y, hit: isHit }));

            const totalHits = hits[playerId].filter(h => enemyBoard[h.y][h.x] === 1).length;
            const totalShipCells = enemyBoard.flat().filter(cell => cell === 1).length;

            if (totalHits >= totalShipCells) {
                clients[0]?.send(JSON.stringify({ type: 'end', winner: playerId }));
                clients[1]?.send(JSON.stringify({ type: 'end', winner: playerId }));
            }
        }
    });

    ws.on('close', () => {
        clients[playerId] = null;
        boards[playerId] = null;
        hits[playerId] = [];
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
