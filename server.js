const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

let waitingPlayer = null;

function setupGame(p1, p2) {
  p1.enemy = p2;
  p2.enemy = p1;
  p1.board = {};
  p2.board = {};
  p1.hits = 0;
  p2.hits = 0;
  p1.ready = false;
  p2.ready = false;
  p1.isTurn = true;
  p2.isTurn = false;

  p1.send(JSON.stringify({ type: 'setup' }));
  p2.send(JSON.stringify({ type: 'setup' }));
}

wss.on('connection', (ws) => {
  if (waitingPlayer === null) {
    waitingPlayer = ws;
    ws.send(JSON.stringify({ type: 'waiting' }));
  } else {
    const p1 = waitingPlayer;
    const p2 = ws;
    waitingPlayer = null;
    setupGame(p1, p2);
  }

  ws.on('message', (msg) => {
    const data = JSON.parse(msg);
    const enemy = ws.enemy;

    if (data.type === 'setup') {
      ws.board = data.board;
      ws.ready = true;
      if (enemy && enemy.ready) {
        ws.send(JSON.stringify({ type: 'start', yourTurn: ws.isTurn }));
        enemy.send(JSON.stringify({ type: 'start', yourTurn: enemy.isTurn }));
      }
    }

    if (data.type === 'fire' && ws.isTurn && enemy) {
      const key = `${data.x},${data.y}`;
      const hit = enemy.board[key] === true;
      if (hit) {
        enemy.board[key] = false;
        ws.hits += 1;
      }

      ws.send(JSON.stringify({ type: 'result', x: data.x, y: data.y, hit }));
      enemy.send(JSON.stringify({ type: 'incoming', x: data.x, y: data.y, hit }));

      if (ws.hits >= 10) {
        ws.send(JSON.stringify({ type: 'win' }));
        enemy.send(JSON.stringify({ type: 'lose' }));
        return;
      }

      ws.isTurn = false;
      enemy.isTurn = true;

      enemy.send(JSON.stringify({ type: 'yourTurn' }));
    }
  });

  ws.on('close', () => {
    if (ws.enemy) {
      ws.enemy.send(JSON.stringify({ type: 'disconnect' }));
    }
    if (waitingPlayer === ws) {
      waitingPlayer = null;
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
