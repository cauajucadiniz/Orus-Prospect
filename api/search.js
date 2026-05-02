export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { apiChoice, loc, seg, limit } = req.body;
  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  const SCRAPEDO_TOKEN = process.env.SCRAPEDO_TOKEN;

  if (!APIFY_TOKEN) return res.status(500).json({ error: 'Token Apify não configurado na Vercel' });

  try {
    if (apiChoice === 'apify') {
      const start = await fetch(`https://api.apify.com/v2/acts/compass~crawler-google-places/runs?token=${APIFY_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchStringsArray: [seg],
          locationQuery: loc,
          maxCrawledPlacesPerSearch: parseInt(limit) || 5
        })
      });

      const startData = await start.json();
      const runId = startData?.data?.id;
      if (!runId) throw new Error('Erro ao iniciar Apify. Verifique se o Token é válido.');

      let status = 'RUNNING';
      let items = [];
      let attempts = 0;

      while (status !== 'SUCCEEDED' && attempts < 10) {
        await new Promise(r => setTimeout(r, 3000));
        const check = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
        const checkData = await check.json();
        status = checkData?.data?.status;
        attempts++;

        if (status === 'SUCCEEDED') {
          const dsRes = await fetch(`https://api.apify.com/v2/datasets/${checkData.data.defaultDatasetId}/items?token=${APIFY_TOKEN}`);
          items = await dsRes.json();
        }
      }

      const results = items.map(i => ({
        name: i.title || i.name || 'Sem nome',
        address: i.address || i.fullAddress || 'Endereço não disponível',
        phone: i.phone || i.phoneNumber || '',
        website: i.website || i.url || ''
      }));

      return res.status(200).json({ results });
    } else {
      // Scrape.do Simples
      const response = await fetch(`https://api.scrape.do/google?token=${SCRAPEDO_TOKEN}&q=${encodeURIComponent(seg + " em " + loc)}`);
      const data = await response.json();
      const results = (data.organic_results || []).slice(0, limit).map(i => ({
        name: i.title, address: 'Ver no site', phone: '', website: i.link
      }));
      return res.status(200).json({ results });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
