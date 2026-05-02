export default async function handler(req, res) {
  const { loc, seg, limit, apiChoice } = req.body;

  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  const SCRAPEDO_TOKEN = process.env.SCRAPEDO_TOKEN;

  try {
    if (apiChoice === 'apify') {
      // Chamada para Apify
      const response = await fetch(`https://api.apify.com/v2/acts/apify~google-maps-scraper/runs?token=${APIFY_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries: [`${seg} em ${loc}`],
          limitPerQuery: parseInt(limit),
          maxQueries: 1
        })
      });
      const data = await response.json();
      return res.status(200).json({ results: data }); // Nota: Aqui você ajustaria o retorno conforme o padrão do Apify
    } else {
      // Chamada para Scrape.do
      const targetUrl = encodeURIComponent(`https://www.google.com/search?q=${seg}+em+${loc}`);
      const response = await fetch(`https://api.scrape.do?token=${SCRAPEDO_TOKEN}&url=${targetUrl}`);
      const html = await response.text();
      return res.status(200).json({ html: html }); // Scrape.do retorna HTML, precisaria processar
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
