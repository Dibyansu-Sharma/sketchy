import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";
const socket = io(SOCKET_URL, { transports: ["websocket"] });

socket.on("connect", () => {
  console.log("✅ Connected to Socket.IO Server");
  
  // Test joining a room
  socket.emit("joinRoom", { roomId: "room_123abc", playerName: "Alice" });

  // Listen for playerJoined event
  socket.on("playerJoined", (data) => {
    console.log("👤 Player Joined:", data);
  });

  // Send a drawing event
  socket.emit("draw", { roomId: "room_123abc", data: { x: 50, y: 50, color: "red" } });

  // Send a guess event
  socket.emit("guess", { roomId: "room_123abc", playerName: "Bob", guess: "guitar" });

  // Listen for correct guess
  socket.on("correctGuess", (data) => {
    console.log("🎉 Correct Guess:", data);
  });
});

socket.on("disconnect", () => {
  console.log("❌ Disconnected from server");
});

socket.on("connect_error", (err) => {
  console.error("❌ Connection Error:", err.message);
});
