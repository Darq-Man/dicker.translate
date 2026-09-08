FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY public ./public
COPY src ./src

RUN npm run build


FROM node:24-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=build /app/build ./build

EXPOSE 3001

CMD ["serve", "-s", "build", "-l", "3001"]