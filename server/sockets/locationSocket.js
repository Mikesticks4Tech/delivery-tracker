module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.id} (${socket.user.role})`);

    // Rider's phone sends this every 3-5 seconds
    socket.on("location:update", ({ orderId, lat, lng }) => {
      // Broadcast to everyone watching this specific order
      io.to(orderId).emit("location:broadcast", {
        lat,
        lng,
        updatedAt: new Date(),
      });
    });

    // Customer joins a "room" for the specific order they're tracking
    socket.on("order:join", (orderId) => {
      socket.join(orderId);
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user.id}`);
    });
  });
};
