exports.handler = async function (event) {
  try {
    const body = JSON.parse(event.body || "{}")

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: body.input
      })
    })

    const data = await response.json()

    return {
      statusCode: 200,
      body: JSON.stringify({
        embedding: data.data[0].embedding
      })
    }

  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    }
  }
}
