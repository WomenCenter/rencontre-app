const socket = io();
let peerConnection;
const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localVideo.srcObject = stream;

    socket.on('match', ({ id: partnerId, initiator }) => {
      console.log("Match trouvé avec", partnerId, "— initiator:", initiator);
      startCall(partnerId, initiator, stream);
    });

    socket.on('signal', async ({ from, signal }) => {
      console.log("Signal reçu :", signal);

      if (signal.type === 'offer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('signal', { to: from, signal: peerConnection.localDescription });
      } else if (signal.type === 'answer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
      } else if (signal.candidate) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(signal));
        } catch (e) {
          console.error('Erreur ICE candidate:', e);
        }
      }
    });
  })
  .catch(err => {
    alert("Erreur accès caméra/micro : " + err.message);
    console.error("getUserMedia error:", err);
  });

function startCall(partnerId, isInitiator, stream) {
  peerConnection = new RTCPeerConnection(config);

  stream.getTracks().forEach(track => {
    peerConnection.addTrack(track, stream);
  });

  peerConnection.ontrack = (event) => {
    console.log("Flux reçu de l'autre utilisateur.");
    remoteVideo.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('signal', { to: partnerId, signal: event.candidate });
    }
  };

  if (isInitiator) {
    peerConnection.createOffer()
      .then(offer => peerConnection.setLocalDescription(offer))
      .then(() => {
        socket.emit('signal', { to: partnerId, signal: peerConnection.localDescription });
      })
      .catch(console.error);
  }
}
