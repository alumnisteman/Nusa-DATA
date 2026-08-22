FROM node:18-slim
WORKDIR /app
# Copy all source files, respecting .dockerignore
COPY . .
RUN npm install
RUN rm -rf .next
ARG NEXT_PUBLIC_API_URL=http://192.168.1.13:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build
# Ensure static assets are available in the standalone build
RUN cp -r .next/static .next/standalone/.next/ && (cp -r public .next/standalone/ || true)
EXPOSE 3000
CMD ["node", ".next/standalone/server.js"]
