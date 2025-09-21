# Stage 1: The "build" stage
# We use a specific Go version that matches your go.mod file.
FROM golang:1.25-alpine AS builder

# --- START OF FIX ---
# Install the trusted root certificates within the builder.
# This is necessary for Go to make secure HTTPS requests during the build (e.g., go mod download).
RUN apk add --no-cache ca-certificates
# --- END OF FIX ---

# Set the working directory inside the container.
WORKDIR /app

# Copy the Go module files.
COPY go.mod go.sum ./

# Download all the dependencies.
RUN go mod download

# Copy the rest of your application's source code.
COPY . .

# Build the Go application into a single static executable.
RUN CGO_ENABLED=0 go build -o /app/main .

# ---

# Stage 2: The "final" stage
# Start from a minimal scratch image for a small and secure final container.
FROM scratch

# --- START OF FIX ---
# Copy the certificates from the builder stage into the final image.
# The Go application needs these at runtime to make secure HTTPS calls (e.g., to Cloudinary).
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
# --- END OF FIX ---

# Set the working directory.
WORKDIR /app

# Copy ONLY the compiled binary from the "builder" stage.
COPY --from=builder /app/main .

# Expose the port your application listens on.
EXPOSE 8080

# The command to run when the container starts.
CMD ["/app/main"]