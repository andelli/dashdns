# DashDNS User Guide

## Quick Access
- **URL**: http://10.158.252.100:3000
- **Username**: admin
- **Password**: admin123

## Dashboard Pages

### 1. Main Dashboard (/)
Overview semua server DNS dengan real-time metrics.

**Features:**
- 4 stats cards: Total Servers, Total QPS, Avg Cache Hit, Total Memory
- QPS trend chart (60 menit terakhir) untuk semua server
- Server status table dengan detail metrics per server
- Auto-refresh setiap 10 detik

**Kolom di Server Table:**
- Hostname: Nama server
- IP: IP address server
- QPS: Queries per second (real-time)
- Cache Hit: Persentase cache hit ratio
- Queries: Total queries yang diproses
- NXDOMAIN: Jumlah domain tidak ditemukan
- SERVFAIL: Jumlah query yang gagal
- Latency: Response time dalam milliseconds
- Memory: Memory usage

**Klik row server** untuk melihat detail lengkap.

---

### 2. dnsdist Page (/dnsdist)
Monitoring khusus untuk 2 dnsdist load balancer.

**Features:**
- Summary cards: Total Servers, Total QPS, Avg Cache Hit, Total Queries
- Server table dengan metrics dnsdist-specific
- Detail metrics: latency TCP/UDP, ACL drops, rule drops, downstream timeouts

**Server List:**
- dnsdist01 (103.167.11.11) - QPS: ~1,300
- dnsdist02 (103.158.252.252) - QPS: ~14,000

---

### 3. Resolvers Page (/resolvers)
Monitoring khusus untuk 4 PowerDNS resolver servers.

**Features:**
- Summary cards untuk resolver servers
- Server table dengan resolver-specific metrics
- Detail metrics: concurrent queries, packet cache, DNSSEC validations

**Server List:**
- resolver01 (103.105.217.217) - ✅ Online - QPS: ~120
- resolver02 (103.167.11.115) - ❌ Offline
- resolver03 (103.158.253.253) - ❌ Offline
- resolver04 (103.158.252.251) - ❌ Offline

---

### 4. Server Detail Page (/dnsdist/:id atau /resolvers/:id)
Deep-dive monitoring untuk individual server.

**Features:**
- 4 stats cards: QPS, Cache Hit, Total Queries, Memory
- QPS History Chart (graph garis real-time)
- Cache Hit Ratio Chart (graph persentase)
- Performance Metrics grid:
  - Avg Latency
  - Cache Hits/Misses
  - NXDOMAIN/SERVFAIL counts

**Time Range Selector:**
Pilih range waktu untuk charts:
- Last 30 minutes
- Last 1 hour (default)
- Last 3 hours
- Last 6 hours
- Last 12 hours
- Last 24 hours

**Back Button:**
Kembali ke list page (dnsdist atau resolvers).

---

## Understanding Metrics

### QPS (Queries Per Second)
Jumlah DNS query yang diproses per detik. Higher = lebih banyak traffic.
- Normal: 100-10,000 QPS per server
- High: >10,000 QPS
- Peak hours biasanya lebih tinggi

### Cache Hit Ratio
Persentase query yang di-serve dari cache (tidak perlu forward ke upstream).
- Good: >50%
- Excellent: >80%
- Low (<20%): Mungkin perlu tune cache settings

### Latency
Response time dalam milliseconds.
- Excellent: <10ms
- Good: 10-50ms
- Acceptable: 50-100ms
- Poor: >100ms

### NXDOMAIN
Jumlah query untuk domain yang tidak ada.
- Normal: 5-15% dari total queries
- High: Mungkin ada typo atau malicious queries

### SERVFAIL
Jumlah query yang gagal di-resolve.
- Should be: <1% dari total queries
- High: Masalah di upstream atau configuration

### Memory Usage
RAM yang digunakan oleh dns process.
- Monitor untuk detect memory leaks
- Restart jika terlalu tinggi (>80% system RAM)

---

## Troubleshooting

### Server Offline (Connection Refused)
**Problem:** Server muncul di dashboard tapi QPS = null

**Causes:**
1. Firewall blocking port 8083
2. dnsdist webserver tidak enabled
3. Network unreachable dari dashboard server

**Solution:**
```bash
# Test dari dashboard server
curl -H "X-API-Key: S3cure-it2026" \
  http://<server-ip>:8083/api/v1/servers/localhost/statistics

# Check di target server
systemctl status dnsdist
netstat -tlnp | grep 8083
```

### High Latency
**Problem:** Latency >100ms consistently

**Possible Causes:**
1. Network congestion
2. Upstream resolver lambat
3. Server overloaded (high QPS)
4. DNS cache miss rate tinggi

