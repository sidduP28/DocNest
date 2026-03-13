function socketHandlers(io) {
  io.on('connection', (socket) => {
    // Patient joins their personal room
    socket.on('joinRoom', ({ userId }) => {
      if (userId) socket.join(`user:${userId}`);
    });

    // Hospital admin joins hospital room
    socket.on('joinHospitalRoom', ({ hospitalId }) => {
      if (hospitalId) socket.join(`hospital:${hospitalId}`);
    });

    socket.on('disconnect', () => {
      // cleanup handled automatically by socket.io
    });
  });
}

module.exports = socketHandlers;
