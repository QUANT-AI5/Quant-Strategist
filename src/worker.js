const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (url.pathname !== "/api/chat") {
      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }
      return new Response("Not Found", { status: 404 });
    }
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }
    const body = await request.json();
    const baseMessages = Array.isArray(body.messages) ? body.messages : [];
    const envPrompt = typeof env.SYSTEM_PROMPT === "string" ? env.SYSTEM_PROMPT.trim() : "";
    const kvPrompt = env.PROMPT_KV ? await env.PROMPT_KV.get("system_prompt") : null;
    const systemPrompt = typeof kvPrompt === "string" && kvPrompt.trim() ? kvPrompt.trim() : envPrompt;
    const messages = systemPrompt ? [{ role: "system", content: systemPrompt }, ...baseMessages] : baseMessages;
    const upstream = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: body.model || "grok-4-1-fast-reasoning",  
        messages,
        stream: true,
        temperature: typeof body.temperature === "number" ? body.temperature : 1,
      }),
    });
    const headers = new Headers(upstream.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  },
};
