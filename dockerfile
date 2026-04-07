# STAGE 1: Build the application
FROM node:22 AS build

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# STAGE 2: Create production image
FROM node:22-alpine

# Set the working directory in the container
WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy prisma schema and generate client for production
COPY prisma ./prisma
RUN npx prisma generate

# Copy the build output from the build stage
COPY --from=build /app/dist ./dist

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Use entrypoint to run migrations before starting the app
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main"]
