# DashDNS - DNS Monitoring Dashboard

Dashboard monitoring real-time untuk **dnsdist** dan **PowerDNS Recursor**. Mengumpulkan metrik setiap 10 detik, menampilkan grafik QPS, cache hit ratio, latency, dan resource usage — plus fitur manajemen ACL dan DNS lookup.

## Arsitektur Sistem

```
┌──────────────┐     ┌──────────────┐
│   dnsdist01  │     │   dnsdist02  │     ← Load Balancer DNS
│  (port 8083) │     │  (port 8083) │
└──────┬───────┘     └──────┬───────┘
       │                     │
       ▼                     ▼
┌─────────────────────────────────────┐
│     PowerDNS Recursors (1-4)        │    ← Resolver DNS
│          (port 9000)                │
└──────────────┬──────────────────────┘
               │
               │ HTTP API (setiap 10 detik)
               ▼
┌─────────────────────────────────────┐
│        DashDNS Backend              │
│   Express.js · PostgreSQL · node-cron│
└──────────────┬──────────────────────┘
               │
               │ REST API
               ▼
┌─────────────────────────────────────┐
│       DashDNS Frontend              │
│      React + Vite + ECharts         │
└─────────────────────────────────────┘
```

## Fitur

- **Monitoring Real-time** — metrik dnsdist & resolver diperbarui tiap 10 detik
- **Dashboard** — ringkasan QPS, cache hit ratio, latency, memory, CPU
- **Manajemen Server** — tambah/edit/hapus server dnsdist dan resolver
- **DNS Lookup** — query DNS single atau multi-server comparison
- **ACL Management** — buat, deploy, sync ACL via SSH ke dnsdist
- **Autentikasi JWT** — login aman dengan role admin/viewer
- **Export/Deploy ACL** — export format dnsdist, deploy ke server via SSH

## Prerequisites

- Node.js 18+ dan npm
- PostgreSQL 12+
- Akses network ke dnsdist API (port 8083) dan resolver API (port 9000)

## Fresh Install

### 1. Install PostgreSQL

```bash
# Ubuntu / Debian
sudo apt update && sudo apt install -y postgresql postgresql-client

# CentOS / Rocky / Alma
sudo dnf install -y postgresql-server postgresql-contrib
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql

# Cek status
sudo systemctl status postgresql
```

### 2. Clone dan Install Dependencies

```bash
git clone https://github.com/andelli/dashdns.git /opt/dashdns
cd /opt/dashdns

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install && npm run build
```

### 3. Setup Database

```bash
sudo -u postgres psql
CREATE USER dashdns WITH PASSWORD 'your-password-here';
CREATE DATABASE dashdns OWNER dashdns;
GRANT ALL PRIVILEGES ON DATABASE dashdns TO dashdns;
\q

# Grant permissions
sudo -u postgres psql -d dashdns -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dashdns; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dashdns;"
```

### 4. Configure Environment

```bash
cd /opt/dashdns/backend
cp .env.example .env
```

Edit `backend/.env`:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dashdns
DB_USER=dashdns
DB_PASS=your-secure-password-here
DNSDIST_API_KEY=your-dnsdist-api-key-here
RESOLVER_API_KEY=your-resolver-api-key-here
JWT_SECRET=generate-with-crypto-randomBytes-32-hex
JWT_EXPIRY=24h
DNSDIST_SSH_HOST=dnsdist01.example.com,dnsdist02.example.com
DNSDIST_SSH_PORT=22
DNSDIST_SSH_USER=root
DNSDIST_SSH_KEY=/root/.ssh/id_rsa
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Run Migration dan Seed

```bash
cd /opt/dashdns/backend
npm run migrate    # Buat tabel database
npm run seed       # Buat user admin (tidak ada server)
```

**Login default:** Username `admin`, Password `admin123`

### 6. Jalankan Aplikasi

#### Opsi A: Systemd (recommended)

```bash
sudo cp /opt/dashdns/dashdns.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable dashdns
sudo systemctl start dashdns
```

#### Opsi B: PM2

```bash
npm install -g pm2
cd /opt/dashdns/backend
pm2 start server.js --name dashdns
pm2 save && pm2 startup
```

### 7. Nginx Reverse Proxy (opsional)

Buat `/etc/nginx/sites-available/dashdns`:

```nginx
server {
    listen 80;
    server_name dashns.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/dashdns /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

### 8. Setup SSH Key (untuk ACL Deploy)

Agar fitur deploy ACL ke dnsdist berfungsi:

```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
ssh-copy-id root@dnsdist01.example.com
ssh-copy-id root@dnsdist02.example.com
```

### 9. Konfigurasi dnsdist

Di `/etc/dnsdist/dnsdist.conf`:

```lua
webserver("0.0.0.0:8083")
setWebserverConfig({password="your-password", apikey="your-api-key-here"})
```

### 10. Konfigurasi PowerDNS Recursor

Di `/etc/powerdns/recursor.conf`:

```ini
webserver=yes
webserver-address=0.0.0.0
webserver-port=9000
webserver-password=your-password
api-key=your-api-key-here
```

## Update Aplikasi

```bash
cd /opt/dashdns
git fetch --all && git reset --hard origin/main
cd frontend && npm run build
sudo systemctl restart dashdns
```

## Tech Stack

| Layer          | Teknologi                         |
|----------------|-----------------------------------|
| Backend        | Node.js, Express.js               |
| Frontend       | React 19, Vite, ECharts           |
| Database       | PostgreSQL                        |
| Autentikasi    | JWT (jsonwebtoken + bcryptjs)     |
| HTTP Client    | Axios                             |
| SSH            | node-ssh                          |
| Scheduler      | node-cron (setiap 10 detik)       |
| Process Manager| PM2 / systemd                     |
