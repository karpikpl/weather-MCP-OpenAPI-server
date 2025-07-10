#!/usr/bin/env node

import {
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import express from 'express';
import cors from 'cors';

class WeatherMCPServer {
  constructor() {
    // No longer need the MCP Server class since we're implementing HTTP directly
  }

  async run() {
    const app = express();
    app.use(cors());
    app.use(express.json());

    const MCP_PORT = process.env.MCP_PORT || 3001;
    
    // Add a health check endpoint for the MCP server
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        server: 'mcp-weather-server',
        timestamp: new Date().toISOString() 
      });
    });

    // Add an info endpoint
    app.get('/info', (req, res) => {
      res.json({
        name: 'weather-mcp-server',
        version: '0.1.0',
        description: 'MCP server for weather data from wttr.in',
        endpoint: '/mcp',
        tools: ['get_weather']
      });
    });

    // Handle MCP requests directly via HTTP POST
    app.post('/mcp', async (req, res) => {
      try {
        const { method, params, id } = req.body;

        // If this is a notification (no id), do not respond
        if (typeof id === 'undefined') {
          // Optionally log the notification
          return;
        }

        let result;

        if (method === 'initialize') {
          // Respond with server capabilities and info (MCP-compliant)
          return res.json({
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2024-11-05',
              serverInfo: {
                name: 'weather-mcp-server',
                version: '0.1.0'
              },
              capabilities: {
                tools: {
                  get_weather: {
                    description: 'Get current weather information for a specific location using wttr.in service',
                    inputSchema: {
                      type: 'object',
                      properties: {
                        location: {
                          type: 'string',
                          description: 'City or location to retrieve the weather for (e.g., "London", "New York", "Tokyo")',
                        },
                      },
                      required: ['location'],
                    }
                  }
                }
              }
            }
          });
        } else if (method === 'tools/list') {
          result = {
            tools: [
              {
                name: 'get_weather',
                description: 'Get current weather information for a specific location using wttr.in service',
                inputSchema: {
                  type: 'object',
                  properties: {
                    location: {
                      type: 'string',
                      description: 'City or location to retrieve the weather for (e.g., "London", "New York", "Tokyo")',
                    },
                  },
                  required: ['location'],
                },
              },
            ],
          };
        } else if (method === 'tools/call') {
          const { name, arguments: args } = params;
          
          if (name === 'get_weather') {
            const { location } = args;

            if (!location || typeof location !== 'string') {
              return res.json({
                jsonrpc: '2.0',
                id,
                error: {
                  code: ErrorCode.InvalidParams,
                  message: 'Location parameter is required and must be a string'
                }
              });
            }

            try {
              // Make request to wttr.in
              const wttrUrl = `https://wttr.in/${encodeURIComponent(location)}?format=j1`;
              
              const response = await axios.get(wttrUrl, {
                timeout: 30000, // Increased timeout to 30 seconds
                headers: {
                  'User-Agent': 'weather-mcp-server/0.1.0'
                },
                maxRedirects: 5
              });

              // Parse the weather data
              let weatherData;
              try {
                weatherData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
              } catch (parseError) {
                console.error('JSON parse error:', parseError, 'Data:', response.data);
                return res.json({
                  jsonrpc: '2.0',
                  id,
                  error: {
                    code: ErrorCode.InternalError,
                    message: 'Unable to parse weather data from wttr.in'
                  }
                });
              }
              
              // Extract and format the most relevant information
              const current = weatherData.current_condition?.[0];
              const today = weatherData.weather?.[0];
              
              if (!current || !today) {
                return res.json({
                  jsonrpc: '2.0',
                  id,
                  error: {
                    code: ErrorCode.InternalError,
                    message: 'Unable to parse weather data from wttr.in'
                  }
                });
              }

              const formattedWeather = {
                location: location,
                current: {
                  temperature_c: current.temp_C,
                  temperature_f: current.temp_F,
                  feels_like_c: current.FeelsLikeC,
                  feels_like_f: current.FeelsLikeF,
                  humidity: current.humidity,
                  pressure: current.pressure,
                  visibility: current.visibility,
                  uv_index: current.uvIndex,
                  wind_speed_kmh: current.windspeedKmph,
                  wind_speed_mph: current.windspeedMiles,
                  wind_direction: current.winddir16Point,
                  weather_description: current.weatherDesc?.[0]?.value,
                  cloud_cover: current.cloudcover,
                },
                today: {
                  max_temp_c: today.maxtempC,
                  max_temp_f: today.maxtempF,
                  min_temp_c: today.mintempC,
                  min_temp_f: today.mintempF,
                  avg_temp_c: today.avgtempC,
                  avg_temp_f: today.avgtempF,
                  total_snow_cm: today.totalSnow_cm,
                  sun_hour: today.sunHour,
                  uv_index: today.uvIndex,
                },
                astronomy: {
                  sunrise: today.astronomy?.[0]?.sunrise,
                  sunset: today.astronomy?.[0]?.sunset,
                  moonrise: today.astronomy?.[0]?.moonrise,
                  moonset: today.astronomy?.[0]?.moonset,
                  moon_phase: today.astronomy?.[0]?.moon_phase,
                  moon_illumination: today.astronomy?.[0]?.moon_illumination,
                }
              };

              result = {
                content: [
                  {
                    type: 'text',
                    text: `Weather for ${location}:\n\n` +
                          `Current Conditions:\n` +
                          `• Temperature: ${current.temp_C}°C (${current.temp_F}°F)\n` +
                          `• Feels like: ${current.FeelsLikeC}°C (${current.FeelsLikeF}°F)\n` +
                          `• Condition: ${current.weatherDesc?.[0]?.value}\n` +
                          `• Humidity: ${current.humidity}%\n` +
                          `• Wind: ${current.windspeedKmph} km/h ${current.winddir16Point}\n` +
                          `• Pressure: ${current.pressure} mb\n` +
                          `• Visibility: ${current.visibility} km\n` +
                          `• UV Index: ${current.uvIndex}\n` +
                          `• Cloud Cover: ${current.cloudcover}%\n\n` +
                          `Today's Forecast:\n` +
                          `• High: ${today.maxtempC}°C (${today.maxtempF}°F)\n` +
                          `• Low: ${today.mintempC}°C (${today.mintempF}°F)\n` +
                          `• UV Index: ${today.uvIndex}\n` +
                          `• Sun Hours: ${today.sunHour}\n\n` +
                          `Astronomy:\n` +
                          `• Sunrise: ${today.astronomy?.[0]?.sunrise}\n` +
                          `• Sunset: ${today.astronomy?.[0]?.sunset}\n` +
                          `• Moon Phase: ${today.astronomy?.[0]?.moon_phase}\n` +
                          `• Moon Illumination: ${today.astronomy?.[0]?.moon_illumination}%`
                  },
                  {
                    type: 'text',
                    text: JSON.stringify(formattedWeather, null, 2)
                  }
                ],
              };
            } catch (error) {
              if (error.response?.status === 404) {
                return res.json({
                  jsonrpc: '2.0',
                  id,
                  error: {
                    code: ErrorCode.InvalidParams,
                    message: `Location "${location}" not found`
                  }
                });
              }

              if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
                return res.json({
                  jsonrpc: '2.0',
                  id,
                  error: {
                    code: ErrorCode.InternalError,
                    message: 'Weather service timeout - please try again'
                  }
                });
              }

              console.error('Weather API error:', error.message);
              return res.json({
                jsonrpc: '2.0',
                id,
                error: {
                  code: ErrorCode.InternalError,
                  message: `Failed to retrieve weather data: ${error.message}`
                }
              });
            }
          } else {
            return res.json({
              jsonrpc: '2.0',
              id,
              error: {
                code: ErrorCode.MethodNotFound,
                message: `Unknown tool: ${name}`
              }
            });
          }
        } else {
          return res.json({
            jsonrpc: '2.0',
            id,
            error: {
              code: ErrorCode.MethodNotFound,
              message: `Unknown method: ${method}`
            }
          });
        }
        
        res.json({
          jsonrpc: '2.0',
          id,
          result
        });
        
      } catch (error) {
        console.error('MCP request error:', error);
        res.status(500).json({
          jsonrpc: '2.0',
          id: req.body.id,
          error: {
            code: ErrorCode.InternalError,
            message: 'Internal server error'
          }
        });
      }
    });

    app.listen(MCP_PORT, '0.0.0.0', () => {
      console.log(`🤖 Weather MCP server running on port ${MCP_PORT}`);
      console.log(`📡 MCP endpoint: http://localhost:${MCP_PORT}/mcp`);
      console.log(`🔍 Health check: http://localhost:${MCP_PORT}/health`);
    });
  }
}

const server = new WeatherMCPServer();
server.run().catch(console.error);
