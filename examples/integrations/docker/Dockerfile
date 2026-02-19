FROM node:20-alpine

RUN npm install -g mailgoat

EXPOSE 3001

CMD ["mailgoat", "admin", "serve", "--port", "3001"]
