/**
 * =============================
 * External Packages
 * =============================
 */
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
import { fileURLToPath } from 'url';

/**
 * =============================
 * Internal Imports
 * =============================
 */
import logger from './logger.js';
import connectCloudinary from './config/cloudinary.js';
import helmet from './middleware/helmet.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { ensureAuth } from './middleware/authMiddleware.js';

import userRouter from './routes/userRoute.js';
import productRouter from './routes/productRoute.js';
import cartRouter from './routes/cartRoute.js';
import orderRouter from './routes/orderRoute.js';
import adminRouter from './routes/adminRoute.js';
import authRouter from './routes/authRoute.js';

import './config/passport-setup.js';

/**
 * =============================
 * Config & App Init
 * =============================
 */
dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 4000;

// ########## CRITICAL: Trust Proxy for Render/cloud ##########
app.set('trust proxy', 1);

// Provide BASE_URL for emails, public links, etc.
process.env.BASE_URL = process.env.BASE_URL
  || (process.env.NODE_ENV === 'production'
      ? 'https://famefash-backend.onrender.com'
      : `http://localhost:${port}`);

/**
 * =============================
 * Swagger – Specs & Routes
 * =============================
 */
const coreSpecRaw = fs.readFileSync(path.join(__dirname, 'swagger.yaml'), 'utf8');
const coreSpec = yaml.parse(coreSpecRaw);

const authSpecPath = path.join(__dirname, 'docs', 'swagger-auth.yaml');
if (fs.existsSync(authSpecPath)) {
  const authSpec = yaml.parse(fs.readFileSync(authSpecPath, 'utf8'));
  app.use('/api-docs-auth', swaggerUi.serve, swaggerUi.setup(authSpec));
}
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(coreSpec));

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
// Enable rate limiting ONLY in production (disable for easier dev testing)
if (process.env.NODE_ENV === 'production') {
  app.use('/api', apiLimiter);
}
app.use(helmet());

app.use(express.json());

/** CORS: Origin from ENV, fallback '*' for dev **/
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: process.env.CORS_CREDENTIALS === 'true' // usually false unless cookies are used cross-origin
}));

// Session & OAuth
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true
  }
}));
app.use(passport.initialize());
app.use(passport.session());

// Logging
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) }
}));

/**
 * =============================
 * Routes
 * =============================
 */
app.use('/api/auth',    authRouter);
app.use('/api/user',    userRouter);
app.use('/api/admin',   adminRouter);
app.use('/api/product', productRouter);
app.use('/api/order',   ensureAuth, orderRouter);
app.use('/api/cart',    ensureAuth, cartRouter);

app.get('/error', (req, res) => {
  logger.error('This is an error log!');
  res.status(500).send('Error logged');
});

app.get('/', (req, res) => {
  res.send('API Working');
  console.log('DATABASE_URL at runtime:', process.env.DATABASE_URL);
});

/**
 * =============================
 * Server Start
 * =============================
 */
app.listen(port, () => {
  logger.info(`🚀 Server started at ${process.env.BASE_URL} (PORT: ${port})`);
  console.log(`🚀 Server started at ${process.env.BASE_URL} (PORT: ${port})`);
});

