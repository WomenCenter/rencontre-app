const socket = io();

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const startBtn = document.getElementById("startBtn");

let localStream = null;
let peerConnection = null;
let remoteSocketId = null;

const config = {
  iceServers: [
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

startBtn.addEventListener("click", async () => {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
    socket.emit("ready");
  } catch (e) {
    console.error("Erreur accès caméra/micro", e);
  }
});

function createPeerConnection() {
  peerConnection = new RTCPeerConnection(config);

  peerConnection.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit("ice", { candidate: e.candidate, to: remoteSocketId });
    }
  };

  peerConnection.ontrack = (e) => {
    remoteVideo.srcObject = e.streams[0];
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
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (e) {
    console.error("Erreur ICE", e);
  }
});
