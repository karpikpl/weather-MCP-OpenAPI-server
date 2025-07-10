# Weather Proxy Service

A lightweight Node.js application that proxies calls to wttr.in and implements the OpenAPI specification for weather data retrieval. Also includes an MCP (Model Context Protocol) server for AI assistant integration.

## Features

- ✅ Implements the OpenAPI 3.1.0 specification
- 🌤️ Proxies requests to wttr.in weather service
- 📚 Interactive API documentation with Swagger UI
- 🤖 MCP server for AI assistant integration
- 🐳 Docker containerized for easy deployment
- 🔒 Security best practices (non-root user, input validation)
- 📊 Health check endpoint
- ⚡ Lightweight and fast

## Quick Start

### Using Docker Compose (Recommended)

```bash
docker-compose up --build
```

This will start both services:
- **HTTP API**: http://localhost:3000
- **MCP Server**: http://localhost:3001

### Using Docker

```bash
# Build the image
docker build -t wttr-proxy .

# Run the container (exposes both ports)
docker run -p 3000:3000 -p 3001:3001 wttr-proxy
```

### Local Development

```bash
# Install dependencies
npm install

# Start both HTTP API and MCP server
npm start

# Or start them individually:
npm run start:api  # HTTP API only
npm run start:mcp  # MCP server only

# Development mode (HTTP API only)
npm run dev
```

## MCP Server Usage

The MCP (Model Context Protocol) server runs as an HTTP service alongside the main API, making it accessible over the network for AI assistant integration.

### Network Access
- **MCP Endpoint**: `http://localhost:3001/mcp`
- **Transport**: HTTP JSON-RPC 2.0 over POST
- **Health Check**: `http://localhost:3001/health`

### Integration Steps:

1. **Start the services**:
   ```bash
   npm start  # Starts both API and MCP server
   ```

2. **Configure your AI assistant** to connect to `http://localhost:3001/mcp` using HTTP POST with JSON-RPC 2.0 protocol. Use the provided `mcp-config.json` as a reference:
   ```json
   {
     "mcpServers": {
       "weather": {
         "url": "http://localhost:3001/mcp",
         "transport": "http",
         "method": "POST"
       }
     }
   }
   ```

3. **Test the connection**:
   ```bash
   npm run test-mcp
   ```

### MCP API Examples:

**List Tools:**
```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

**Get Weather:**
```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_weather","arguments":{"location":"London"}}}'
```

### Available MCP Tools:
- `get_weather(location)`: Get comprehensive weather information for any location

The MCP server provides formatted weather data including current conditions, forecasts, and astronomical information, accessible over HTTP for network-based AI assistant integration.

## Usage

Once running, the services will be available at:

- **HTTP API**: http://localhost:3000
  - API Documentation: http://localhost:3000/docs
  - Health Check: http://localhost:3000/health
  - Weather Endpoint: http://localhost:3000/{location}?format=j1

- **MCP Server**: http://localhost:3001
  - MCP Endpoint: http://localhost:3001/mcp
  - Health Check: http://localhost:3001/health
  - Server Info: http://localhost:3001/info

### Example API Calls

```bash
# Get weather for London
curl "http://localhost:3000/London?format=j1"

# Get weather for New York
curl "http://localhost:3000/New%20York?format=j1"

# Health check
curl "http://localhost:3000/health"
```

## API Specification

The service implements the OpenAPI specification defined in `weather.json`:

- **Endpoint**: `GET /{location}`
- **Required Parameters**:
  - `location` (path): City or location name
  - `format` (query): Must be "j1" for JSON format
- **Responses**:
  - `200`: Weather data in JSON format
  - `404`: Location not found
  - `400`: Invalid parameters
  - `500`: Server error

## Environment Variables

- `API_PORT`: HTTP API server port (default: 3000)
- `MCP_PORT`: MCP server port (default: 3001)
- `NODE_ENV`: Environment mode (development/production)

## Security Features

- Non-root user in Docker container
- Input validation and sanitization
- Request timeout protection
- Error handling and logging
- CORS-ready (if needed)

## Health Monitoring

The application includes:
- Health check endpoint (`/health`)
- Docker health checks
- Graceful shutdown handling
- Request logging

## Development

The application is built with:
- **Express.js**: Web framework
- **Axios**: HTTP client for API calls
- **Swagger UI Express**: API documentation
- **MCP SDK**: Model Context Protocol server implementation
- **Node.js 18 Alpine**: Lightweight container base

## MCP Server Configuration

For AI assistants that support MCP, you can configure the weather server using the provided `mcp-config.json`:

```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["mcp-server.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## Testing with Fast-Agent MCP Client

Run

```bash
uv tool run fast-agent-mcp go --servers weather
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License
