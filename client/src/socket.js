import { io } from "socket.io-client";

const socket = io("https://delivery-tracker-zkjh.onrender.com", {
  autoConnect: false,
});

export default socket;
