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

/**
 * =============================
 * Internal Imports
 * =============================
 */
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
import authRouter          from './routes/authRoute.js';

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
app.use('/api', apiLimiter);
app.use(helmet());
app.use(express.json());

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

// Sessions & OAuth
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

// Simple error-test route
app.get('/error', (req, res) => {
  logger.error('This is an error log!');
  res.status(500).send('Error logged');
});

// Root
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
  console.log(`🚀 Server started: http://localhost:${port}`);
  logger.info(`🚀 Server started on PORT: ${port}`);
});
