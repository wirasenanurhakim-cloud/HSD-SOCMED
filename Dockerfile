FROM ubuntu:22.04

# Install curl and basic utilities
RUN apt-get update && apt-get install -y curl ca-certificates && apt-get clean

WORKDIR /pb

# Copy PocketBase binary
COPY pb/pocketbase /pb/pocketbase

# Copy startup script
COPY pb/start.sh /pb/start.sh

# Make PocketBase executable
RUN chmod +x /pb/pocketbase
RUN chmod +x /pb/start.sh

# Create data directory (for when volume isn't mounted)
RUN mkdir -p /pb/pb_data

# Expose port
EXPOSE 8080

# Start command with persistent data directory
CMD ["/bin/sh", "-c", "./pocketbase serve --http=0.0.0.0:8080 --dir=/pb/pb_data"]