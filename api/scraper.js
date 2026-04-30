export default async function handler(req, res) {
  const APIFY_KEY = process.env.APIFY_KEY;

  try {
    const { cat, city, bairro, limit } = req.body;

    const locationQuery = bairro
      ? `${bairro}, ${city}, Brasil`
      : `${city}, Brasil`;

    // 1. Inicia o run
    const start = await fetch(
      `https://api.apify.com/v2/acts/compass~crawler-google-places/runs?token=${APIFY_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchStringsArray: [cat],
          locationQuery,
          maxCrawledPlacesPerSearch: limit
        })
      }
    );

    const startData = await start.json();

    if (!startData?.data?.id) {
      return res.status(500).json({ error: 'Erro ao iniciar busca' });
    }

    const runId = startData.data.id;

    // 2. Aguarda finalizar (poll interno)
    let status = 'RUNNING';
    let attempts = 0;

    while (status === 'RUNNING' || status === 'READY') {
      await new Promise(r => setTimeout(r, 2000));
      attempts++;

      if (attempts > 30) {
        return res.status(500).json({ error: 'Timeout na busca' });
      }

      const check = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_KEY}`
      );

      const checkData = await check.json();
      status = checkData?.data?.status;

      if (status === 'SUCCEEDED') {
        const datasetId = checkData.data.defaultDatasetId;

        const itemsRes = await fetch(
          `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_KEY}`
        );

        const items = await itemsRes.json();

        return res.status(200).json({ results: items });
      }

      if (status === 'FAILED') {
        return res.status(500).json({ error: 'Busca falhou' });
      }
    }

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
