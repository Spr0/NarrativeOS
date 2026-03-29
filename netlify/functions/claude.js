export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}")

    // For now: mock response (safe for testing)
    return {
      statusCode: 200,
      body: JSON.stringify({
        text: "Mock resume output (API not wired yet)"
      })
    }
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Function error" })
    }
  }
}

