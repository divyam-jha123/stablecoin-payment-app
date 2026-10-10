# Traveller Pay API image. Build from the repository root so the workspace
# lockfile and @traveller/shared are in the build context:
#   docker build -f apps/api/Dockerfile -t traveller-api .

FROM node:24-alpine AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 CI=true
RUN corepack enable
WORKDIR /app
# Workspace manifests only, so dependency layers stay cached until they change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# pnpm-workspace.yaml lists dependency patches; install fails without them.
COPY patches patches
COPY apps/api/package.json apps/api/
COPY apps/mobile/package.json apps/mobile/
COPY packages/shared/package.json packages/shared/

FROM base AS build
# The root workspace supplies TypeScript for the build.
RUN pnpm install --frozen-lockfile --filter . --filter @traveller/api...
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @traveller/api build

FROM base AS prod-deps
RUN pnpm install --frozen-lockfile --prod --filter @traveller/api...

FROM node:24-alpine AS runtime
# SESSION_SECRET (32+ characters) is required at run time; pass it from the
# host's secret settings, never bake it into the image.
ENV NODE_ENV=production APP_ENV=hackathon-demo PORT=3000
WORKDIR /app
COPY --from=prod-deps /app/node_modules node_modules
COPY --from=prod-deps /app/packages/shared/node_modules packages/shared/node_modules
COPY --from=prod-deps /app/apps/api/node_modules apps/api/node_modules
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/api/dist apps/api/dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "apps/api/dist/server.js"]
