const socket = io.connect('https://<your ip address>');

const join = document.getElementById('username-form');
const usernameInput = document.getElementById('username');
const alluserlist = document.getElementById("alluserlist");
const callform = document.getElementById("call-form");
const answerform = document.getElementById("answer-form");
const hangupform = document.getElementById("hangup-form");
const hangupbutton = document.getElementById("hangup-button");
const answerbutton = document.getElementById("answer-button");
const callbutton = document.getElementById("call-button");
const calleeInput = document.getElementById("callee");
const localvideoEl = document.querySelector("#localvideo");
const remotevideoEl = document.querySelector("#remotevideo"); 
let users;

const constraints = {
   video: true,
   audio:true
};
let caller_id; // id of person initialing call
let callee_id; // id of person receiving call
let callerice_count = 0;
let localstream;
let remotestream;
let peerconnection;
let callericecandidates=[];
let calleeicecandidates=[];

const configuration = {'iceServers': [
   {'urls': [
      'stun:stun.l.google.com:19302',
     /* 'stun:stun1.l.google.com:19302', */
   ]}]};

join.addEventListener('submit', (e) =>{
   e.preventDefault();
   username = usernameInput.value;
   socket.emit('join', (username));
});

socket.on('welcome', ({userlist,id}) =>{
   console.log('Welcome to the app');
});

callform.addEventListener('submit', (e) =>{
   e.preventDefault();
  const result = finduser2(calleeInput.value);
  if (!result) {
   alert('No such user'); 
  } else {
   callee_id = result.id;
   const result2 = finduser2(usernameInput.value);
   caller_id = result2.id;
   if (callee_id == caller_id) {
      alert('You cannot call yourself');
   } else {
   makeCall(caller_id,callee_id);
   callbutton.disabled = true;
   }
  }
});

async function makeCall(caller_id,callee_id) {   
   await getlocalmedia(); 
   peerconnection = new RTCPeerConnection(configuration);
   remotestream = new MediaStream();
   remotevideoEl.srcObject = remotestream;
   // Add local tracks to lcaostream
   localstream.getTracks().forEach(track =>{
     peerconnection.addTrack(track,localstream);
   });
   peerconnection.addEventListener('icecandidate', (event) => {
      if (event.candidate) {
        // const iceCandidateObj = {iceCandidate:event.candidate}
         const iceCandidateObj = (event.candidate);
         console.log('*** iceCandidateObj ***');
         console.log(iceCandidateObj);
         socket.emit('caller-ice-candidate', (iceCandidateObj));
         }
      });
   peerconnection.addEventListener('track',e=>{
   console.log('Got a track from callee');
   console.log(e);
   e.streams[0].getTracks().forEach(track=>{
       remotestream.addTrack(track,remotestream);
   });
 });
   const offer = await peerconnection.createOffer();
   await peerconnection.setLocalDescription(offer);
   socket.emit('newoffer',({offer, callee_id, caller_id}));
}

socket.on('getoffer', ({offer, callee_id, caller_id}) =>{
   // We have the offer but nothing should happen until callee answers
   answerbutton.disabled = false;
   hangupbutton.disabled = false;
   answerbutton.style.backgroundColor = "#90ee90";
   answerform.addEventListener('submit', async (e) => {
      e.preventDefault();
     answercall(offer,caller_id,callee_id);
     answerbutton.disabled = true;
     callbutton.disabled = true;
   });
});

async function answercall(offer, caller_id,callee_id) {
   await getlocalmedia();
   //await callee_createpeerconnection(offer);
   peerconnection = new RTCPeerConnection(configuration);
   remotestream = new MediaStream();
   remotevideoEl.srcObject = remotestream;
   // Get local tracks
   localstream.getTracks().forEach(track =>{
   peerconnection.addTrack(track,localstream);
   });
   //Listen out for tracks from caller
   peerconnection.addEventListener('track',e=>{
      console.log('Got a track from callee');
      console.log(e);
      e.streams[0].getTracks().forEach(track=>{
          remotestream.addTrack(track,remotestream);
      });
    });
  await peerconnection.setRemoteDescription(offer);
 
   peerconnection.addEventListener('icecandidate', (event) => {
         const iceCandidateObj = (event.candidate);
         console.log('*** iceCandidateObj ***');
         console.log(iceCandidateObj);
         socket.emit('callee-ice-candidate', (iceCandidateObj));
   });
   const answer = await peerconnection.createAnswer();
    await peerconnection.setLocalDescription(answer);
    console.log('Answer below');
    console.log(answer);

   // Get caller icecandidates DO this with Rob's crafty emitWithAck idea
   callericecandidates = await socket.emitWithAck('newanswer', answer);
   callericecandidates.forEach((element) =>{
   peerconnection.addIceCandidate(element)
     .then (() => console.log('>>> added caller ice candidates to callee <<<'))
     .then (() => console.log(element))
     .catch((error) => console.log(error))
    }); 
   }

socket.on('getanswer', (answer) =>{
addanswer(answer);
});

async function addanswer(answer) {
   await peerconnection.setRemoteDescription(answer);
   hangupbutton.disabled = false;
}

socket.on('received-callee-IceCandidateFromServer',(iceCandidateObj) =>{
   console.log('++++ added callee ice candidate to caller socket ++++');
   peerconnection.addIceCandidate(iceCandidateObj)
   .then (() => console.log('Callee Ice candidate added - below'))
   .catch ((error) => {
      console.log(`Error adding ice candidte: ${error.name}`);
   })
});

async function getlocalmedia(e) {
   try {
   const stream = await navigator.mediaDevices.getUserMedia(constraints);
   localvideoEl.srcObject = stream;
   localstream = stream;
} catch (e) {
  console.log(e); }
}

hangupform.addEventListener('submit', (e) => {
   // Doesn't matter who triggered event, send message to server to io to call both clients
   e.preventDefault();
   socket.emit('hangup')
});

socket.on('closeconnection', () =>{
   peerconnection.close();
   location.reload();
   alert("Bye...");
});

socket.on("joinerror", (joined) => {
   alert('You have already joined - refresh page to start again');
});

socket.on('updateuserlist', (userlist) => {
   users = userlist;
   alluserlist.innerText='';
   let item = document.createElement('li');
   item.textContent = 'Users: ';
   alluserlist.appendChild(item);
   for (i=0 ; i < users.length ; i++) {
       item = document.createElement('li');
        item.textContent = users[i].username;
        alluserlist.appendChild(item);
   }
});

function finduser2(username) {
   // search by username
   const searchObj = users.find((user) => user.username === username);
   return (searchObj);
}
