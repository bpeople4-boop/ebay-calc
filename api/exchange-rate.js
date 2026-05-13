export default async function handler(req, res) {
  const { date } = req.query;
  const url = date
    ? `https://api.frankfurter.app/${date}?from=USD&to=JPY`
    : `https://api.frankfurter.app/latest?from=USD&to=JPY`;
  try {
    const r = await fetch(url);
    const data = await r.json();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json(data);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
