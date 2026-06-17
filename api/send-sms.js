/** Vercel serverless — proxies SMS to Semaphore (optional, for paid SMS alerts). */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let data = req.body;
  if (typeof data === "string") {
    data = Object.fromEntries(new URLSearchParams(data));
  }

  const { apikey, number, message, sendername = "Spazio" } = data ?? {};

  if (!apikey || !number || !message) {
    res.status(400).json({ error: "Missing apikey, number, or message" });
    return;
  }

  const body = new URLSearchParams({ apikey, number, message, sendername });
  const response = await fetch("https://api.semaphore.co/api/v4/messages", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await response.text();
  res.status(response.status).send(text);
}
