# Server Status Report

**Date**: 2026-06-02

## Working Servers (3/6)

### dnsdist Servers
- ✅ **dnsdist01** (103.167.11.11:8083) - QPS: ~1,500 | Cache Hit: 10.7%
- ✅ **dnsdist02** (103.158.252.252:8083) - QPS: ~14,500 | Cache Hit: 16.8%

### Resolver Servers  
- ✅ **resolver01** (103.105.217.217:8083) - QPS: ~120 | Cache Hit: 28.5%

## Connection Issues (3/6)

The following resolver servers are not responding on port 8083:

- ❌ **resolver02** (103.167.11.115:8083) - Connection refused
- ❌ **resolver03** (103.158.253.253:8083) - Connection refused  
- ❌ **resolver04** (103.158.252.251:8083) - Connection refused

## Troubleshooting Steps

For the 3 servers with connection issues:

1. **Verify dnsdist webserver is running**:
   ```bash
   ssh user@103.167.11.115
   systemctl status dnsdist
   ```

2. **Check dnsdist configuration** (`/etc/dnsdist/dnsdist.conf`):
   ```lua
   webserver("0.0.0.0:8083")
   setWebserverConfig({
     password="your-password",
     apikey="S3cure-it2026",
     acl="0.0.0.0/0"  -- Allow dashboard server IP
   })
   ```

3. **Check firewall rules**:
   ```bash
   # On the resolver server
   iptables -L -n | grep 8083
   ufw status
   ```

4. **Test connectivity from dashboard server**:
   ```bash
   curl -H "X-API-Key: S3cure-it2026" http://103.167.11.115:8083/api/v1/servers/localhost/statistics
   ```

5. **Common issues**:
   - dnsdist webserver not enabled in config
   - Firewall blocking port 8083
   - API key mismatch
   - Network routing issues between servers

## Dashboard Access

Once all servers are configured:

- **URL**: http://localhost:3000
- **Username**: admin
- **Password**: admin123 (change immediately!)

## Current Metrics (Working Servers)

| Server | IP | QPS | Cache Hit | Status |
|--------|-----|------|-----------|--------|
| dnsdist01 | 103.167.11.11 | ~1,500 | 10.7% | ✅ Online |
| dnsdist02 | 103.158.252.252 | ~14,500 | 16.8% | ✅ Online |
| resolver01 | 103.105.217.217 | ~120 | 28.5% | ✅ Online |
| resolver02 | 103.167.11.115 | - | - | ❌ Offline |
| resolver03 | 103.158.253.253 | - | - | ❌ Offline |
| resolver04 | 103.158.252.251 | - | - | ❌ Offline |

**Total QPS**: ~16,120 queries/second
