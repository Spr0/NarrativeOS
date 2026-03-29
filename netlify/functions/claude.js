exports.handler = async function (event) {
  try {
    const body = JSON.parse(event.body || "{}")

    const system = body.system || "You are a resume optimization assistant."
    const user = body.user || "No user input provided."

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        temperature: 0.3
      })
    })

    const data = await response.json()

    // 🔍 DEBUG visibility
    if (!body.system || !body.user) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          error: "Missing system or user input",
          received: body,
          openai: data
        })
      }
    }

    const text =
      data?.choices?.[0]?.message?.content ||
      "No response from OpenAI"

    return {
      statusCode: 200,
      body: JSON.stringify({ text })
    }

  } catch (e) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        error: e.message || "Function error"
      })
    }
  }
}
