export default async function handler(req, res) {
  const APIFY_KEY = process.env.APIFY_KEY;

  const { cat, city, bairro, limit } = req.body;

  try {
    const response = await fetch(
      `https://api.apify.com/v2/acts/compass~crawler-google-places/runs?token=${APIFY_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchStringsArray: [cat],
          locationQuery: bairro
            ? `${bairro}, ${city}, Brasil`
            : `${city}, Brasil`,
          maxCrawledPlacesPerSearch: limit
        })
      }
    );

    const data = await response.json();

    res.status(200).json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
