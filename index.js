import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getJson } from 'serpapi';
import { connectDb } from './config/db.js';
import periodTrackingRoutes from './routes/periodTracking.route.js';
import postRoutes from './routes/post.route.js';
import spotifyRoutes from './routes/spotify.route.js';
import { clerkMiddleware, requireAuth } from '@clerk/express';
import cookieParser from 'cookie-parser';
import userRoutes from './routes/user.route.js';

dotenv.config();

// ✅ Only check the secret key on backend
if (!process.env.CLERK_SECRET_KEY) {
  console.error('❌ CLERK_SECRET_KEY is not set in environment variables');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ CORS setup
app.use(
  cors({
    origin: [
      'https://api.clerk.dev',
      process.env.FRONTEND_URL,
      'https://www.Herizon.live',
      'http://localhost:5173',
      'http://localhost:5174'
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Svix-Id',
      'Svix-Timestamp',
      'Svix-Signature',
    ],
  })
);

// ✅ Clerk middleware
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

app.use(cookieParser());
app.use(clerkMiddleware());

// ✅ Connect DB and start server
connectDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on: http://localhost:${PORT}`);
    });
  })
  .catch(error => {
    console.error('❌ MongoDB connection error:', error);
  });

// ✅ Health route
app.get('/health', (req, res) => {
  res.json({
    message: 'Server is running',
    clerkConfigured: !!process.env.CLERK_SECRET_KEY,
  });
});

// ✅ Routes
app.use('/api/auth', userRoutes);
app.use('/api/period', requireAuth(), periodTrackingRoutes);
app.use('/api/post', requireAuth(), postRoutes);
app.use('/api/spotify', spotifyRoutes);

// ✅ Product fetch
app.get('/api/products', async (req, res) => {
  const query = req.query.q || 'period products';
  try {
    const response = await getJson({
      engine: 'google_shopping',
      q: query,
      location: 'India',
      hl: 'en',
      gl: 'in',
      api_key: process.env.VITE_SERPAPI_KEY,
    });

    res.json({ products: response.shopping_results || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch' });
  }
});
