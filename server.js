const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let waitingUser = null;

io.on('connection', (socket) => {
  console.log('Nouvel utilisateur connecté :', socket.id);

  if (waitingUser) {
    console.log(`Connexion entre ${socket.id} et ${waitingUser.id}`);
    socket.emit('match', { id: waitingUser.id, initiator: true });
    waitingUser.emit('match', { id: socket.id, initiator: false });
    waitingUser = null;
  } else {
    waitingUser = socket;
  }

  socket.on('signal', (data) => {
    if (data.to) {
      io.to(data.to).emit('signal', {
        from: socket.id,
        signal: data.signal
      });
    }
  });

  socket.on('disconnect', () => {
    if (waitingUser === socket) {
      waitingUser = null;
    }
  });
});

http.listen(3000, '0.0.0.0', () => {
  console.log('Serveur lancé sur http://0.0.0.0:3000');
});
