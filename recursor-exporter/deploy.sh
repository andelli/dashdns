#!/bin/bash
#
# Deploy recursor-exporter ke remote resolver server
# Usage: ./deploy.sh <hostname> [ip]
# Contoh: ./deploy.sh resolver01 103.105.217.217
#

set -e

if [ $# -lt 1 ]; then
    echo "Usage: $0 <hostname> [ip]"
    echo "Example: $0 resolver01 103.105.217.217"
    exit 1
fi

HOSTNAME="$1"
IP="${2:-$HOSTNAME}"
BINARY="recursor-exporter"
REMOTE_PATH="/usr/local/bin/$BINARY"
SERVICE_FILE="/etc/systemd/system/recursor-exporter.service"

echo "========================================="
echo "Deploy recursor-exporter to $HOSTNAME ($IP)"
echo "========================================="

cd "$(dirname "$0")"

echo "[1/4] Compiling binary for linux/amd64..."
GOOS=linux GOARCH=amd64 go build -o "$BINARY" .

echo "[2/4] Copying binary to $HOSTNAME..."
scp -q "$BINARY" "root@$IP:$REMOTE_PATH"

echo "[3/4] Setting up systemd service on $HOSTNAME..."
ssh "root@$IP" << 'SSH_EOF'
set -e
BINARY="/usr/local/bin/recursor-exporter"
SERVICE_FILE="/etc/systemd/system/recursor-exporter.service"

chmod +x "$BINARY"

# Create systemd service if not exists
if [ ! -f "$SERVICE_FILE" ]; then
    cat > "$SERVICE_FILE" << 'EOF'
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
EOF
fi

echo "[4/4] Restarting service..."
systemctl daemon-reload
systemctl enable recursor-exporter
systemctl restart recursor-exporter

echo "Done."
SSH_EOF

echo "----------------------------------------"
echo "Deploy to $HOSTNAME completed."
echo "Check status: ssh root@$IP 'systemctl status recursor-exporter'"
echo "Test: curl http://$IP:9000/health"
echo "========================================"
