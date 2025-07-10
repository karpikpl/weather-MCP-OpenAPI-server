# Use official Node.js Alpine image for smaller size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy application files
COPY . .

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose ports
EXPOSE 3000 3001

# Health check - check both services
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "Promise.all([fetch('http://localhost:3000/health'), fetch('http://localhost:3001/health')]).then(responses => { const allOk = responses.every(r => r.ok); process.exit(allOk ? 0 : 1); }).catch(() => process.exit(1))"

# Start both services
CMD ["npm", "start"]
