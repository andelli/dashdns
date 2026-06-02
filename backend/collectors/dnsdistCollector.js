const axios = require('axios')

async function collect(ip, port = 8083, apiKey) {

  try {

    const response = await axios.get(
      `http://${ip}:${port}/api/v1/servers/localhost/statistics`,
      {
        headers: {
          'X-API-Key': apiKey || process.env.DNSDIST_API_KEY
        },
        timeout: 5000
      }
    )

    return response.data

  } catch (err) {

    console.error(
      `Collector error ${ip}:`,
      err.response?.status || err.message
    )

    return null

  }

}

module.exports = {
  collect
}
