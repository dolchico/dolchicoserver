/**
 * =============================
 * External Packages
 * =============================
 */
import express       from 'express';
import cors          from 'cors';
import dotenv        from 'dotenv';
import swaggerUi     from 'swagger-ui-express';
import path          from 'path';
import fs            from 'fs';
import yaml          from 'yaml';           // <- one parser, one name
import morgan        from 'morgan';
import session       from 'express-session';
import passport      from 'passport';
import cookieParser  from 'cookie-parser';  // <- Added for OAuth cookie handling
import logger              from './logger.js';
import connectCloudinary   from './config/cloudinary.js';
import helmet              from './middleware/helmet.js';
import { apiLimiter, authLimiter}      from './middleware/rateLimit.js'; // Fixed duplicate import
import { flexibleAuth, handleAuthError }      from './middleware/authMiddleware.js';

import userRouter          from './routes/userRoute.js';
import productRouter       from './routes/productRoute.js';
import cartRouter          from './routes/cartRoute.js';
import orderRouter         from './routes/orderRoute.js';
import adminRouter         from './routes/adminRoute.js';
import OAuthRouter         from './routes/oauth.js';
import wishlistRoutes      from './routes/wishlistRoutes.js';
import addressRoutes       from './routes/addressRoute.js';
import paymentRouter from './routes/paymentRoutes.js';
import authUser from './middleware/auth.js';
// import paymentRoutes from './routes/paymentRoutes.js';

// Environment validation
import { validateRequiredEnvVars } from './config/validateEnv.js';

/**
 * =============================
 * Config & App Init
 * =============================
 */
dotenv.config();

// Validate required environment variables
validateRequiredEnvVars();

const app  = express();
const port = process.env.PORT || 4000;

/**
 * =============================
 * Swagger – Specs & Routes  
 * =============================
 */
const coreSpecRaw  = fs.readFileSync('./swagger.yaml', 'utf8');
const coreSpec     = yaml.parse(coreSpecRaw);

const authSpecPath = path.resolve('docs', 'swagger-auth.yaml'); // absolute
const authSpec = yaml.parse(fs.readFileSync(authSpecPath, 'utf8'));

app.use('/api-docs-auth', swaggerUi.serve, swaggerUi.setup(authSpec));
app.use('/api-docs',      swaggerUi.serve, swaggerUi.setup(coreSpec));

/**
 * =============================
 * External Service Connections
 * =============================
 */
connectCloudinary();

/**
 * =============================
 * Middleware
 * =============================
 */
// Trust proxy for OAuth callbacks (important for production)
app.set('trust proxy', 1);

// Basic middleware
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // <- Added for form handling
app.use(cookieParser()); // <- Added for OAuth cookie support

// Updated CORS for OAuth support
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:4000',
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL
  ].filter(Boolean), // Remove undefined values
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  credentials: true // <- Changed to true for OAuth cookies
}));

// Enhanced Sessions & OAuth configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  store: new PrismaSessionStore(prisma, {
    checkPeriod: 2 * 60 * 1000, // 2 minutes
    dbRecordIdIsSessionId: true,
    dbRecordIdFunction: undefined,
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  },
  name: 'oauth.session' // Custom session name
}));

app.use(passport.initialize());
app.use(passport.session());

// Rate limiting (keeping your existing setup)
// app.use('/api', apiLimiter);

// Logging
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) }
}));

// Custom request logging for OAuth
app.use('/api/auth', (req, res, next) => {
  logger.info(`OAuth Request: ${req.method} ${req.path} from ${req.ip}`);
  next();
});

/**
 * =============================
 * Routes (Your existing routes unchanged)
 * =============================
 */
// Legal routes (privacy policy, terms of service)
app.use('/', legalRoutes);

// Authentication routes (includes OAuth)
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/user',    userRouter);
app.use('/api/admin',   adminRouter);
app.use('/api/product', productRouter);
app.use('/api/order',   ensureAuth, orderRouter);
app.use('/api/cart',    ensureAuth, cartRouter);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/payment', authUser, paymentRouter);
// app.use('/api/payment', paymentRoutes);

// Simple error-test route (unchanged)
app.get('/error', (req, res) => {
  logger.error('This is an error log!');
  res.status(500).send('Error logged');
});

// Root (unchanged)
app.get('/', (req, res) => {
  res.json({
    message: 'E-commerce API Working',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      docs: '/api-docs',
      authDocs: '/api-docs-auth',
      health: '/health',
      legal: {
        privacy: '/privacy-policy',
        terms: '/terms-of-service'
      }
    }
  });
  console.log('DATABASE_URL at runtime:', process.env.DATABASE_URL ? 'Connected' : 'Not configured');
});

// OAuth health check endpoint (new addition for testing)
app.get('/api/auth/health', (req, res) => {
  res.json({
    success: true,
    message: 'OAuth service is running',
    user: req.user ? { id: req.user.id, email: req.user.email } : null,
    session: req.session?.passport ? 'Active' : 'Inactive'
  });
});

/**
 * =============================
 * Error Handling Middleware (OAuth-enhanced)
 * =============================
 */
app.use((err, req, res, next) => {
  // Log OAuth-specific errors
  if (err.message && err.message.includes('OAuth')) {
    logger.error('OAuth Error:', err);
  }
  
  logger.error('Global error handler:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

/**
 * =============================
 * Server Start (unchanged)
 * =============================
 */
// Auth error handler
app.use(handleAuthError);

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(err.statusCode || 500).json({
    success: false,
    message: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack }),
    timestamp: new Date().toISOString()
  });
});

// Handle 404
app.use('*', (req, res) => {
  logger.warn(`404 Route not found: ${req.method} ${req.originalUrl} from ${req.ip}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableEndpoints: {
      auth: '/api/auth',
      docs: '/api-docs',
      health: '/health'
    }
  });
});

/**
 * =============================
 * Graceful Shutdown
 * =============================
 */
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  
  // Close server
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Disconnect Prisma
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected');
  } catch (error) {
    logger.error('Error disconnecting database:', error);
  }
  
  // Exit process
  setTimeout(() => {
    logger.error('Forcefully shutting down');
    process.exit(1);
  }, 10000);
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});


const server = app.listen(port, () => {
  console.log(`🚀 Server started: http://localhost:${port}`);
  console.log(`📖 API Docs: http://localhost:${port}/api-docs`);
  console.log(`🔐 Auth Docs: http://localhost:${port}/api-docs-auth`);
  console.log(`🌐 OAuth Health: http://localhost:${port}/api/auth/health`);
  logger.info(`🚀 Server started on PORT: ${port}`);
  logger.info(`📚 API Docs: http://localhost:${port}/api-docs`);
  logger.info(`🔐 Auth Docs: http://localhost:${port}/api-docs-auth`);
  logger.info(`💻 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔑 OAuth Status: Google ${process.env.GOOGLE_CLIENT_ID ? '✅' : '❌'}, Facebook ${process.env.FACEBOOK_APP_ID ? '✅' : '❌'}`);
});

// Handle server errors
server.on('error', (err) => {
  logger.error('Server error:', err);
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${port} is already in use`);
    process.exit(1);
  }
});

export default app;
