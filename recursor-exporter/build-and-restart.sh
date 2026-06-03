#!/bin/bash
#
# Build recursor-exporter dan restart service
# Jalanin script ini langsung di resolver setelah git pull
#
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
BINARY="recursor-exporter"
SERVICE="recursor-exporter"
INSTALL_PATH="/usr/local/bin/$BINARY"

echo "========================================="
echo "Build & Restart: $SERVICE"
echo "========================================="

cd "$DIR"

echo "[1/3] Compiling..."
go build -o "$BINARY" .

echo "[2/3] Installing to $INSTALL_PATH..."
cp "$BINARY" "$INSTALL_PATH"
chmod +x "$INSTALL_PATH"

echo "[3/3] Restarting service..."
systemctl daemon-reload
systemctl enable "$SERVICE"
systemctl restart "$SERVICE"

echo ""
echo "Done. Current binary:"
ls -lh "$INSTALL_PATH"
echo ""
systemctl is-active --quiet "$SERVICE" && echo "Service: running" || echo "Service: NOT running"
echo "========================================"
