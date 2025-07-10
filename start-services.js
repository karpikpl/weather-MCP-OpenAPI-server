#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Weather Proxy Services...\n');

// Start the main API server
console.log('📡 Starting HTTP API server...');
const apiServer = spawn('node', ['index.js'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: process.env.API_PORT || 3000 }
});

// Start the MCP server
console.log('🤖 Starting MCP server...');
const mcpServer = spawn('node', ['mcp-server.js'], {
  stdio: 'inherit',
  env: { ...process.env, MCP_PORT: process.env.MCP_PORT || 3001 }
});

// Handle graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n📴 Received ${signal}, shutting down gracefully...`);
  
  apiServer.kill(signal);
  mcpServer.kill(signal);
  
  setTimeout(() => {
    console.log('⚠️  Force killing processes...');
    apiServer.kill('SIGKILL');
    mcpServer.kill('SIGKILL');
    process.exit(1);
  }, 5000);
};

// Handle process termination
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle child process exits
apiServer.on('exit', (code, signal) => {
  console.log(`❌ API server exited with code ${code} and signal ${signal}`);
  if (!signal) {
    mcpServer.kill();
    process.exit(code);
  }
});

mcpServer.on('exit', (code, signal) => {
  console.log(`❌ MCP server exited with code ${code} and signal ${signal}`);
  if (!signal) {
    apiServer.kill();
    process.exit(code);
  }
});

console.log(`
🌟 Services starting:
   📡 HTTP API: http://localhost:${process.env.API_PORT || 3000}
   🤖 MCP Server: http://localhost:${process.env.MCP_PORT || 3001}
   📚 API Docs: http://localhost:${process.env.API_PORT || 3000}/docs
   🔍 Health Checks: 
      - API: http://localhost:${process.env.API_PORT || 3000}/health
      - MCP: http://localhost:${process.env.MCP_PORT || 3001}/health
`);
