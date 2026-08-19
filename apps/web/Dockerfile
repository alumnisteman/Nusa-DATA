FROM node:18-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN rm -rf .next
COPY . .
ARG NEXT_PUBLIC_API_URL=http://192.168.1.13:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build
EXPOSE 3000
CMD ["node", ".next/standalone/server.js"]
