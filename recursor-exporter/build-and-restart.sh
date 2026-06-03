#!/bin/bash
#
# Deploy recursor-exporter — langsung copy binary + setup service
# Jalanin langsung di resolver setelah git clone atau git pull
# Tidak perlu Go compiler.
#
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
BINARY="recursor-exporter"
SERVICE="recursor-exporter"
INSTALL_PATH="/usr/local/bin/$BINARY"
SERVICE_FILE="/etc/systemd/system/$SERVICE.service"

echo "========================================="
echo "Deploy: $SERVICE"
echo "========================================="

cd "$DIR"

echo "[1/2] Installing binary to $INSTALL_PATH..."
if [ ! -f "$BINARY" ]; then
    echo "Error: $BINARY not found. Clone repo dulu:"
    echo "  git clone https://github.com/andelli/dashdns.git /opt/dashdns"
    exit 1
fi
cp "$BINARY" "$INSTALL_PATH"
chmod +x "$INSTALL_PATH"

echo "[2/2] Setting up service..."
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
systemctl enable "$SERVICE" 2>/dev/null || true
systemctl restart "$SERVICE"

echo ""
echo "Done."
ls -lh "$INSTALL_PATH"
systemctl is-active --quiet "$SERVICE" && echo "Service: running" || echo "Service: NOT running"
echo "========================================"
