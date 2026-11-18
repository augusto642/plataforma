FROM node:22-alpine
WORKDIR /app
COPY --chown=node:node server.mjs ./
USER node
ENV NODE_ENV=production
EXPOSE 2000
CMD ["node", "server.mjs"]
