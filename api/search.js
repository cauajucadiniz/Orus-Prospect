export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Apenas POST' });

  const { apiChoice, loc, seg, limit } = req.body;
  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  const SCRAPEDO_TOKEN = process.env.SCRAPEDO_TOKEN;

  if (!APIFY_TOKEN || !SCRAPEDO_TOKEN) {
    return res.status(500).json({ error: "Tokens não configurados na Vercel." });
  }

  try {
    let rawResults = [];

    if (apiChoice === 'apify') {
      // Método "Run and Wait" (mais rápido e estável para Vercel)
      const response = await fetch(
        `https://api.apify.com/v2/acts/apify~google-maps-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queries: [`${seg} em ${loc}`],
            maxQueries: 1,
            limitPerQuery: parseInt(limit) || 5,
            zoom: 12
          })
        }
      );

      if (!response.ok) throw new Error("Apify recusou a busca. Verifique saldo/token.");
      rawResults = await response.json();

    } else {
      // Scrape.do (Google Search)
      const target = encodeURIComponent(`${seg} em ${loc}`);
      const response = await fetch(`https://api.scrape.do/google?token=${SCRAPEDO_TOKEN}&q=${target}`);
      const data = await response.json();
      rawResults = data.organic_results || [];
    }

    // Padronização absoluta (Garante que o app.html sempre receba os mesmos nomes)
    const finalData = rawResults.slice(0, limit).map(i => ({
      name: i.title || i.name || "Empresa sem nome",
      address: i.address || i.snippet || i.fullAddress || "Endereço indisponível",
      phone: i.phone || i.phoneNumber || "",
      website: i.website || i.url || i.link || ""
    }));

    return res.status(200).json({ results: finalData });

  } catch (error) {
    console.error("Erro no Servidor:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
