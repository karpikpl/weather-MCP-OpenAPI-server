import express from 'express';
import axios from 'axios';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Load OpenAPI specification
const openApiSpec = JSON.parse(fs.readFileSync(path.join(__dirname, 'weather.json'), 'utf8'));


// Middleware
app.use(express.json());

// Detailed logging middleware for all HTTP requests and responses
app.use((req, res, next) => {
  if (req.path === '/health') {
    return next();
  }
  const start = process.hrtime.bigint();
  const { method, url, headers } = req;
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const log = {
      request: {
        method,
        url,
        headers,
      },
      response: {
        statusCode: res.statusCode,
        headers: res.getHeaders(),
      },
      durationMs: durationMs.toFixed(2),
      timestamp: new Date().toISOString(),
    };
    // Log as JSON for easy parsing
    console.log('[HTTP LOG]', JSON.stringify(log, null, 2));
  });
  next();
});

// Serve OpenAPI documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.get('/openapi.json', (req, res) => {
  res.json(openApiSpec);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Weather proxy endpoint
app.get('/:location', async (req, res) => {
  try {
    const { location } = req.params;
    const { format = 'j1' } = req.query;

    // Validate required parameters
    if (!location) {
      return res.status(400).json({
        error: 'Location parameter is required'
      });
    }

    // Ensure format is j1 as specified in the OpenAPI spec
    if (format !== 'j1') {
      return res.status(400).json({
        error: 'Format parameter must be "j1"'
      });
    }

    // Make request to wttr.in
    const wttrUrl = `https://wttr.in/${encodeURIComponent(location)}?format=${format}`;

    console.log(`Proxying request to: ${wttrUrl}`);

    const response = await axios.get(wttrUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'wttr-proxy/1.0.0'
      }
    });

    // Set appropriate headers
    res.set({
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
    });

    res.send(response.data);

  } catch (error) {
    console.error('Error fetching weather data:', error.message);

    if (error.response?.status === 404) {
      return res.status(404).json({
        error: 'Location not found'
      });
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return res.status(504).json({
        error: 'Gateway timeout - wttr.in service unavailable'
      });
    }

    res.status(500).json({
      error: 'Internal server error while fetching weather data'
    });
  }
});

// Root endpoint - redirect to docs
app.get('/', (req, res) => {
  res.redirect('/docs');
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /{location}?format=j1 - Get weather data',
      'GET /docs - API documentation',
      'GET /health - Health check'
    ]
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🌤️  Weather proxy server running on port ${PORT}`);
  console.log(`📚 API documentation available at http://localhost:${PORT}/docs`);
  console.log(`🔍 Health check available at http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});
