export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  const { apiChoice, loc, seg, limit } = req.body;
  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  const SCRAPEDO_TOKEN = process.env.SCRAPEDO_TOKEN;

  try {
    if (apiChoice === 'apify') {
      const start = await fetch(`https://api.apify.com/v2/acts/apify~google-maps-scraper/runs?token=${APIFY_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries: [`${seg} em ${loc}`], maxQueries: 1, limitPerQuery: parseInt(limit) })
      });
      const startData = await start.json();
      const runId = startData?.data?.id;
      if (!runId) throw new Error('Falha no Apify');

      let status = 'RUNNING';
      let items = [];
      while (status !== 'SUCCEEDED') {
        await new Promise(r => setTimeout(r, 3000));
        const check = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
        const checkData = await check.json();
        status = checkData?.data?.status;
        if (status === 'SUCCEEDED') {
          const dsRes = await fetch(`https://api.apify.com/v2/datasets/${checkData.data.defaultDatasetId}/items?token=${APIFY_TOKEN}`);
          items = await dsRes.json();
        }
        if (status === 'FAILED' || status === 'ABORTED') throw new Error('Apify falhou');
      }
      const results = items.map(i => ({
        name: i.title || i.name, address: i.address || i.fullAddress, phone: i.phone || i.phoneNumber || '', website: i.website || i.url || ''
      }));
      return res.status(200).json({ results });

    } else {
      // AJUSTE SCRAPE.DO: Garantindo que o formato de saída seja IGUAL ao Apify
      const q = encodeURIComponent(`${seg} em ${loc}`);
      const response = await fetch(`https://api.scrape.do/google?token=${SCRAPEDO_TOKEN}&q=${q}`);
      const data = await response.json();
      const results = (data.organic_results || []).slice(0, limit).map(i => ({
        name: i.title,
        address: i.snippet || 'Localização via site',
        phone: '', // Google Search não traz telefone fácil
        website: i.link
      }));
      return res.status(200).json({ results });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
