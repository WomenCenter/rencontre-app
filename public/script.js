const socket = io(); // ne jamais mettre d'URL ici

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
      console.error("Erreur d’accès à la caméra/micro :", e);
      status.textContent = "Erreur d’accès à la caméra/micro.";
      return;
    }
  }

  status.textContent = "Recherche d’un(e) partenaire...";
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
    console.log("ICE state:", peerConnection.iceConnectionState);
  };

  peerConnection.onconnectionstatechange = () => {
    console.log("Connexion WebRTC :", peerConnection.connectionState);
  };

  peerConnection.ontrack = (e) => {
    console.log("Track reçue");
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

  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit("offer", { offer, to: remoteSocketId });
});

socket.on("offer", async ({ offer, from }) => {
  remoteSocketId = from;
  createPeerConnection();

  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

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
      console.error("Erreur ICE :", err);
    }
  }
});
