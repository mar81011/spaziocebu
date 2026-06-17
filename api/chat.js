import { handleChatRequest } from "./_lib/geminiChat.js";

export { handleChatRequest };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ error: "Invalid JSON body" });
      return;
    }
  }

  try {
    const result = await handleChatRequest(body ?? {}, process.env);
    if (!result.ok) {
      res.status(result.error?.includes("not configured") ? 503 : 400).json({ error: result.error });
      return;
    }
    res.status(200).json(result);
  } catch (err) {
    console.error("Chat handler error:", err);
    res.status(500).json({ error: "Chat service unavailable" });
  }
}
