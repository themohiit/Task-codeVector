import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import productRoutes from './routes/productRoutes.js';
import errorHandler from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();

// Standard middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/products', productRoutes);

// Base route for simple health check
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    message: 'Product Catalog API is running'
  });
});

// Centralized error handler (must be registered after all other routes/middleware)
app.use(errorHandler);

export default app;
