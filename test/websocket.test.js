import WebSocket from "ws";
import { expect } from "chai";

const WS_URL = "ws://localhost:5000";

describe("WebSocket API Tests", function () {
  let socket;
  let roomId;

  beforeEach((done) => {
    socket = new WebSocket(WS_URL);
    socket.on("open", () => {
      console.log("✅ Connected to WebSocket Server");
      done();
    });
  });

  afterEach(() => {
    socket.close();
  });

  it("should create a room successfully", function (done) {
    socket.send(
      JSON.stringify({
        event: "createRoom",
        data: { hostName: "Alice" },
      })
    );

    socket.on("message", (message) => {
      const data = JSON.parse(message);
      expect(data).to.have.property("roomId");
      expect(data).to.have.property("hostName", "Alice");
      
      roomId = data.roomId; // Save roomId for the next tests
      console.log("🛠️ Room Created:", roomId);
      done();
    });
  });

  it("should join the created room", function (done) {
    if (!roomId) return done(new Error("Room ID is undefined!"));

    socket.send(
      JSON.stringify({
        event: "joinRoom",
        data: { roomId, playerName: "Bob" },
      })
    );

    socket.on("message", (message) => {
      const data = JSON.parse(message);
      expect(data).to.have.property("playerName", "Bob");
      expect(data).to.have.property("roomId", roomId);
      done();
    });
  });

  it("should send a drawing event", function (done) {
    if (!roomId) return done(new Error("Room ID is undefined!"));

    socket.send(
      JSON.stringify({
        event: "draw",
        data: { roomId, data: { x: 50, y: 50, color: "red" } },
      })
    );

    socket.on("message", (message) => {
      const data = JSON.parse(message);
      expect(data).to.have.property("data");
      expect(data.data).to.include({ x: 50, y: 50, color: "red" });
      done();
    });
  });

  it("should process a guess event", function (done) {
    if (!roomId) return done(new Error("Room ID is undefined!"));

    socket.send(
      JSON.stringify({
        event: "guess",
        data: { roomId, playerName: "Charlie", guess: "guitar" },
      })
    );

    socket.on("message", (message) => {
      const data = JSON.parse(message);
      expect(data).to.have.property("playerName", "Charlie");
      expect(data).to.have.property("message").that.includes("Charlie guessed");
      done();
    });
  });
});
