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
import { PrismaSessionStore } from '@quixo3/prisma-session-store';
import { PrismaClient } from '@prisma/client';
import passport      from './config/passport.js';
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
import authRoutes          from './routes/authRoutes.js'; // Combined OAuth and auth routes
import legalRoutes         from './routes/legalRoutes.js';

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
const prisma = new PrismaClient();

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
// Trust proxy for production deployments
app.set('trust proxy', 1);

// Production HTTPS redirect
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "https://graph.facebook.com", "https://www.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    },
  },
}));

// Rate limiting
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL ? [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'https://dolchico.com'
  ] : [
    'http://localhost:3000',
    'https://dolchico.com',
    '*'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true // Enable credentials for OAuth
}));

// Sessions & OAuth with Prisma store
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
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
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

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
 * Routes
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
app.use('/api/order',   flexibleAuth, orderRouter); // Support both JWT and session auth
app.use('/api/cart',    flexibleAuth, cartRouter);  // Support both JWT and session auth

// Health check routes
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: process.env.DATABASE_URL ? 'Connected' : 'Not configured',
    oauth: {
      google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      facebook: !!(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET)
    }
  });
});

// Simple error-test route
app.get('/error', (req, res) => {
  logger.error('This is an error log!');
  res.status(500).send('Error logged');
});

// Root
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

/**
 * =============================
 * Error Handling Middleware
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
