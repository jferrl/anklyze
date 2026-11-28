# Build stage
FROM golang:1.27-alpine@sha256:70bd7ddea8b6cbe5d6943cde279d6b67feb10cc924fb9100d1d8757c1575b280 AS builder

WORKDIR /app

# Install ca-certificates for HTTPS calls at runtime
RUN apk add --no-cache ca-certificates

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Build the binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd/anklyze-apiserver

# Runtime stage
# Alpine 3.21 reached end of life on 2026-11-01.
FROM alpine:3.24@sha256:f59abe656b692d901e184be3445e084786602108599d2a51d229c0f5a48c71bf

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /server /server

ENV APP_ENV=production

EXPOSE 8080

ENTRYPOINT ["/server"]
