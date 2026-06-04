const net = require('net')

async function checkPort(host, port, timeout = 3000) {
  return new Promise((resolve) => {
    const start = Date.now()
    const socket = new net.Socket()
    socket.setTimeout(timeout)
    socket.on('connect', () => {
      const ms = Date.now() - start
      socket.destroy()
      resolve({ up: true, ms })
    })
    socket.on('timeout', () => {
      socket.destroy()
      resolve({ up: false, ms: timeout })
    })
    socket.on('error', () => {
      socket.destroy()
      resolve({ up: false, ms: 0 })
    })
    socket.connect(port, host)
  })
}

async function checkResolver(ip) {
  const [port53, port9000] = await Promise.all([
    checkPort(ip, 53),
    checkPort(ip, 9000)
  ])
  return {
    dns: port53,
    api: port9000
  }
}

async function checkDnsdist(ip) {
  const [port53, port8083] = await Promise.all([
    checkPort(ip, 53),
    checkPort(ip, 8083)
  ])
  return {
    dns: port53,
    api: port8083
  }
}

module.exports = { checkPort, checkResolver, checkDnsdist }
