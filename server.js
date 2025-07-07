const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

let waitingUser = null;

io.on("connection", (socket) => {
  console.log("Nouvel utilisateur connecté :", socket.id);

  socket.on("ready", () => {
    if (waitingUser) {
      const otherSocket = waitingUser;
      waitingUser = null;
      socket.emit("startCall", otherSocket.id);
      otherSocket.emit("startCall", socket.id);
      console.log(`Connexion entre ${socket.id} et ${otherSocket.id}`);
    } else {
      waitingUser = socket;
    }
  });

  socket.on("offer", ({ offer, to }) => {
    io.to(to).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", ({ answer, to }) => {
    io.to(to).emit("answer", { answer, from: socket.id });
  });

  socket.on("ice", ({ candidate, to }) => {
    io.to(to).emit("ice", { candidate, from: socket.id });
  });

  socket.on("disconnect", () => {
    console.log("Utilisateur déconnecté :", socket.id);
    if (waitingUser && waitingUser.id === socket.id) {
      waitingUser = null;
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur lancé sur le port ${PORT}`);
});
