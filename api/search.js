export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { apiChoice, loc, seg, limit } = req.body;
  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  const SCRAPEDO_TOKEN = process.env.SCRAPEDO_TOKEN;

  try {
    let results = [];

    if (apiChoice === 'apify') {
      // Usando o endpoint de execução rápida do Apify
      const response = await fetch(
        `https://api.apify.com/v2/acts/apify~google-maps-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=60`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queries: [`${seg} em ${loc}`],
            maxQueries: 1,
            limitPerQuery: parseInt(limit) || 5,
          })
        }
      );

      if (!response.ok) throw new Error("Apify demorou muito ou Token inválido");
      results = await response.json();

    } else {
      // Scrape.do - Busca via Google Search
      const query = encodeURIComponent(`${seg} em ${loc}`);
      const response = await fetch(`https://api.scrape.do/google?token=${SCRAPEDO_TOKEN}&q=${query}`);
      const data = await response.json();
      results = data.organic_results || [];
    }

    // PADRONIZAÇÃO: Garante que os dados cheguem com os nomes certos no app.html
    const formatted = results.map(i => ({
      name: i.title || i.name || "Empresa sem nome",
      address: i.address || i.snippet || i.fullAddress || "Endereço indisponível",
      phone: i.phone || i.phoneNumber || "",
      website: i.website || i.url || i.link || ""
    }));

    return res.status(200).json({ results: formatted });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
