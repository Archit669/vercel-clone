FROM ubuntu:focal

# Update and install dependencies
RUN apt-get update && \
    apt-get install -y curl git && \
    curl -sL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get upgrade -y && \
    apt-get install -y nodejs

# Set the working directory
WORKDIR /home/app

# Copy files into the container
COPY main.sh main.sh
COPY script.js script.js
COPY package*.json .

# Install npm dependencies
RUN npm install

# Make scripts executable
RUN chmod +x main.sh
RUN chmod +x script.js

# Set the entrypoint
ENTRYPOINT ["/home/app/main.sh"]
