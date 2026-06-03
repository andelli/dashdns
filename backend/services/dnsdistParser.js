function getStat(stats, name) {
  const item = stats.find(s => s.name === name)
  if (!item) return 0
  return Number(item.value) || 0
}

function parseStats(stats) {
  const queries = getStat(stats, 'queries')
  const cacheHits = getStat(stats, 'cache-hits')
  const cacheMisses = getStat(stats, 'cache-misses')

  const cacheHitRatio = (cacheHits + cacheMisses) > 0
    ? (cacheHits / (cacheHits + cacheMisses)) * 100
    : 0

  return {
    queries,
    cacheHits,
    cacheMisses,
    cacheHitRatio: Math.round(cacheHitRatio * 100) / 100,
    nxdomain: getStat(stats, 'frontend-nxdomain'),
    servfail: getStat(stats, 'frontend-servfail'),
    latencyAvg: getStat(stats, 'latency-avg100') / 1000,
    latencyTcp: getStat(stats, 'latency-tcp') / 1000,
    latencyUdp: getStat(stats, 'latency-udp') / 1000,
    memory: getStat(stats, 'real-memory-usage'),
    cpuUser: getStat(stats, 'cpu-user-msec'),
    cpuSystem: getStat(stats, 'cpu-sys-msec'),
    frontendNhqueries: getStat(stats, 'frontend-nhqueries'),
    downstreamsTimeout: getStat(stats, 'downstreams-timeouts'),
    aclDrops: getStat(stats, 'acl-drops'),
    ruleDrop: getStat(stats, 'rule-drop'),
    ruleNxdomain: getStat(stats, 'rule-nxdomain')
  }
}

module.exports = { parseStats }
