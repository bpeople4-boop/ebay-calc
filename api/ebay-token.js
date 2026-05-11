export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  
  const { code, clientId, clientSecret, ruName, grantType, refreshToken } = req.body;
  
  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = grantType === "refresh_token"
    ? new URLSearchParams({ grant_type:"refresh_token", refresh_token:refreshToken, scope:"https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly https://api.ebay.com/oauth/api_scope/sell.finances https://api.ebay.com/oauth/api_scope/sell.inventory.readonly" })
    : new URLSearchParams({ grant_type:"authorization_code", code, redirect_uri:ruName });

  const response = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: { "Authorization":`Basic ${creds}`, "Content-Type":"application/x-www-form-urlencoded" },
    body,
  });
  
  const data = await response.json();
  res.status(response.status).json(data);
}
