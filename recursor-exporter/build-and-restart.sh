#!/bin/bash
#
# Build recursor-exporter dan setup/restart service
# Jalanin langsung di resolver setelah git pull atau git clone
#
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
BINARY="recursor-exporter"
SERVICE="recursor-exporter"
INSTALL_PATH="/usr/local/bin/$BINARY"
SERVICE_FILE="/etc/systemd/system/$SERVICE.service"

echo "========================================="
echo "Build & Restart: $SERVICE"
echo "========================================="

cd "$DIR"

echo "[1/3] Compiling..."
go build -o "$BINARY" .

echo "[2/3] Installing to $INSTALL_PATH..."
cp "$BINARY" "$INSTALL_PATH"
chmod +x "$INSTALL_PATH"

echo "[3/3] Setting up service..."
if [ ! -f "$SERVICE_FILE" ]; then
    echo "       Creating $SERVICE_FILE..."
    cat > "$SERVICE_FILE" << 'SRVEOF'
[Unit]
Description=PowerDNS Recursor Exporter
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/recursor-exporter
Restart=always
RestartSec=5
StandardOutput=append:/var/log/recursor-exporter.log
StandardError=append:/var/log/recursor-exporter-error.log

[Install]
WantedBy=multi-user.target
SRVEOF
fi

systemctl daemon-reload
systemctl enable "$SERVICE"
systemctl restart "$SERVICE"

echo ""
echo "Done. Current binary:"
ls -lh "$INSTALL_PATH"
echo ""
systemctl is-active --quiet "$SERVICE" && echo "Service: running" || echo "Service: NOT running"
echo "========================================"
