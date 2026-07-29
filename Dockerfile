FROM node:22-bookworm

# Install Python, Java, GCC, G++
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    openjdk-21-jdk \
    gcc \
    g++ \
    make \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Copy source
COPY . .

# Create temp directory
RUN mkdir -p temp

# Expose API port
EXPOSE 5000

# Start application
CMD ["npm", "start"]