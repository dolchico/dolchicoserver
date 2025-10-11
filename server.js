// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import fs from 'fs';
import yaml from 'yaml';
import morgan from 'morgan';
import session from 'express-session';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import logger from './logger.js';
import connectCloudinary from './config/cloudinary.js';
import helmet from './middleware/helmet.js';
import { apiLimiter } from './middleware/rateLimit.js';
import userRouter from './routes/userRoute.js';
import productRouter from './routes/productRoute.js';
import cartRouter from './routes/cartRoute.js';
import orderRouter from './routes/orderRoute.js';
import adminRouter from './routes/adminRoute.js';
import OAuthRouter from './routes/oauth.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import addressRoutes from './routes/addressRoute.js';
import paymentRouter from './routes/paymentRoutes.js';
import categoryRoutes from './routes/category.routes.js';
import couponRoutes from './routes/couponRoutes.js';
import debugRoute from './routes/debugRoute.js';
import offerTypeRoutes from './routes/offerType.routes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import imageRoutes from './routes/image.routes.js';
import ticketRoutes from './routes/ticketRoutes.js';

import './config/passport-setup.js';

dotenv.config();
const app = express();
const port = process.env.PORT || 4000;

// Swagger setup
const coreSpecRaw = fs.readFileSync('./swagger.yaml', 'utf8');
const coreSpec = yaml.parse(coreSpecRaw);
const authSpecPath = path.resolve('docs', 'swagger-auth.yaml');
const authSpec = yaml.parse(fs.readFileSync(authSpecPath, 'utf8'));

app.use('/api-docs-auth', swaggerUi.serve, swaggerUi.setup(authSpec));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(coreSpec));

// External service connections
connectCloudinary();

// Middleware
app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:4000',
      'https://dolchico.com',
      'https://www.dolchico.com',
      'https://valyris-i.onrender.com',
      'https://dolchicoserver-development.up.railway.app',
      'https://dolchi-titan.vercel.app',
      process.env.FRONTEND_URL,
      process.env.CLIENT_URL,
    ].filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    credentials: true,
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-fallback-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    },
    name: 'oauth.session',
  })
);

app.use(passport.initialize());
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Routes
app.use('/api/auth', OAuthRouter);
app.use('/api/user', userRouter);
app.use('/api/admin', adminRouter);
app.use('/api/product', productRouter);
app.use('/api/order', orderRouter);
app.use('/api/cart', cartRouter);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/payment', paymentRouter);
app.use('/api', categoryRoutes);
app.use('/api', couponRoutes);
app.use('/api', offerTypeRoutes);
app.use('/api/debug', debugRoute);
app.use('/api/reviews', reviewRoutes);

app.use('/api/images', imageRoutes);
app.use('/api', ticketRoutes); // Combined ticket routes

// Mount userRouter at root to enable /users endpoint
app.use(userRouter);

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'Uploads')));

// Health check
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Dolchico E-commerce API Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      docs: '/api-docs',
      authDocs: '/api-docs-auth',
    },
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/auth/health', (req, res) => {
  res.json({
    success: true,
    message: 'OAuth service is running',
    user: req.user ? { id: req.user.id, email: req.user.email } : null,
    session: req.session?.passport ? 'Active' : 'Inactive',
  });
});

// Catch-all for unmatched routes
app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ success: false, message: `Route not found: ${req.url}` });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('Global error handler:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`🚀 Server started: http://localhost:${port}`);
    console.log(`📖 API Docs: http://localhost:${port}/api-docs`);
    console.log(`🔐 Auth Docs: http://localhost:${port}/api-docs-auth`);
    console.log(`🌐 OAuth Health: http://localhost:${port}/api/auth/health`);
    logger.info(`🚀 Server started on PORT: ${port}`);
  });
}

export default app;