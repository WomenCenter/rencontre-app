const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

let waitingUser = null;

io.on("connection", (socket) => {
  console.log("Nouvel utilisateur connecté :", socket.id);

  socket.on("ready", () => {
    if (waitingUser && waitingUser !== socket.id) {
      socket.to(waitingUser).emit("startCall", socket.id);
      socket.emit("startCall", waitingUser);
      console.log(`Connexion entre ${socket.id} et ${waitingUser}`);
      waitingUser = null;
    } else {
      waitingUser = socket.id;
      console.log(`${socket.id} est en attente d'une connexion.`);
    }
  });

  socket.on("offer", (data) => {
    socket.to(data.to).emit("offer", { offer: data.offer, from: socket.id });
  });

  socket.on("answer", (data) => {
    socket.to(data.to).emit("answer", { answer: data.answer, from: socket.id });
  });

  socket.on("ice", (data) => {
    socket.to(data.to).emit("ice", { candidate: data.candidate, from: socket.id });
  });

  socket.on("disconnect", () => {
    if (waitingUser === socket.id) {
      waitingUser = null;
    }
  });
});

server.listen(3000, () => {
  console.log("Serveur lancé sur http://0.0.0.0:3000");
});