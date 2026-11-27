import { eqaAnswer } from "./eqa";
import { homePage } from "./home";

export interface Env {
  API_KEY?: string;
  EMBED_DIM?: string;
}

export const MODELS = [
  { id: "fake-chat", type: "chat", behaviour: "Fixed answer that echoes the last user message; minimal answers to Explore EQA prompts (graph questions)" },
  { id: "fake-embed", type: "embedding", behaviour: "Deterministic unit vector per input (same input, same vector)" },
  { id: "fake-reject", type: "chat / embedding", behaviour: "Always returns 404 model_not_found" },
  { id: "fake-slow", type: "chat", behaviour: "Like fake-chat, but answers after about 5 seconds" },
];

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, api-key, x-api-key",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { "content-type": "application/json", ...CORS } });
const err = (status: number, message: string, code: string, type = "invalid_request_error") =>
  json({ error: { message, type, param: null, code } }, status);
const tokens = (s: string) => Math.max(1, Math.ceil(s.length / 4));
const id = (p: string) => `${p}-${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
const now = () => Math.floor(Date.now() / 1000);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Prefer Bearer credentials, then the dedicated API key headers.
function sentKey(req: Request) {
  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  return bearer || req.headers.get("api-key") || req.headers.get("x-api-key") || "";
}

function sameKey(a: string, b: string) {
  const enc = new TextEncoder();
  const x = enc.encode(a), y = enc.encode(b);
  if (x.byteLength !== y.byteLength) return false;
  return crypto.subtle.timingSafeEqual(x, y);
}

// Returns an error response when the request may not use the API, otherwise null.
function checkAuth(req: Request, env: Env) {
  if (!env.API_KEY)
    return err(500, "API_KEY is not configured on the server", "server_misconfigured", "server_error");
  const key = sentKey(req);
  if (!key) return err(401, "Missing API key", "missing_api_key", "authentication_error");
  if (!sameKey(key, env.API_KEY)) return err(401, "Invalid API key", "invalid_api_key", "authentication_error");
  return null;
}

function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((p: any) => p?.text ?? "").join(" ").trim();
  return "";
}

function lastUserText(messages: any[] = []) {
  const m = [...messages].reverse().find((x) => x?.role === "user");
  return m ? textOf(m.content) : "";
}

const rejected = (model: string) =>
  model.endsWith("fake-reject") ? err(404, `The model '${model}' does not exist`, "model_not_found") : null;

// ---- POST /v1/chat/completions ----
async function chat(body: any, model: string) {
  const bad = rejected(model);
  if (bad) return bad;
  if (model.endsWith("fake-slow")) await sleep(5000);

  const q = lastUserText(body.messages);
  const answer = eqaAnswer(body.messages) ?? `[fake-llm] This is a fake answer to: "${q.slice(0, 200)}"`;
  const pt = tokens(JSON.stringify(body.messages ?? "")), ct = tokens(answer);
  const usage = { prompt_tokens: pt, completion_tokens: ct, total_tokens: pt + ct };
  const cid = id("chatcmpl"), created = now();

  if (!body.stream) {
    return json({
      id: cid, object: "chat.completion", created, model,
      choices: [{ index: 0, message: { role: "assistant", content: answer }, logprobs: null, finish_reason: "stop" }],
      usage,
    });
  }

  const enc = new TextEncoder();
  const sse = (obj: unknown) => enc.encode(`data: ${JSON.stringify(obj)}\n\n`);
  const chunk = (delta: unknown, finish: string | null = null) =>
    sse({ id: cid, object: "chat.completion.chunk", created, model,
          choices: [{ index: 0, delta, logprobs: null, finish_reason: finish }] });

  const stream = new ReadableStream({
    async start(c) {
      c.enqueue(chunk({ role: "assistant", content: "" }));
      for (const w of answer.split(/(?<=\s)/)) {
        c.enqueue(chunk({ content: w }));
        await sleep(20);
      }
      c.enqueue(chunk({}, "stop"));
      if (body.stream_options?.include_usage)
        c.enqueue(sse({ id: cid, object: "chat.completion.chunk", created, model, choices: [], usage }));
      c.enqueue(enc.encode("data: [DONE]\n\n"));
      c.close();
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache", ...CORS },
  });
}

// ---- POST /v1/embeddings ----
async function embedOne(text: string, dim: number) {
  const seed = new Uint32Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  let s = seed[0] || 1;
  const v = new Float32Array(dim);
  let norm = 0;
  for (let i = 0; i < dim; i++) {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5; // xorshift32
    v[i] = ((s >>> 0) / 0xffffffff) * 2 - 1;
    norm += v[i] * v[i];
  }
  norm = Math.sqrt(norm);
  for (let i = 0; i < dim; i++) v[i] /= norm;
  return v;
}

function toBase64(bytes: Uint8Array) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function embeddings(body: any, model: string, env: Env) {
  const bad = rejected(model);
  if (bad) return bad;
  const dim = Number(body.dimensions ?? env.EMBED_DIM ?? 1536);
  if (!Number.isInteger(dim) || dim < 1 || dim > 8192)
    return err(400, "dimensions must be an integer between 1 and 8192", "invalid_dimensions");
  const raw = body.input ?? "";
  const inputs: string[] = Array.isArray(raw)
    ? raw.map((x: unknown) => (Array.isArray(x) ? x.join(" ") : String(x)))
    : [String(raw)];

  const data = await Promise.all(inputs.map(async (t, index) => {
    const v = await embedOne(t, dim);
    const embedding = body.encoding_format === "base64" ? toBase64(new Uint8Array(v.buffer)) : Array.from(v);
    return { object: "embedding", index, embedding };
  }));
  const pt = inputs.reduce((n, t) => n + tokens(t), 0);
  return json({ object: "list", data, model, usage: { prompt_tokens: pt, total_tokens: pt } });
}

// ---- POST /v1/responses ----
async function responses(body: any, model: string) {
  const bad = rejected(model);
  if (bad) return bad;
  if (model.endsWith("fake-slow")) await sleep(5000);
  const q = typeof body.input === "string" ? body.input : lastUserText(body.input);
  const text = `[fake-llm] This is a fake answer to: "${String(q).slice(0, 200)}"`;
  const it = tokens(String(q)), ot = tokens(text);
  return json({
    id: id("resp"), object: "response", created_at: now(), status: "completed", model,
    output: [{
      type: "message", id: id("msg"), role: "assistant", status: "completed",
      content: [{ type: "output_text", text, annotations: [] }],
    }],
    output_text: text,
    usage: { input_tokens: it, output_tokens: ot, total_tokens: it + ot },
  });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, "");

    // Browsers send CORS preflight without credentials.
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (req.method === "GET" && path === "")
      return new Response(homePage(url.origin, MODELS, env), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    if (req.method === "GET" && path === "/health") return json({ ok: true });

    // Everything else needs the API key.
    const denied = checkAuth(req, env);
    if (denied) return denied;

    if (req.method === "GET" && path.endsWith("/models"))
      return json({
        object: "list",
        data: MODELS.map((m) => ({ id: m.id, object: "model", created: 0, owned_by: "fake-llm" })),
      });

    const known = ["/chat/completions", "/embeddings", "/responses"].some((p) => path.endsWith(p));
    if (!known) return err(404, `Unknown path ${url.pathname}`, "not_found");
    if (req.method !== "POST") return err(405, `Method ${req.method} not allowed`, "method_not_allowed");

    const body: any = await req.json().catch(() => ({}));
    // Azure style: /openai/deployments/<name>/... carries the model in the URL
    const deployment = path.match(/\/deployments\/([^/]+)\//)?.[1];
    const fallback = path.endsWith("/embeddings") ? "fake-embed" : "fake-chat";
    const model = String(body.model ?? (deployment ? decodeURIComponent(deployment) : fallback));

    if (path.endsWith("/chat/completions")) return chat(body, model);
    if (path.endsWith("/embeddings")) return embeddings(body, model, env);
    return responses(body, model);
  },
};
