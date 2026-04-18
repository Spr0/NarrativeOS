exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return { statusCode: 200, body: "no webhook configured" };

  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, body: "bad json" }; }

  const { email, action, detail } = body;
  const ts = new Date().toUTCString();
  const name = email ? `**${email}**` : "unknown user";
  const content = `${name} \u2014 ${action}${detail ? ` \u2014 \`${detail}\`` : ""}\n*${ts}*`;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  } catch (e) {
    // swallow — logging should never break the app
  }

  return { statusCode: 200, body: "ok" };
};
