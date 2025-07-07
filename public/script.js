const socket = io();
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const startBtn = document.getElementById("startBtn");
const status = document.getElementById("status");

let localStream;
let peerConnection;
let remoteSocketId;

const config = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:relay.metered.ca:80",
      username: "openai",
      credential: "openai"
    }
  ]
};

startBtn.onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;
  status.textContent = "En attente d'une connexion...";
};

socket.on("startCall", async (otherId) => {
  remoteSocketId = otherId;
  peerConnection = new RTCPeerConnection(config);

  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit("ice", { candidate: e.candidate, to: remoteSocketId });
    }
  };

  peerConnection.ontrack = (e) => {
    remoteVideo.srcObject = e.streams[0];
    status.textContent = "Connecté !";
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit("offer", { offer, to: remoteSocketId });
});

socket.on("offer", async ({ offer, from }) => {
  remoteSocketId = from;
  peerConnection = new RTCPeerConnection(config);

  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit("ice", { candidate: e.candidate, to: remoteSocketId });
    }
  };

  peerConnection.ontrack = (e) => {
    remoteVideo.srcObject = e.streams[0];
    status.textContent = "Connecté !";
  };

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit("answer", { answer, to: remoteSocketId });
});

socket.on("answer", async ({ answer }) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("ice", async ({ candidate }) => {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (e) {
    console.error("Erreur ICE :", e);
  }
});
