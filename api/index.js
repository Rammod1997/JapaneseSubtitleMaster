import { createServer } from 'http';
import express from 'express';
import { registerRoutes } from '../server/routes.js';

const app = express();

// Register all routes
registerRoutes(app);

// Create server
const server = createServer(app);

// Export as serverless function
export default (req, res) => {
  // Handle the request using Express
  app(req, res);
};