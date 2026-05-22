export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const apiKey = req.headers["x-api-key"];
  if (!apiKey) return res.status(400).json({ error: "Missing x-api-key header" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": req.headers["anthropic-version"] || "2023-06-01",
      },
      body: typeof req.body === "string" ? req.body : JSON.stringify(req.body),
    });

    const contentType = response.headers.get("content-type");
    const body = await response.text();

    if (contentType) res.setHeader("Content-Type", contentType);
    res.status(response.status).send(body);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
