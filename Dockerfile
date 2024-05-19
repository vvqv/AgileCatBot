FROM node:14

WORKDIR /AgileCatBot

COPY . .

RUN npm install

CMD ["npm", "start"]