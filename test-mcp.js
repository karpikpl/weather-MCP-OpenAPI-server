#!/usr/bin/env node

/**
 * Simple test script for the Weather MCP Server (HTTP version)
 * This script demonstrates how to interact with the HTTP-based MCP server
 */

import axios from 'axios';

class MCPClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl || `http://localhost:${process.env.MCP_PORT || 3001}`;
  }

  async testMCPServer() {
    console.log('🧪 Testing Weather MCP Server (HTTP)...\n');

    try {
      // Test server health
      console.log('🔍 Checking server health...');
      const healthResponse = await axios.get(`${this.baseUrl}/health`);
      console.log('✅ Server is healthy:', healthResponse.data);
      console.log('');

      // Test server info
      console.log('📋 Getting server info...');
      const infoResponse = await axios.get(`${this.baseUrl}/info`);
      console.log('✅ Server info:', infoResponse.data);
      console.log('');

      // Test MCP endpoint with a tools/list request
      console.log('� Testing MCP tools/list...');
      const toolsResponse = await axios.post(`${this.baseUrl}/mcp`, {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      });

      if (toolsResponse.data.result?.tools) {
        console.log('✅ Available tools:');
        toolsResponse.data.result.tools.forEach(tool => {
          console.log(`   • ${tool.name}: ${tool.description}`);
        });
        console.log('');
      }

      // Test weather function
      console.log('🌤️  Testing get_weather tool with "London"...');
      const weatherResponse = await axios.post(`${this.baseUrl}/mcp`, {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'get_weather',
          arguments: {
            location: 'London'
          }
        }
      });

      if (weatherResponse.data.result?.content) {
        console.log('✅ Weather data retrieved successfully!');
        console.log('📄 Response preview:');
        const textContent = weatherResponse.data.result.content.find(c => c.type === 'text');
        if (textContent) {
          // Show first few lines of the response
          const lines = textContent.text.split('\n').slice(0, 10);
          lines.forEach(line => console.log(`   ${line}`));
          if (textContent.text.split('\n').length > 10) {
            console.log('   ... (truncated)');
          }
        }
      } else if (weatherResponse.data.error) {
        console.log('❌ Error:', weatherResponse.data.error.message);
      }

      console.log('\n🎉 MCP Server test completed successfully!');
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      process.exit(1);
    }
  }
}

// Run the test
const client = new MCPClient();
client.testMCPServer().catch(console.error);
