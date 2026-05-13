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
    const rawText = await response.text();
    let data;
    if (!rawText) {
      data = { _empty: true, _status: response.status };
    } else if (isXml) {
      data = rawText;
    } else {
      try { data = JSON.parse(rawText); }
      catch(e) { data = { _rawText: rawText, _parseError: e.message }; }
    }
    res.status(response.status).json({ data, contentType, _httpStatus: response.status });
  } catch(e) {
    res.status(500).json({ error: e.message, stack: e.stack });
  }
}
