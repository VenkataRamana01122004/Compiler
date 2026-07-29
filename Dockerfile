FROM node:22-bookworm

# Install Python, Java, GCC, G++
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    openjdk-17-jdk \
    gcc \
    g++ \
    make \
    && rm -rf /var/lib/apt/lists/*

# Create symlink so "python" command works
RUN ln -sf /usr/bin/python3 /usr/bin/python

# Set JAVA_HOME
ENV JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
ENV PATH="$JAVA_HOME/bin:$PATH"

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN mkdir -p temp

EXPOSE 5000

CMD ["npm", "start"]