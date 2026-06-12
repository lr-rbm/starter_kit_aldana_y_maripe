// Server-side proxy for NASA's APOD API. Keeps the API key off the client
// (set NASA_API_KEY in Vercel; falls back to DEMO_KEY for local/demo use) and
// gives the browser a clean, same-origin https endpoint.
//
// Query params it accepts, all optional:
//   ?date=YYYY-MM-DD  -> a specific day
//   ?random=1         -> a random day from the archive
// With neither, APOD returns today.
export default async function handler(req, res) {
  const key = process.env.NASA_API_KEY || "DEMO_KEY";
  const { date, random } = req.query;

  const url = new URL("https://api.nasa.gov/planetary/apod");
  url.searchParams.set("api_key", key);
  url.searchParams.set("thumbs", "true"); // give us a thumbnail when the day is a video
  if (random) {
    url.searchParams.set("count", "1"); // NASA returns an array of 1 random entry
  } else if (date) {
    url.searchParams.set("date", date);
  }

  // NASA's APOD endpoint has occasional transient hiccups (especially the
  // count=1 random path), so retry once. Each attempt is capped with a timeout
  // so a hung upstream can never make this function hang.
  async function fetchUpstream(attempts = 2) {
    for (let i = 0; i < attempts; i++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      try {
        const r = await fetch(url.toString(), { signal: ctrl.signal });
        if (r.ok) return r;
      } catch (_) {
        // timeout or network blip — fall through to retry
      } finally {
        clearTimeout(timer);
      }
      if (i < attempts - 1) await new Promise((ok) => setTimeout(ok, 300));
    }
    return null;
  }

  try {
    const upstream = await fetchUpstream();
    if (!upstream) {
      res.status(502).json({ error: "upstream error" });
      return;
    }
    let data = await upstream.json();
    if (Array.isArray(data)) data = data[0]; // unwrap the random-count array

    if (random) {
      // Never cache random — caching it would serve the same day on every roll.
      res.setHeader("Cache-Control", "no-store");
    } else {
      // A specific day rarely changes; today's entry can update, so cache shorter.
      const maxAge = date ? 86400 : 1800;
      res.setHeader("Cache-Control", `s-maxage=${maxAge}, stale-while-revalidate=86400`);
    }
    res.status(200).json(data);
  } catch (_) {
    res.status(502).json({ error: "unreachable" });
  }
}
