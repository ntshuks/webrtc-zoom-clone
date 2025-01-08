# Webrtc video calling app using Express and Socket.io
Project using Robert Bunch's webrtc app for guidance, but built from scratch with different featues

## Installation
Clone repo and run npm install to install the dependencies

ssl / tls key pair will be required and these reside in public/certs folder that you'll need to create and populate

use your local ip address in script.js and server.js 

## To Run
npm run startdev

point browsers at https://<your ip address>:5001

## Comments
The main aim of this project was to get a working video calling app with reasonable functionality and reasonable logic for buttons (i.e. disabling buttons when their use would be meaningless).

Major project brief was to use nothing other than  Express, Socket.io and built in WebRTC features.

Future use will be to run on hosted virtual server with external ip address(es) and real Letsencrypt certificates applicable to the domain used.

Tested on FireFox, Chrome and Brave (all runnung on Ubuntu 24.04 - on Intem MacBook Pro - and Android)

### Gothas in project
chrome://webrtc-internals helped follow the setting of local and remote offers, track collection and ice candidate flow. Biggest loss of time was silent failure of error in passing whole iceCandidateStateChange event to addIceCandidate, rather than event.candidate

Chose to have completely separate caller and caller logic rather than having dual use functions full of logic around "AmICaller" booleans.
