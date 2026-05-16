export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { itemId, accessToken } = req.query;
  if (!itemId) return res.status(400).json({ error: "missing itemId" });
  if (!accessToken) return res.status(400).json({ error: "missing accessToken" });

  try {
    const r = await fetch(`https://api.ebay.com/buy/browse/v1/item/v1|${itemId}|0`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        "Content-Type": "application/json",
      },
    });
    const data = await r.json();
    res.status(200).json({ imageUrl: data.image?.imageUrl || "", debug: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
