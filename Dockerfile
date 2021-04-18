FROM node:12.18-alpine
ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent && npm audit fix && mv node_modules ../
COPY . .
EXPOSE 3000
EXPOSE ${PORT}
CMD ["npm", "start"]
