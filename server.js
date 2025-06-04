const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

let waitingPlayer = null;

wss.on('connection', (ws) => {
  if (waitingPlayer === null) {
    waitingPlayer = ws;
    ws.send(JSON.stringify({ type: 'wait' }));
  } else {
    const player1 = waitingPlayer;
    const player2 = ws;
    waitingPlayer = null;

    player1.opponent = player2;
    player2.opponent = player1;

    player1.send(JSON.stringify({ type: 'start', yourTurn: true }));
    player2.send(JSON.stringify({ type: 'start', yourTurn: false }));

    [player1, player2].forEach(player => {
      player.on('message', msg => {
        const data = JSON.parse(msg);
        if (player.opponent && player.opponent.readyState === WebSocket.OPEN) {
          player.opponent.send(JSON.stringify(data));
        }
      });
    });
  }

  ws.on('close', () => {
    if (ws.opponent) ws.opponent.send(JSON.stringify({ type: 'disconnect' }));
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
