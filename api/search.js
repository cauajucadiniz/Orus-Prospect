export default async function handler(req, res) {
  // Se não for POST, ignora
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { apiChoice, loc, seg, limit } = req.body;
  
  // Pega os tokens da Vercel
  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  const SCRAPEDO_TOKEN = process.env.SCRAPEDO_TOKEN;

  try {
    if (apiChoice === 'apify') {
      // 1. Inicia a busca (Google Maps Scraper da Apify)
      const start = await fetch(`https://api.apify.com/v2/acts/apify~google-maps-scraper/runs?token=${APIFY_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries: [`${seg} em ${loc}`],
          maxQueries: 1,
          limitPerQuery: parseInt(limit) || 5
        })
      });

      const startData = await start.json();
      const runId = startData?.data?.id;
      if (!runId) throw new Error('Falha ao iniciar Apify. Verifique o Token.');

      // 2. Aguarda o resultado (Poll)
      let status = 'RUNNING';
      let items = [];
      let attempts = 0;

      while (status !== 'SUCCEEDED' && attempts < 10) {
        await new Promise(r => setTimeout(r, 3000)); // Espera 3 segundos
        const check = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
        const checkData = await check.json();
        status = checkData?.data?.status;
        attempts++;

        if (status === 'SUCCEEDED') {
          const dsId = checkData.data.defaultDatasetId;
          const dsRes = await fetch(`https://api.apify.com/v2/datasets/${dsId}/items?token=${APIFY_TOKEN}`);
          items = await dsRes.json();
        }
        if (status === 'FAILED' || status === 'ABORTED') throw new Error('A busca no Apify falhou.');
      }

      // Formata para o seu CRM
      const results = items.map(i => ({
        name: i.title || i.name || 'Sem nome',
        address: i.address || i.fullAddress || 'Endereço não disponível',
        phone: i.phone || i.phoneNumber || '',
        website: i.website || i.url || ''
      }));

      return res.status(200).json({ results });

    } else {
      // Lógica Scrape.do (Google Search)
      const q = encodeURIComponent(`${seg} em ${loc}`);
      const response = await fetch(`https://api.scrape.do/google?token=${SCRAPEDO_TOKEN}&q=${q}`);
      const data = await response.json();

      const results = (data.organic_results || []).slice(0, limit).map(i => ({
        name: i.title,
        address: i.description || 'Ver no site',
        phone: '',
        website: i.link
      }));

      return res.status(200).json({ results });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
