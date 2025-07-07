const socket = io();
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const startBtn = document.getElementById("startBtn");
const status = document.getElementById("status");

let localStream = null;
let peerConnection = null;
let remoteSocketId = null;

const config = {
  iceServers: [
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openai",
      credential: "openai"
    }
  ]
};

startBtn.addEventListener("click", async () => {
  if (!localStream) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideo.srcObject = localStream;
      await localVideo.play();
    } catch (e) {
      console.error("Erreur caméra/micro :", e);
      status.textContent = "Erreur : accès caméra refusé.";
      return;
    }
  }

  status.textContent = "Recherche d'un(e) partenaire...";
  socket.emit("ready");
});

function createPeerConnection() {
  peerConnection = new RTCPeerConnection(config);

  peerConnection.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit("ice", { candidate: e.candidate, to: remoteSocketId });
    }
  };

  peerConnection.oniceconnectionstatechange = () => {
    console.log("ICE connection state:", peerConnection.iceConnectionState);
  };

  peerConnection.onconnectionstatechange = () => {
    console.log("Peer connection state:", peerConnection.connectionState);
  };

  peerConnection.ontrack = (e) => {
    remoteVideo.srcObject = e.streams[0];
    remoteVideo.onloadedmetadata = () => {
      remoteVideo.play().catch(err => console.error("Erreur lecture vidéo distante :", err));
    };
    status.textContent = "Connecté avec un(e) partenaire.";
  };
}

socket.on("startCall", async (otherId) => {
  remoteSocketId = otherId;
  createPeerConnection();

  // Ajout des pistes si pas encore ajouté
  if (peerConnection.getSenders().length === 0 && localStream) {
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  }

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit("offer", { offer, to: remoteSocketId });
});

socket.on("offer", async ({ offer, from }) => {
  remoteSocketId = from;
  createPeerConnection();

  // Ajout des pistes si pas encore ajouté
  if (peerConnection.getSenders().length === 0 && localStream) {
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  }

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit("answer", { answer, to: remoteSocketId });
});

socket.on("answer", async ({ answer }) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("ice", async ({ candidate }) => {
  if (candidate && peerConnection) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error("Erreur ajout ICE :", err);
    }
  }
});
