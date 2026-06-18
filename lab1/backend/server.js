/**
 * Polling Demonstration Backend Server
 * 
 * --- UNDERSTANDING POLLING ---
 * Polling is a mechanism where a client periodically requests data from a server.
 * It is commonly used when real-time updates are needed, but modern alternatives like
 * WebSockets or Server-Sent Events (SSE) are not available or are overkill.
 * 
 * 1. SHORT POLLING:
 *    - The client sends a request to the server at fixed intervals (e.g., every 3 seconds).
 *    - The server immediately responds with whatever data it currently has, regardless of
 *      whether the data has changed.
 *    - Advantages: Extremely simple to implement on both client and server; stateless.
 *    - Disadvantages: Highly inefficient. Creates heavy server load and consumes high bandwidth 
 *      because the client makes frequent, redundant requests even when no new data exists.
 * 
 * 2. LONG POLLING:
 *    - The client sends a request to the server.
 *    - The server does NOT immediately respond. Instead, it "holds" the connection open (pending)
 *      until new data becomes available or a timeout occurs.
 *    - When new data is available (e.g., a new post is created), the server responds to all
 *      open connections with the updated data.
 *    - Upon receiving the response, the client immediately initiates a new long-polling request,
 *      repeating the cycle.
 *    - Advantages: Real-time updates with significantly fewer network requests compared to short polling.
 *      Saves server resources and network bandwidth when updates are infrequent.
 *    - Disadvantages: More complex state management on the server (holding open request objects);
 *      consumes server connection slots (socket exhaustion issues if not managed).
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Enable CORS and JSON parsing
app.use(cors({
  origin: 'http://localhost:4200', // Allow requests from our Angular client
  methods: ['GET', 'POST', 'DELETE']
}));
app.use(express.json());

// --- MONGODB CONNECTION ---
const MONGO_URI = 'mongodb://127.0.0.1:27017/polling_comparison_demo';
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB successfully.'))
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });

// --- POST MODEL ---
const PostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Post = mongoose.model('Post', PostSchema);

// --- PENDING REQUESTS STORAGE FOR LONG POLLING ---
/**
 * In-memory storage for open Client Response objects.
 * When a client calls GET /long/posts, their 'res' (Express response) object is saved here.
 * The key is a unique ID generated from the timestamp and a random integer.
 * 
 * Why are requests stored on the server?
 * In HTTP, a server cannot initiate contact with a client. The client must make a request first.
 * To send real-time updates using standard HTTP, the server holds onto this request reference,
 * deferring the response until an update occurs. Once data is ready, the server uses the stored
 * response object to send the payload back, thereby closing that HTTP cycle.
 */
const pendingRequests = {};

// Clean up pending requests on server shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server. Resolving all pending long poll requests...');
  for (const requestId in pendingRequests) {
    if (pendingRequests.hasOwnProperty(requestId)) {
      pendingRequests[requestId].status(503).json({ error: 'Server shutting down' });
      delete pendingRequests[requestId];
    }
  }
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
});


// ==========================================
// SHORT POLLING API ENDPOINTS
// ==========================================

/**
 * GET /posts
 * Returns all posts immediately. Used by Short Polling client.
 */
app.get('/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /post
 * Creates a post immediately and returns the created post.
 * Does not notify long polling clients.
 */
app.post('/post', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const newPost = new Post({ title });
    const savedPost = await newPost.save();
    res.status(201).json(savedPost);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// LONG POLLING API ENDPOINTS
// ==========================================

/**
 * GET /long/posts
 * Registers a client's response channel and leaves it open.
 * The request is only resolved when a new post is created via POST /long/post
 * or when the database is cleared.
 */
app.get('/long/posts', (req, res) => {
  // Generate a unique request ID
  const requestId = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  
  console.log(`[Long Polling] New client registered. ID: ${requestId}`);
  
  // Save the express response object in memory
  pendingRequests[requestId] = res;

  // Set response headers to maintain an open, non-cached connection
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Connection', 'keep-alive');

  // Handle client disconnection (e.g. browser refresh, navigating away)
  // Essential for preventing memory leaks and writing to closed streams.
  req.on('close', () => {
    if (pendingRequests[requestId]) {
      console.log(`[Long Polling] Client disconnected. Cleaning up ID: ${requestId}`);
      delete pendingRequests[requestId];
    }
  });
});

/**
 * POST /long/post
 * Creates a post, saves to database, retrieves all posts, and immediately
 * resolves all pending long poll requests with the complete updated posts list.
 */
app.post('/long/post', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // 1. Save new post to MongoDB
    const newPost = new Post({ title });
    const savedPost = await newPost.save();
    console.log(`[Long Polling] New post created: "${title}". Resolving pending requests...`);

    // 2. Retrieve all posts from the database (sorted newest first)
    const allPosts = await Post.find().sort({ createdAt: -1 });

    // 3. Iterate through and respond to all pending requests
    const clientIds = Object.keys(pendingRequests);
    console.log(`[Long Polling] Resolving ${clientIds.length} waiting client connection(s).`);

    clientIds.forEach(requestId => {
      try {
        const clientRes = pendingRequests[requestId];
        // Send complete list of posts to the client
        clientRes.json(allPosts);
      } catch (err) {
        console.error(`Error responding to request ${requestId}:`, err.message);
      }
      // 5. Remove the resolved request
      delete pendingRequests[requestId];
    });

    // 4. Respond to the client that initiated the POST request
    res.status(201).json(savedPost);
  } catch (err) {
    console.error('Error in POST /long/post:', err);
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// UTILITY / SYSTEM ENDPOINTS
// ==========================================

/**
 * DELETE /posts
 * Clears all posts from MongoDB and notifies any waiting long-poll clients of the empty list.
 */
app.delete('/posts', async (req, res) => {
  try {
    await Post.deleteMany({});
    console.log('[System] All posts cleared. Notifying long-poll clients...');
    
    // Notify long-polling clients of the empty database
    const clientIds = Object.keys(pendingRequests);
    clientIds.forEach(requestId => {
      try {
        pendingRequests[requestId].json([]);
      } catch (err) {
        console.error(`Error resolving clear action for request ${requestId}:`, err.message);
      }
      delete pendingRequests[requestId];
    });

    res.json({ message: 'All posts cleared successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`=============================================================`);
  console.log(` Polling Comparison Backend Server is running on port ${PORT}`);
  console.log(` - MongoDB URI: ${MONGO_URI}`);
  console.log(` - Short Polling Endpoints: GET /posts, POST /post`);
  console.log(` - Long Polling Endpoints: GET /long/posts, POST /long/post`);
  console.log(` - Utility: DELETE /posts (Clears database and updates clients)`);
  console.log(`=============================================================`);
});
