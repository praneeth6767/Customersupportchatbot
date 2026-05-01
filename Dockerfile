FROM node:20-alpine

WORKDIR /usr/src/app

# Copy everything
COPY ./chatbotcode .

# Install dependencies
WORKDIR /usr/src/app/Backend
RUN npm install

EXPOSE 5000
CMD ["npm", "start"]
