# Use official Node.js runtime as parent image
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application source code
COPY . .

# Expose port and run the app
EXPOSE 5000
CMD [ "npm", "start" ]
