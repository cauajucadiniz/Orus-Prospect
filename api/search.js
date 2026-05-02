export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Apenas POST' });
  const { apiChoice, loc, seg, limit } = req.body;
  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  const SCRAPEDO_TOKEN = process.env.SCRAPEDO_TOKEN;

  try {
    if (apiChoice === 'apify') {
      // INICIA O ROBÔ (Não espera o fim, apenas pega o ID da corrida)
      const response = await fetch(`https://api.apify.com/v2/acts/apify~google-maps-scraper/runs?token=${APIFY_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries: [`${seg} em ${loc}`],
          limitPerQuery: parseInt(limit) || 5,
          maxQueries: 1
        })
      });
      const data = await response.json();
      return res.status(200).json({ runId: data.data.id, type: 'apify' });

    } else {
      // SCRAPE.DO - Google Search API (Geralmente rápida o suficiente)
      const query = encodeURIComponent(`${seg} em ${loc}`);
      const response = await fetch(`https://api.scrape.do/google?token=${SCRAPEDO_TOKEN}&q=${query}`);
      const data = await response.json();
      
      const results = (data.organic_results || []).slice(0, limit).map(i => ({
        name: i.title,
        address: i.snippet || 'Localização no site',
        phone: '', 
        website: i.link
      }));
      return res.status(200).json({ results, type: 'direct' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
