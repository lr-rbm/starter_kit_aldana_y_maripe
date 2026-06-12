// Server-side proxy for Open Notify, which is http-only and can't be read
// directly from an https page. This runs on Vercel (https) and fetches the
// data over http server-to-server, so the browser only ever talks https.
export default async function handler(req, res) {
  try {
    const upstream = await fetch("http://api.open-notify.org/astros.json");
    if (!upstream.ok) {
      res.status(502).json({ error: "upstream error" });
      return;
    }
    const data = await upstream.json();
    // cache at the edge for an hour — the crew rarely changes
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).json(data);
  } catch (_) {
    res.status(502).json({ error: "unreachable" });
  }
}
