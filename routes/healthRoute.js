import express from 'express';

const healthRouter = express.Router();

// Health check endpoint
healthRouter.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    cors: {
      allowedOrigins: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:4000',
        'https://dolchico.com',
        'https://www.dolchico.com',
        'https://valyris-i.onrender.com'
      ]
    }
  });
});

// Database health check
healthRouter.get('/db', async (req, res) => {
  try {
    // Import prisma client for health check
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    // Simple query to test database connection
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();
    
    res.status(200).json({
      status: 'OK',
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default healthRouter;
