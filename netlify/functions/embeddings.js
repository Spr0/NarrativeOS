exports.handler = async function (event, context) {
  const user = context.clientContext?.user;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}")
    const input = body.input

    if (!input) {
      return {
        statusCode: 200,
        body: JSON.stringify({ embeddings: [] })
      }
    }

    // Validate input type and size
    const isValid = typeof input === "string"
      ? input.length <= 32000
      : Array.isArray(input) && input.length <= 100 && input.every(s => typeof s === "string" && s.length <= 8000);
    if (!isValid) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid input" }) }
    }

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input
      })
    })

    const data = await response.json()

    if (data?.error) {
      return {
        statusCode: 200,
        body: JSON.stringify({ embeddings: [] })
      }
    }

    const embeddings = data?.data?.map(d => d.embedding) || []

    return {
      statusCode: 200,
      body: JSON.stringify({ embeddings })
    }

  } catch {
    return {
      statusCode: 200,
      body: JSON.stringify({ embeddings: [] })
    }
  }
}
