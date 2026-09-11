FROM node:19 as builder

# Expose Coolify vars to webpack
ARG SOURCE_COMMIT
ARG COOLIFY_BRANCH
ENV SOURCE_COMMIT=${SOURCE_COMMIT}
ENV COOLIFY_BRANCH=${COOLIFY_BRANCH}

RUN apt-get install -y --no-install-recommends git

WORKDIR /usr/src/builder

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build
RUN npm run server:build

FROM node:19-alpine as runner
WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY --from=builder --chown=node:node /usr/src/builder/build ./build
COPY --from=builder --chown=node:node /usr/src/builder/server/dist ./server/dist
COPY --from=builder --chown=node:node /usr/src/builder/package.json ./
COPY --from=builder --chown=node:node /usr/src/builder/package-lock.json ./

RUN npm ci --omit=dev --no-audit --no-fund

RUN apk add pngquant

RUN find ./build/models \
    ./build/textures/buildings \
    ./build/textures/surfaces \
    -type f -name "*.png" \
    -exec pngquant --force --quality 65-80 --skip-if-larger --output {} {} \;

EXPOSE 8080

USER node

CMD ["npm", "start"]
