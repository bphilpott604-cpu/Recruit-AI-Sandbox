FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Create data directory for database and uploads
RUN mkdir -p /app/data/uploads

EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001

CMD ["npm", "start"]
