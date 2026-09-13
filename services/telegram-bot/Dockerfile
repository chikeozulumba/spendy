FROM node:22-slim
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY services/telegram-bot/package.json services/telegram-bot/package.json
RUN pnpm install --frozen-lockfile --filter @spendy/telegram-bot...

COPY services/telegram-bot services/telegram-bot

WORKDIR /app/services/telegram-bot
ENV NODE_ENV=production
EXPOSE 8788
CMD ["pnpm", "run", "start"]
