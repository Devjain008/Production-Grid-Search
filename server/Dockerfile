FROM node:20-alpine

WORKDIR /app

# Install build dependencies if needed
RUN apk add --no-cache git python3 make g++

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000

CMD ["node", "src/server.js"]
