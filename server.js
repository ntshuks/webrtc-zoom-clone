/*
Create video chat app usng socket.io and webrtc - no front end framework
Heavily influenced by Robert Bunch's Webrtc-starter video & app
*/
const fs = require('fs');
const key = fs.readFileSync('./certs/server-cert-key.pem');
const cert = fs.readFileSync('./certs/server-cert.pem')
const express = require('express');
const app = express();
const server = require('node:https').createServer({key,cert},app);
require ('dotenv').config();
const io = require('socket.io')(server, {
    cors: {
        origin: [
            'https://<your ip address>'
        ],
        methods: ["Get","POST"]
    }
});
const PORT = process.env.port || 5001;

// count to see how many candidates
let c_count = 0;
let server_caller_ice = [];
let server_caller_id;
let server_callee_id;

//Declare UserList - array of user objects
let userlist = [];

// Set Static Folder - public
app.use(express.static('public'));

//Routes - only one
app.get('/', (req,res) => {
    res.render('index.html');
});

app.post('/', (req,res) => {
    res.render('index.html');
});

// Socket io logic
io.on('connection', (socket) => {
    console.log(`Socket id: ${socket.id}`);
     const id = socket.id;
     // When user has submitted username
     socket.on('join', (username) => {

     // Check to see if user already joined - reject if so
     const result = findUser(id);
     if(result) {
    const joined = result.id;
    socket.emit("joinerror", joined);
    } else {
    const newuser = {username, id}
    userlist.push(newuser);
    console.log(userlist);
    // send back userlist to front end
    socket.emit('welcome', ({userlist,id}));
    // send room user list to whole room
    io.emit("updateuserlist", userlist); }
     });

    socket.on('newoffer', ({offer, caller_id, callee_id}) => {
        server_caller_id = caller_id; // to save passing these back and forth
        server_callee_id = callee_id;
        console.log(`caller ${server_caller_id}  callee ${server_callee_id}`);
        console.log(offer);
        socket.to(server_callee_id).emit('getoffer', ({offer,server_caller_id,server_callee_id}));
     });

     socket.on('caller-ice-candidate', (iceCandidateObj) => {
        server_caller_ice[c_count] = iceCandidateObj;
        c_count++;
        console.log('caller ice candidates: count ' + c_count);
        console.log(server_caller_ice);
      });

     socket.on('callee-ice-candidate', (iceCandidateObj) => {
       console.log('Sending callee ice candidates to caller: ' + server_caller_id);
       console.log(iceCandidateObj);
       socket.to(server_caller_id).emit('received-callee-IceCandidateFromServer',(iceCandidateObj));
     });

    socket.on('newanswer', (answer, Ackcb) => {
        Ackcb(server_caller_ice); //this is sent back to callee
    // Now send answer to caller
    socket.to(server_caller_id).emit('getanswer', (answer));
    answerreceived = true;
    console.log(`inside new answer. answerrecieved: ${answerreceived}`);
    });

    socket.on('hangup', () => {
       io.emit('closeconnection');
    });

     socket.on('disconnect', () =>{
     // find user an dremove from userlist
     console.log(`socket that disconnected: ${socket.id}`);
     const index = findUserIndex(socket.id);
     const user = findUser(socket.id);
     console.log("print out index of user to be removed");
     console.log(index);
     // remove user
     if (index !== -1) {
        console.log('INDEX to be spliced');
        console.log(index);
        userlist.splice(index,1);
        console.log("User List after splice");
        console.log(userlist);
        io.emit("updateuserlist", userlist);
    }
    console.log(`User disconnected, socket.id: ${socket.id}`);

     });
});
 
function findUserIndex(id) {
    // search to find index of element in array
    const index = userlist.findIndex((user) => user.id === id);
    return(index);
}

function findUser(id) {
    // search by id
    const searchObj = userlist.find((user) => user.id === id);
    return (searchObj);
}

//Listen on selected port
server.listen(PORT, () => console.log(`Listening on port: ${PORT}`));