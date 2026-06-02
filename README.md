# DashDNS - DNS Monitoring Dashboard

Dashboard monitoring real-time untuk dnsdist dan PowerDNS resolver.

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

### 2. Clone dan Install

```bash
git clone https://github.com/andelli/dashdns.git /opt/dashdns
cd /opt/dashdns

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install && npm run build
```

### 2. Setup Database

```bash
sudo -u postgres psql
CREATE USER dashdns WITH PASSWORD 'your-password-here';
CREATE DATABASE dashdns OWNER dashdns;
GRANT ALL PRIVILEGES ON DATABASE dashdns TO dashdns;
\q

# Grant permissions
sudo -u postgres psql -d dashdns -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dashdns; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dashdns;"
```

### 3. Configure Environment

Edit `backend/.env`:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dashdns
DB_USER=dashdns
DB_PASS=your-password-here
DNSDIST_API_KEY=your-dnsdist-api-key
RESOLVER_API_KEY=your-resolver-api-key
JWT_SECRET=your-random-jwt-secret
JWT_EXPIRY=24h
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Run Migration dan Seed

```bash
cd backend
npm run migrate    # Buat tabel database
npm run seed       # Buat user admin (tidak ada server)
```

**Login:** Username `admin`, Password `admin123`

### 5. Jalankan Aplikasi

**Systemd** (file `dashdns.service` sudah tersedia di root repo):
```bash
sudo cp dashdns.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable dashdns
sudo systemctl start dashdns
```

**PM2:**
```bash
npm install -g pm2
cd /opt/dashdns/backend
pm2 start server.js --name dashdns
pm2 save && pm2 startup
```

### 6. Setup SSH Key (untuk ACL Deploy)

Agar fitur deploy ACL ke dnsdist berfungsi, generate SSH key dan daftarkan ke server dnsdist:

```bash
# Generate key (jika belum ada)
ssh-keygen -t rsa -b 4096

# Copy ke setiap server dnsdist
ssh-copy-id root@dnsdist01.example.com
```

### 7. Konfigurasi dnsdist

Di `/etc/dnsdist/dnsdist.conf`:

```lua
webserver("0.0.0.0:8083")
setWebserverConfig({password="your-password", apikey="your-api-key"})
```

### 8. Konfigurasi PowerDNS Recursor

Di `/etc/powerdns/recursor.conf`:

```ini
webserver=yes
webserver-address=0.0.0.0
webserver-port=9000
webserver-password=your-password
api-key=your-api-key
```

## Update

```bash
cd /opt/dashdns
git fetch --all && git reset --hard origin/main
cd frontend && npm run build
sudo systemctl restart dashdns
```
