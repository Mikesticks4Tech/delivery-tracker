import { io } from "socket.io-client";

// Creates the connection but doesn't connect immediately —
// we connect manually once we have a token (after login)
const socket = io("http://localhost:5000", {
  autoConnect: false,
});

export default socket;
