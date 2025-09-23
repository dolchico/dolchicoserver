/**
 * ==============import userRouter          from './routes/userRoute.js';
import productRouter       from './routes/productRoute.js';
import cartRouter          from './routes/cartRoute.js';
import orderRouter         from './routes/orderRoute.js';
import adminRouter         from './routes/adminRoute.js';
import OAuthRouter         from './routes/oauth.js';
import wishlistRoutes      from './routes/wishlistRoutes.js';
import addressRoutes       from './routes/addressRoute.js';
import paymentRouter from './routes/paymentRoutes.js';
import categoryRoutes from './routes/category.routes.js';
// import paymentRoutes from './routes/paymentRoutes.js';===
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
import { apiLimiter }      from './middleware/rateLimit.js';
import { ensureAuth }      from './middleware/authMiddleware.js';

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
import categoryRoutes from './routes/category.routes.js';
import couponRoutes from './routes/couponRoutes.js';
import debugRoute from './routes/debugRoute.js';
// import paymentRoutes from './routes/paymentRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';

import './config/passport-setup.js';

/**
 * =============================
 * Config & App Init
 * =============================
 */
dotenv.config();
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
    'https://dolchico.com',
    'https://www.dolchico.com',
    'https://valyris-i.onrender.com',
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
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  },
  name: 'oauth.session' // Custom session name
}));

app.use(passport.initialize());

// Rate limiting (keeping your existing setup)
// app.use('/api', apiLimiter);

// Logging
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) }
}));

/**
 * =============================
 * Routes (Your existing routes unchanged)
 * =============================
 */
app.use('/api/auth',    OAuthRouter);
app.use('/api/user',    userRouter);
app.use('/api/admin',   adminRouter);
app.use('/api/product', productRouter);
app.use('/api/order',   ensureAuth, orderRouter);
app.use('/api/cart',    ensureAuth, cartRouter);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/payment', paymentRouter); // Removed authUser - auth is now handled in routes
app.use('/api', categoryRoutes);
app.use('/api', couponRoutes);
app.use('/api/debug', debugRoute);
app.use('/api/reviews', reviewRoutes);
// app.use('/api/payment', paymentRoutes);

// Root health check (for deployment platforms)
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Dolchico E-commerce API Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      docs: '/api-docs',
      authDocs: '/api-docs-auth'
    }
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  });
});

// Simple error-test route (unchanged)
app.get('/error', (req, res) => {
  logger.error('This is an error log!');
  res.status(500).send('Error logged');
});

// Root (unchanged)
app.get('/', (req, res) => {
  res.send('API Working');
  console.log('DATABASE_URL at runtime:', process.env.DATABASE_URL);
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

export const findUserByPhone = async (phoneNumber) => {
    if (!phoneNumber) return null;
    try {
        return await prisma.user.findUnique({
            where: { phoneNumber: phoneNumber.trim() },
        });
    } catch (error) {
        // Check if the error is related to the missing dob column
        if (error.code === 'P2022' && error.meta?.column === 'users.dob') {
            // Fallback query without automatically selecting the problematic field
            return await prisma.$queryRaw`
                SELECT id, name, email, password, "phoneNumber", "emailVerified", 
                "phoneVerified", "isProfileComplete", "isActive", role, "createdAt", 
                "updatedAt", "resetToken", "resetTokenExpiry", "pendingEmail", 
                "pendingEmailOtp", "pendingEmailExpiry", country, state, zip,
                "pendingDeleteOtp", "pendingDeleteExpiry", username, "fullName"
                FROM "users" WHERE "phoneNumber" = ${phoneNumber.trim()} LIMIT 1
            `;
        }
        throw error;
    }
};
