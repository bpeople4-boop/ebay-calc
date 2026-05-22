export default {
  async fetch(request) {
    if (request.method === "GET") {
      return Response.json({ ok: true, route: "/api/claude" });
    }

    if (request.method !== "POST") {
      return new Response(null, { status: 405 });
    }

    const apiKey = request.headers.get("x-api-key");
    if (!apiKey) {
      return Response.json({ error: "Missing x-api-key header" }, { status: 400 });
    }

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": request.headers.get("content-type") || "application/json",
          "x-api-key": apiKey,
          "anthropic-version": request.headers.get("anthropic-version") || "2023-06-01",
        },
        body: await request.text(),
      });

      const headers = new Headers();
      const contentType = response.headers.get("content-type");
      if (contentType) headers.set("Content-Type", contentType);

      return new Response(await response.text(), {
        status: response.status,
        headers,
      });
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500 });
    }
  },
};
