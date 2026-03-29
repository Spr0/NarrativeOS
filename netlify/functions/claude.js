export async function handler(event) {
  try {
    const { system, user } = JSON.parse(event.body || "{}")

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
       model: "claude-3-5-haiku-latest",
        max_tokens: 1000,
        system,
        messages: [
          { role: "user", content: user }
        ]
      })
    })

    const data = await response.json()

// 🔥 DEBUG MODE — return raw Claude response
return {
  statusCode: 200,
  body: JSON.stringify({
    debug: data
  })
}

  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: e.message || "Claude error"
      })
    }
  }
}
