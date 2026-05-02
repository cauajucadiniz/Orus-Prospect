export default async function handler(req, res) {
  // Captura os dados vindos do app.html
  const { apiChoice, loc, seg, limit } = req.body;
  
  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  const SCRAPEDO_TOKEN = process.env.SCRAPEDO_TOKEN;

  try {
    if (apiChoice === 'apify') {
      // 1. Inicia a busca no Google Maps via Apify
      const startRun = await fetch(
        `https://api.apify.com/v2/acts/compass~crawler-google-places/runs?token=${APIFY_TOKEN}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            searchStringsArray: [seg],
            locationQuery: `${loc}, Brasil`,
            maxCrawledPlacesPerSearch: parseInt(limit)
          })
        }
      );

      const runInfo = await startRun.json();
      if (!runInfo?.data?.id) throw new Error('Falha ao iniciar Apify');

      const runId = runInfo.data.id;

      // 2. Loop de espera (Poll) - Aguarda até 30 segundos
      let status = 'RUNNING';
      let attempts = 0;
      while ((status === 'RUNNING' || status === 'READY') && attempts < 15) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Espera 2 seg
        const check = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
        const checkData = await check.json();
        status = checkData?.data?.status;
        attempts++;

        if (status === 'SUCCEEDED') {
          const datasetId = checkData.data.defaultDatasetId;
          const itemsRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`);
          const results = await itemsRes.json();
          
          // Formata os resultados para o padrão do seu CRM
          const formatted = results.map(item => ({
            name: item.title || item.name,
            address: item.address || item.fullAddress,
            phone: item.phone || item.phoneNumber || '',
            website: item.website || item.url || ''
          }));

          return res.status(200).json({ results: formatted });
        }
      }
      throw new Error('A busca demorou muito. Tente novamente.');

    } else {
      // LOGICA PARA SCRAPE.DO (Google Search API)
      const query = encodeURIComponent(`${seg} em ${loc}`);
      const response = await fetch(`https://api.scrape.do/google?token=${SCRAPEDO_TOKEN}&q=${query}`);
      const data = await response.json();

      // Scrape.do retorna num formato diferente (Organic Results)
      const results = (data.organic_results || []).slice(0, limit).map(item => ({
        name: item.title,
        address: item.description || 'Veja no site',
        phone: '', // Google Search comum raramente traz o telefone limpo no HTML
        website: item.link
      }));

      return res.status(200).json({ results });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
