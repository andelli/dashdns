const axios = require('axios')

async function collect(ip, port = 8082, apiKey) {
  try {
    const response = await axios.get(
      `http://${ip}:${port}/api/v1/servers/localhost/statistics`,
      {
        headers: {
          'X-API-Key': apiKey
        },
        timeout: 5000
      }
    )
    return response.data
  } catch (err) {
    console.error(
      `Resolver collector error ${ip}:${port}:`,
      err.response?.status || err.message
    )
    return null
  }
}

module.exports = { collect }
