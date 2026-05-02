export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  const { apiChoice, loc, seg, limit } = req.body;
  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  const SCRAPEDO_TOKEN = process.env.SCRAPEDO_TOKEN;

  try {
    let results = [];
    if (apiChoice === 'apify') {
      const start = await fetch(`https://api.apify.com/v2/acts/apify~google-maps-scraper/runs?token=${APIFY_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries: [`${seg} em ${loc}`], maxQueries: 1, limitPerQuery: parseInt(limit) })
      });
      const startData = await start.json();
      if (!startData?.data?.id) throw new Error('Token Apify Inválido ou Saldo Esgotado');

      // Poll simplificado para evitar timeout na Vercel
      let status = 'RUNNING';
      let runId = startData.data.id;
      for (let i = 0; i < 5; i++) { // Tenta por 15 segundos
        await new Promise(r => setTimeout(r, 3000));
        const check = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
        const checkData = await check.json();
        if (checkData?.data?.status === 'SUCCEEDED') {
          const dsRes = await fetch(`https://api.apify.com/v2/datasets/${checkData.data.defaultDatasetId}/items?token=${APIFY_TOKEN}`);
          results = await dsRes.json();
          break;
        }
      }
    } else {
      // SCRAPE.DO - Google Search API
      const q = encodeURIComponent(`${seg} em ${loc}`);
      const response = await fetch(`https://api.scrape.do/google?token=${SCRAPEDO_TOKEN}&q=${q}`);
      const data = await response.json();
      results = (data.organic_results || []).slice(0, limit);
    }

    // PADRONIZAÇÃO FINAL (Garante que o site entenda ambos)
    const formatted = results.map(i => ({
      name: i.title || i.name || 'Sem nome',
      address: i.address || i.snippet || 'Localização não informada',
      phone: i.phone || i.phoneNumber || '',
      website: i.website || i.link || ''
    }));

    return res.status(200).json({ results: formatted });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
