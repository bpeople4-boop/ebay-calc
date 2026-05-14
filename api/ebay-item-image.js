export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { itemId, accessToken } = req.query;
  if (!itemId || !accessToken) return res.status(400).json({ error: "missing params" });

  try {
    const r = await fetch(
      `https://api.ebay.com/buy/browse/v1/item/v1|${itemId}|0?fieldgroups=COMPACT`,
      { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
    );
    const data = await r.json();
    const imageUrl = data.image?.imageUrl || data.thumbnailImages?.[0]?.imageUrl || "";
    res.status(200).json({ imageUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
