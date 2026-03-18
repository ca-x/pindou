# ── Build Arguments ────────────────────────────────────────────────────────
ARG GOLANG_VERSION=1.25
ARG ALPINE_VERSION=3.21

# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM golang:${GOLANG_VERSION}-alpine AS builder

# Build args from GitHub Actions
ARG VERSION=dev
ARG BUILDTIME
ARG GITCOMMIT

RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /build

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build \
      -ldflags="-s -w \
        -X pindou/internal/version.Version=${VERSION} \
        -X pindou/internal/version.BuildTime=${BUILDTIME} \
        -X pindou/internal/version.GitCommit=${GITCOMMIT}" \
      -o /out/pindou \
      ./cmd/server

# ── Stage 2: Minimal runtime ─────────────────────────────────────────────────
FROM alpine:${ALPINE_VERSION}

LABEL org.opencontainers.image.source="https://github.com/czyt/pindou"
LABEL org.opencontainers.image.description="Pindou - Bead Art Pattern Tool"
LABEL org.opencontainers.image.licenses="MIT"

RUN apk add --no-cache ca-certificates tzdata wget \
    && addgroup -S pindou \
    && adduser -S -G pindou pindou \
    && mkdir -p /app/data \
    && chown -R pindou:pindou /app

COPY --from=builder /out/pindou /app/pindou

WORKDIR /app
USER pindou

EXPOSE 8080

# Persistent volumes
VOLUME ["/app/data"]

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/ || exit 1

ENTRYPOINT ["/app/pindou"]
CMD []