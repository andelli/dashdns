function getStat(stats, name) {
  const item = stats.find(s => s.name === name)
  if (!item) return 0
  return Number(item.value) || 0
}

function parseStats(stats) {
  const queries = getStat(stats, 'questions') || getStat(stats, 'all-outqueries')
  const cacheHits = getStat(stats, 'cache-hits')
  const cacheMisses = getStat(stats, 'cache-misses')
  const packetCacheHits = getStat(stats, 'packetcache-hits')
  const packetCacheMisses = getStat(stats, 'packetcache-misses')

  const totalCacheLookups = cacheHits + cacheMisses
  const cacheHitRatio = totalCacheLookups > 0
    ? (cacheHits / totalCacheLookups) * 100
    : 0

  return {
    queries,
    cacheHits,
    cacheMisses,
    cacheHitRatio: Math.round(cacheHitRatio * 100) / 100,
    cacheSize: getStat(stats, 'cache-size'),
    cacheEntries: getStat(stats, 'cache-entries'),
    packetCacheHits,
    packetCacheMisses,
    packetCacheSize: getStat(stats, 'packetcache-size'),
    nxdomain: getStat(stats, 'nxdomain-queries'),
    servfail: getStat(stats, 'servfail-answers'),
    timeouts: getStat(stats, 'outgoing-timeouts'),
    throttle: getStat(stats, 'throttle-entries'),
    latencyAvg: getStat(stats, 'all-out-latency') > 0 && queries > 0
      ? Math.round((getStat(stats, 'all-out-latency') / queries) * 100) / 100
      : 0,
    memoryUsage: getStat(stats, 'memory-usage') || getStat(stats, 'real-memory-usage'),
    cpuUser: getStat(stats, 'cpu-user-msec'),
    cpuSystem: getStat(stats, 'cpu-sys-msec'),
    concurrentQueries: getStat(stats, 'concurrent-queries'),
    outgoingTimeouts: getStat(stats, 'outgoing-timeouts'),
    dnssecValidations: getStat(stats, 'dnssec-validations'),
    dnssecBogus: getStat(stats, 'dnssec-bogus')
  }
}

module.exports = { parseStats }