**Solution:**
- Check network connectivity
- Monitor upstream resolver performance
- Increase cache size di dnsdist config
- Load balance ke multiple upstreams

### Low Cache Hit Ratio
**Problem:** Cache hit <20%

**Possible Causes:**
1. Cache size terlalu kecil
2. TTL values terlalu pendek di DNS records
3. Banyak unique queries (low cacheability)

**Solution:**
```lua
-- Di dnsdist.conf
setECSSourcePrefixV4(24)
setECSSourcePrefixV6(56)
pc = newPacketCache(10000000, {
  maxTTL=86400,
  minTTL=0,
  temporaryFailureTTL=60,
  staleTTL=60
})
getPool(""):setCache(pc)
```

### Dashboard Tidak Accessible
**Problem:** Cannot reach http://10.158.252.100:3000

**Check:**
```bash
# Di dashboard server
systemctl status dashdns
netstat -tlnp | grep 3000
tail -f /var/log/dashdns.log

# Restart service
systemctl restart dashdns
```

---

## Advanced Features

### API Access
Dashboard menyediakan REST API untuk integrasi external.

**Authentication:**
```bash
# Get JWT token
TOKEN=$(curl -s -X POST http://10.158.252.100:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

# Use token
curl -H "Authorization: Bearer $TOKEN" \
  http://10.158.252.100:3000/api/dashboard/overview
```

**Available Endpoints:**
- `GET /api/dashboard/overview` - Summary semua servers
- `GET /api/dashboard/qps?minutes=60` - QPS history
- `GET /api/dnsdist` - List dnsdist servers
- `GET /api/dnsdist/:id` - Detail dnsdist server
- `GET /api/dnsdist/:id/history?minutes=60` - Time series data
- `GET /api/resolvers` - List resolver servers
- `GET /api/resolvers/:id` - Detail resolver server
- `GET /api/resolvers/:id/history?minutes=60` - Time series data

### Export Data
Gunakan API untuk export data ke CSV/JSON:
```bash
# Export all dnsdist data
curl -H "Authorization: Bearer $TOKEN" \
  http://10.158.252.100:3000/api/dnsdist | jq '.' > dnsdist_export.json

# Export QPS history
curl -H "Authorization: Bearer $TOKEN" \
  "http://10.158.252.100:3000/api/dashboard/qps?minutes=1440" | jq '.' > qps_24h.json
```

---

## Performance Tips

### Database Maintenance
PostgreSQL bisa accumulate banyak data. Cleanup old records:
```bash
# Masuk ke database
sudo -u postgres psql -d dashdns

# Delete data older than 7 days
DELETE FROM dnsdist_stats WHERE ts < NOW() - INTERVAL '7 days';
DELETE FROM resolver_stats WHERE ts < NOW() - INTERVAL '7 days';

# Vacuum database
VACUUM ANALYZE;
```

### Monitoring Service Health
Setup simple health check:
```bash
#!/bin/bash
# /usr/local/bin/check_dashdns.sh
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/dashboard/overview)

if [ "$STATUS" != "200" ]; then
  echo "DashDNS is down! HTTP $STATUS" | mail -s "Alert" admin@example.com
  systemctl restart dashdns
fi
```

Add to crontab:
```bash
*/5 * * * * /usr/local/bin/check_dashdns.sh
```

---

## Security Best Practices

1. **Change Default Password**
   - Login ke dashboard
   - TODO: Implement password change UI (belum ada)
   - Atau update langsung di database:
   ```bash
   # Generate bcrypt hash
   node -e "console.log(require('bcryptjs').hashSync('newpassword', 10))"
   
   # Update database
   sudo -u postgres psql -d dashdns -c \
     "UPDATE users SET password_hash='<hash>' WHERE username='admin';"
   ```

2. **Restrict API Access**
   - Gunakan firewall untuk limit access ke port 3000
   - Hanya allow dari trusted IPs

3. **Use HTTPS**
   - Setup nginx reverse proxy dengan SSL certificate
   - Let's Encrypt untuk free SSL

4. **Strong JWT Secret**
   - Generate random secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   - Update di `/opt/dashdns/backend/.env`
   - Restart service

---

## Support & Logs

**View Logs:**
```bash
# Service logs
journalctl -u dashdns -f

# Application logs
tail -f /var/log/dashdns.log

# Error logs
tail -f /var/log/dashdns-error.log
```

**Restart Service:**
```bash
systemctl restart dashdns
```

**Check Service Status:**
```bash
systemctl status dashdns
```

---

## Contact & Documentation

- **Implementation Guide**: `/opt/dashdns/IMPLEMENTATION_SUMMARY.md`
- **Server Status**: `/opt/dashdns/SERVER_STATUS.md`
- **README**: `/opt/dashdns/README.md`

---

**Last Updated**: 2026-06-02
**Version**: 1.0.0
