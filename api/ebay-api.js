export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { url, accessToken, method = "GET", headers = {}, body } = req.body;
    const response = await fetch(url, {
      method,
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        ...headers,
      },
      ...(body ? { body } : {}),
    });
    const contentType = response.headers.get("content-type") || "";
    const isXml = contentType.includes("text/xml") || contentType.includes("application/xml");
    const data = isXml ? await response.text() : await response.json();
    res.status(response.status).json({ data, contentType });
  } catch(e) {
    res.status(500).json({ error: e.message, stack: e.stack });
  }
}
