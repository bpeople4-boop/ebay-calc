export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  
  const { url, accessToken } = req.body;
  
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
    },
  });
  
  const data = await response.json();
  res.status(response.status).json(data);
}
