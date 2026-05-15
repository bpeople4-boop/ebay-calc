export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { itemId, accessToken } = req.query;
  if (!itemId) return res.status(400).json({ error: "missing itemId" });
  if (!accessToken) return res.status(400).json({ error: "missing accessToken" });

  const appId = process.env.EBAY_APP_ID;
  if (!appId) return res.status(500).json({ error: "EBAY_APP_ID not set" });

  try {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${accessToken}</eBayAuthToken>
  </RequesterCredentials>
  <ItemID>${itemId}</ItemID>
  <DetailLevel>ItemReturnDescription</DetailLevel>
  <IncludeItemSpecifics>false</IncludeItemSpecifics>
</GetItemRequest>`;

    const r = await fetch("https://api.ebay.com/ws/api.dll", {
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
        "X-EBAY-API-CALL-NAME": "GetItem",
        "X-EBAY-API-APP-NAME": appId,
        "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
        "X-EBAY-API-SITEID": "0",
      },
      body: xml,
    });

    const text = await r.text();
    const match = text.match(/<GalleryURL>(.*?)<\/GalleryURL>/);
    const imageUrl = match ? match[1] : "";
    res.status(200).json({ imageUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
