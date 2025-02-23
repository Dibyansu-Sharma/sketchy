import express from "express";
import { Server } from "socket.io";
import { createClient } from 'redis';
import {createServer} from "http";
import dotenv from "dotenv";
import cors from "cors";
import { randomUUID } from "crypto";
dotenv.config();

const app = express();
const server = createServer(app);

const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type"],
      credentials: true
    },
    transports: ["websocket", "polling"], // Ensure WebSocket is used
  });
  

io.on("connection", (socket) => {
    console.log(`🔌 Player connected: ${socket.id}`);
  
    // Join a room
    socket.on("joinRoom", ({ roomId, playerName }) => {
      socket.join(roomId);
      console.log(`👤 ${playerName} joined room: ${roomId}`);
  
      // Notify others in the room
      socket.to(roomId).emit("playerJoined", { playerName });
    });
  
    // Handle drawing events
    socket.on("draw", ({ roomId, data }) => {
      socket.to(roomId).emit("draw", data); // Send to all except sender
    });
  
    // Handle guesses
    socket.on("guess", async ({ roomId, playerName, guess }) => {
      const roomData = await client.hGetAll(roomId);
      if (!roomData || roomData.gameStatus !== "in-progress") return;
  
      if (guess.toLowerCase() === roomData.word.toLowerCase()) {
        io.to(roomId).emit("correctGuess", { playerName });
      }
    });
  // Handle disconnects
  socket.on("disconnect", () => {
    console.log(`❌ Player disconnected: ${socket.id}`);
  });
});  

// Redis connection

const client = createClient();
client.on('error', err => console.log('Redis Client Error', err));
await client.connect();

app.use(cors({
    origin: "*",  // Allow all origins (for testing)
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
  }));
  
app.use(express.json());


app.get('/',  (req, res) => {
    res.send("Sketchy game server is running")
})

app.post('/api/create-room', async (req, res) => {
    try{
        const roomId = `room_${randomUUID().slice(0,6)}`;
        const gameData = {
            roomId,
            players: JSON.stringify([]),
            currentDrawer: "",
            word: "",
            gameStatus: "waiting"
        }

        const redStore = await client.hSet(roomId, gameData);
        return res.json({ success: true, roomId });
    }catch(error){
        res.status(500).json({"sucess" : false, "message": "Server Error"});
    }
})

app.post('/api/join-room', async (req, res) => {
    try{
        const {roomId, playerName} = req.body;
        if(!roomId || !playerName){
            res.status(400).json({"success": false, "message": "Missing roomId or playerName"});
        }
        const isExist = await client.exists(roomId);
        if(!isExist){ 
            res.status(404).json({"success": false, "message": `Room with ${roomId} does not exist`});
        }
        const redStore = await client.hGetAll(roomId);
        const players = redStore.players ? JSON.parse(redStore.players) : [];

        if (players.includes(playerName)) {
            return res.json({ success: true, message: "Player already in room", roomId });
        }
        players.push(playerName);
        await client.hSet(roomId, "players", JSON.stringify(players));
        
        if (players.length === 1) {
            await client.hSet(roomId, "currentDrawer", playerName);
        }
       return res.json({ success: true,  message: "Joined room", roomId, players  });
    }catch(error){
        res.status(500).json({"sucess" : false, "message": "Server Error"});
    }
})

app.post("/api/start-game", async (req, res) => {
    try {
      const { roomId } = req.body;
  
      // Validate input
      if (!roomId) {
        return res.status(400).json({ success: false, message: "Missing roomId" });
      }
  
      // Check if room exists
      const roomExists = await client.exists(roomId);
      if (!roomExists) {
        return res.status(404).json({ success: false, message: "Room not found" });
      }
  
      // Get room data
      const roomData = await client.hGetAll(roomId);
      let players = JSON.parse(roomData.players || "[]");
  
      // Ensure at least two players
      if (players.length < 2) {
        return res.status(400).json({ success: false, message: "At least 2 players required to start" });
      }
  
      // Pick a random word
      const wordList = ["apple", "banana", "guitar", "elephant", "rocket"]; // Expand later
      const word = wordList[Math.floor(Math.random() * wordList.length)];
  
      // Set the first player as the drawer
      const currentDrawer = players[0];
  
      // Update game state in Redis
      await client.hSet(roomId, {
        word,
        currentDrawer,
        gameStatus: "in-progress"
      });
  
      return res.json({ success: true, message: "Game started", word, currentDrawer });
    } catch (err) {
      console.error("❌ Error starting game:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  });
  

const PORT = process.env.PORT || 5000;
server.listen(PORT, ()=> console.log(`🚀 Server running on port ${PORT}`));