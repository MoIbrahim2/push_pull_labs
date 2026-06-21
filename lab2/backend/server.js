const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const groupsRoutes = require('./routes/groups');
const messagesRoutes = require('./routes/messages');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);

// Allow frontend connection
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Set io inside app for routes to access
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/messages', messagesRoutes);

const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-whatsapp-clone';

// In-memory connected users map: userId -> socketId
const onlineUsers = new Map();

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error('Authentication error'));
    }
    socket.user = decoded; // { userId, username, ... }
    next();
  });
});

io.on('connection', (socket) => {
  const userId = socket.user.userId;
  onlineUsers.set(userId, socket.id);
  
  // Notify others that this user is online
  io.emit('users-updated');

  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
    io.emit('users-updated');
  });

  socket.on('join-group', (groupId) => {
    socket.join(groupId);
  });

  socket.on('leave-group', (groupId) => {
    socket.leave(groupId);
  });

  // Private messaging
  socket.on('send-private-message', async (data) => {
    try {
      const { receiverId, content } = data;
      
      const message = new Message({
        sender: userId,
        receiver: receiverId,
        content
      });
      await message.save();
      await message.populate('sender', 'username email');
      await message.populate('receiver', 'username email');

      // Send to receiver
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('receive-private-message', message);
      }
      
      // Also send back to sender so they can display it immediately if needed
      socket.emit('receive-private-message', message);
    } catch (err) {
      console.error('Error sending private message:', err);
    }
  });

  // Group messaging
  socket.on('send-group-message', async (data) => {
    try {
      const { groupId, content } = data;

      const message = new Message({
        sender: userId,
        group: groupId,
        content
      });
      await message.save();
      await message.populate('sender', 'username email');

      // Broadcast to all users in group EXCEPT sender
      socket.broadcast.to(groupId).emit('receive-group-message', message);
      
      // Send back to sender to display
      socket.emit('receive-group-message', message);
    } catch (err) {
      console.error('Error sending group message:', err);
    }
  });
});

// MongoDB Connection
mongoose.connect('mongodb://127.0.0.1:27017/whatsapp_clone')
  .then(() => {
    console.log('Connected to MongoDB');
    server.listen(3000, () => {
      console.log('Server is running on port 3000');
    });
  })
  .catch(err => console.error('MongoDB connection error:', err));
