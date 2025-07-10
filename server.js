/**
 * ================================
 * External Packages
 * ================================
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import yaml from 'yaml';
import morgan from 'morgan';

/**
 * ================================
 * Internal Imports
 * ================================
 */
import logger from './logger.js';
import connectCloudinary from './config/cloudinary.js';
import userRouter from './routes/userRoute.js';
import productRouter from './routes/productRoute.js';
import cartRouter from './routes/cartRoute.js';
import orderRouter from './routes/orderRoute.js';
import adminRouter from './routes/adminRoute.js';
import helmet from './middleware/helmet.js';
import { apiLimiter} from './middleware/rateLimit.js';

/**
 * ================================
 * Config
 * ================================
 */
dotenv.config();
const app = express();
const port = process.env.PORT || 4000;

/**
 * ================================
 * Swagger Setup
 * ================================
 */
const file = fs.readFileSync('./swagger.yaml', 'utf8');
const swaggerDocument = yaml.parse(file);

/**
 * ================================
 * Connect External Services
 * ================================
 */
connectCloudinary();
/**
 * ================================
 * Middleware
 * ================================
 */
app.use('/api', apiLimiter);
app.use(helmet);
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Winston + Morgan integration
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Log every request with Winston
// app.use((req,next) => {
//   logger.info(`${req.method} ${req.url}`);
//   next();
// });
/**
 * ================================
 * Error Testing Route
 * ================================
 */
app.get('/error', (req, res) => {
  logger.error('This is an error log!');
  res.status(500).send('Error logged');
});

/**
 * ================================
 * API Routes
 * ================================
 */
app.use('/api/user', userRouter);
app.use('/api/admin', adminRouter);
app.use('/api/product', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/order', orderRouter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

/**
 * ================================
 * Root Route
 * ================================
 */
app.get('/', (req, res) => {
  res.send('API Working');
  console.log('DATABASE_URL at runtime:', process.env.DATABASE_URL);
});

/**
 * ================================
 * Start Server
 * ================================
 */
app.listen(port, () => {
  console.log(`🚀 Server started on PORT: ${port}`);
  logger.info(`🚀 Server started on PORT: ${port}`);
});
