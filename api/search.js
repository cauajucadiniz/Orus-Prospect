export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Apenas POST' });
  const { apiChoice, loc, seg, limit } = req.body;
  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  const SCRAPEDO_TOKEN = process.env.SCRAPEDO_TOKEN;

  try {
    let results = [];
    if (apiChoice === 'apify') {
      const response = await fetch(`https://api.apify.com/v2/acts/apify~google-maps-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries: [`${seg} em ${loc}`], maxQueries: 1, limitPerQuery: parseInt(limit) || 5 })
      });
      results = await response.json();
    } else {
      const q = encodeURIComponent(`${seg} em ${loc}`);
      const response = await fetch(`https://api.scrape.do/google?token=${SCRAPEDO_TOKEN}&q=${q}`);
      const data = await response.json();
      results = (data.organic_results || []).slice(0, limit);
    }

    const formatted = results.map(i => ({
      name: i.title || i.name || 'Sem nome',
      address: i.address || i.snippet || 'Localização não informada',
      phone: i.phone || i.phoneNumber || '',
      website: i.website || i.url || ''
    }));

    return res.status(200).json({ results: formatted });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
