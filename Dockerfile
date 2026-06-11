FROM ubuntu:22.04

# Install curl and basic utilities
RUN apt-get update && apt-get install -y curl ca-certificates && apt-get clean

WORKDIR /pb

# Copy PocketBase binary
COPY pb/pocketbase /pb/pocketbase

# Make PocketBase executable - USE root user for execution
RUN chmod 755 /pb/pocketbase && ls -la /pb/pocketbase

# Create data directory
RUN mkdir -p /pb/pb_data && chmod 755 /pb/pb_data

# Expose port
EXPOSE 8080

# Start command with persistent data directory
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080", "--dir=/pb/pb_data"]