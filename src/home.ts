type ModelInfo = { id: string; type: string; behaviour: string };

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function homePage(origin: string, models: ModelInfo[], env: { EMBED_DIM?: string }) {
  const o = esc(origin);
  const base = `${o}/v1`;
  const dim = esc(env.EMBED_DIM ?? "1536");
  const auth = `-H "Authorization: Bearer $API_KEY"`;

  const modelRows = models
    .map((m) => `<tr><td><code>${esc(m.id)}</code></td><td>${esc(m.type)}</td><td>${esc(m.behaviour)}</td></tr>`)
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fake LLM API</title>
<style>
:root{--bg:#f7f7f5;--surface:#fff;--text:#1d1d1b;--muted:#5f5f5a;--border:#e2e1dc;--accent:#c2410c;--code-bg:#f1f0ec;
  --get:#15803d;--post:#1d4ed8;--warn:#b45309;--warn-soft:#fef6e7}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#161614;--surface:#1f1f1c;--text:#ecebe6;--muted:#a3a29b;
  --border:#34332f;--accent:#fb923c;--code-bg:#262522;--get:#4ade80;--post:#93c5fd;--warn:#fbbf24;--warn-soft:#2a2213}}
:root[data-theme="dark"]{--bg:#161614;--surface:#1f1f1c;--text:#ecebe6;--muted:#a3a29b;--border:#34332f;--accent:#fb923c;
  --code-bg:#262522;--get:#4ade80;--post:#93c5fd;--warn:#fbbf24;--warn-soft:#2a2213}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:960px;margin:0 auto;padding:36px 16px 80px}
h1{font-size:1.9rem;margin:0 0 6px}
h2{font-size:1.3rem;margin:0 0 12px}
h3{font-size:1.05rem;margin:22px 0 8px}
.sub{color:var(--muted);margin:0 0 20px}
details.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;margin:12px 0}
details.card>summary{display:flex;align-items:center;gap:10px;padding:16px 20px;cursor:pointer;list-style:none}
details.card>summary::-webkit-details-marker{display:none}
details.card>summary h2{margin:0}
details.card>summary::after{content:"+";margin-left:auto;color:var(--muted);font-weight:700;font-size:1.3rem;line-height:1}
details.card[open]>summary::after{content:"\\2212"}
details.card>summary:hover h2{color:var(--accent)}
details.card>summary:focus-visible{outline:2px solid var(--accent);outline-offset:-2px;border-radius:12px}
.card-body{padding:0 20px 20px}
code{font-family:ui-monospace,Consolas,"Cascadia Code",monospace;font-size:.88em;background:var(--code-bg);padding:1px 5px;border-radius:4px}
pre{background:var(--code-bg);border:1px solid var(--border);border-radius:8px;padding:14px;overflow-x:auto;font-size:.84rem;line-height:1.5;margin:10px 0}
pre code{background:none;padding:0}
.tbl{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:.92rem;margin:8px 0}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--border);vertical-align:top}
th{color:var(--muted);font-weight:600}
.m{display:inline-block;min-width:48px;text-align:center;font-weight:700;font-size:.78rem;padding:2px 6px;border-radius:4px;border:1px solid currentColor}
.get{color:var(--get)}.post{color:var(--post)}
.hint{color:var(--muted);margin:-4px 0 10px;font-size:.93rem}
details.ep{border:1px solid var(--border);border-radius:8px;margin:8px 0;background:var(--bg)}
details.ep[open]{border-color:var(--accent)}
details.ep>summary{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 12px;cursor:pointer;list-style:none}
details.ep>summary::-webkit-details-marker{display:none}
details.ep>summary::after{content:"+";margin-left:auto;color:var(--muted);font-weight:700;font-size:1.1rem;line-height:1}
details.ep[open]>summary::after{content:"\\2212"}
details.ep>summary:hover{background:var(--code-bg);border-radius:8px}
details.ep>summary:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:8px}
.what{color:var(--muted);font-size:.92rem}
.key{font-size:.72rem;font-weight:600;padding:1px 7px;border-radius:10px;border:1px solid var(--border);color:var(--muted)}
.key.off{border-style:dashed}
details.ep .body{padding:4px 14px 14px;border-top:1px solid var(--border);background:var(--surface);border-radius:0 0 8px 8px}
details.ep .body h3:first-child{margin-top:12px}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin:14px 0 0}
.fact{border:1px solid var(--border);border-radius:8px;padding:10px 12px;background:var(--bg)}
.fact b{display:block;font-size:.8rem;color:var(--muted);font-weight:600}
.fact span{word-break:break-all}
.note{background:var(--warn-soft);border-left:3px solid var(--warn);padding:10px 14px;border-radius:6px;margin:12px 0;font-size:.93rem}
nav{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:.93rem;margin-top:14px}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
@media (max-width:600px){h1{font-size:1.5rem}details.card>summary{padding:14px}.card-body{padding:0 14px 16px}}
</style>
</head>
<body>
<div class="wrap">
  <h1>Fake LLM API</h1>
  <p class="sub">An OpenAI-compatible fake API for testing Explore and LiteLLM without a real model. Answers are well formed but have no real content.</p>

  <div class="facts">
    <div class="fact"><b>Base URL (api_base)</b><span><code>${base}</code></span></div>
    <div class="fact"><b>API key</b><span>Required for model API requests</span></div>
    <div class="fact"><b>Default embedding size</b><span>${dim} dimensions</span></div>
    <div class="fact"><b>Health</b><span><code>GET /health</code> (public)</span></div>
  </div>

  <nav>
    <a href="#endpoints">Endpoints</a><a href="#auth">Authentication</a><a href="#models">Fake models</a>
    <a href="#errors">Errors</a><a href="#clients">Clients</a><a href="#limits">Limits</a>
  </nav>

  <details class="card" id="endpoints">
    <summary><h2>Endpoints</h2></summary>
    <div class="card-body">
    <p class="hint">Click an endpoint to see how to use it.</p>

    <details class="ep" name="endpoint" id="home-page">
      <summary><span class="m get">GET</span><code>/</code><span class="what">This page</span><span class="key off">no key</span></summary>
      <div class="body">
        <p>Serves this documentation as HTML. It is the only endpoint that needs no API key.</p>
      </div>
    </details>

    <details class="ep" name="endpoint" id="health">
      <summary><span class="m get">GET</span><code>/health</code><span class="what">Liveness check</span><span class="key off">public</span></summary>
      <div class="body">
        <p>Returns <code>{"ok":true}</code> when the server is up and the key is right. Use it to check the URL and the key before configuring a client.</p>
<pre><code>curl ${o}/health</code></pre>
<pre><code>{"ok":true}</code></pre>
      </div>
    </details>

    <details class="ep" name="endpoint" id="list-models">
      <summary><span class="m get">GET</span><code>/v1/models</code><span class="what">Lists the fake models</span><span class="key">key</span></summary>
      <div class="body">
        <p>Returns the ids of the <a href="#models">fake models</a> in the OpenAI list format.</p>
<pre><code>curl ${base}/models ${auth}</code></pre>
<pre><code>{
  "object": "list",
  "data": [
    { "id": "fake-chat", "object": "model", "created": 0, "owned_by": "fake-llm" },
    …
  ]
}</code></pre>
      </div>
    </details>

    <details class="ep" name="endpoint" id="chat">
      <summary><span class="m post">POST</span><code>/v1/chat/completions</code><span class="what">Chat</span><span class="key">key</span></summary>
      <div class="body">
        <p>Returns a fixed answer that contains the last user message: <code>[fake-llm] This is a fake answer to: "…"</code> (cut at 200 characters).</p>
        <h3>Body</h3>
        <div class="tbl"><table>
          <tr><th>Field</th><th>Required</th><th>Notes</th></tr>
          <tr><td><code>model</code></td><td>No</td><td>See <a href="#models">fake models</a></td></tr>
          <tr><td><code>messages</code></td><td>Recommended</td><td>Array of <code>{role, content}</code>. <code>content</code> is a string or an array of parts <code>[{type:"text", text}]</code>. The last <code>user</code> message is used</td></tr>
          <tr><td><code>stream</code></td><td>No</td><td><code>true</code> returns SSE, see <a href="#stream">Chat streaming</a></td></tr>
          <tr><td><code>stream_options.include_usage</code></td><td>No</td><td>Adds a usage chunk before <code>[DONE]</code></td></tr>
          <tr><td><code>temperature</code>, <code>top_p</code>, <code>max_tokens</code>, <code>stop</code>, <code>seed</code>, <code>tools</code>, …</td><td>No</td><td>Accepted but <b>ignored</b></td></tr>
        </table></div>
        <h3>Example</h3>
<pre><code>curl ${base}/chat/completions ${auth} \\
  -H "Content-Type: application/json" \\
  -d '{"model":"fake-chat","messages":[{"role":"user","content":"Hello"}]}'</code></pre>
<pre><code>{
  "id": "chatcmpl-1f0c…",
  "object": "chat.completion",
  "created": 1763600000,
  "model": "fake-chat",
  "choices": [{
    "index": 0,
    "message": { "role": "assistant", "content": "[fake-llm] This is a fake answer to: \\"Hello\\"" },
    "logprobs": null,
    "finish_reason": "stop"
  }],
  "usage": { "prompt_tokens": 11, "completion_tokens": 12, "total_tokens": 23 }
}</code></pre>
        <p>Token counts are estimates: <code>ceil(characters / 4)</code>. <code>prompt_tokens</code> is computed over all <code>messages</code> as JSON.</p>
      </div>
    </details>

    <details class="ep" name="endpoint" id="stream">
      <summary><span class="m post">POST</span><code>/v1/chat/completions</code><span class="what">Chat streaming (<code>"stream": true</code>)</span><span class="key">key</span></summary>
      <div class="body">
        <p>With <code>"stream": true</code> the response has <code>Content-Type: text/event-stream</code>. The answer is split into words, about 20 ms apart:</p>
        <ol>
          <li>First chunk: <code>delta: {"role":"assistant","content":""}</code></li>
          <li>One chunk per word: <code>delta: {"content":"word "}</code></li>
          <li>Final chunk: <code>delta: {}</code>, <code>finish_reason: "stop"</code></li>
          <li>With <code>stream_options.include_usage</code>: a chunk with <code>choices: []</code> and <code>usage</code></li>
          <li>Last line: <code>data: [DONE]</code></li>
        </ol>
<pre><code>curl -N ${base}/chat/completions ${auth} \\
  -H "Content-Type: application/json" \\
  -d '{"model":"fake-chat","stream":true,"stream_options":{"include_usage":true},
       "messages":[{"role":"user","content":"stream test"}]}'</code></pre>
<pre><code>data: {"id":"chatcmpl-…","object":"chat.completion.chunk","created":1763600000,"model":"fake-chat","choices":[{"index":0,"delta":{"role":"assistant","content":""},"logprobs":null,"finish_reason":null}]}

data: {"id":"chatcmpl-…","object":"chat.completion.chunk",…,"choices":[{"index":0,"delta":{"content":"[fake-llm] "},…}]}

data: {"id":"chatcmpl-…","object":"chat.completion.chunk",…,"choices":[{"index":0,"delta":{},"logprobs":null,"finish_reason":"stop"}]}

data: {"id":"chatcmpl-…","object":"chat.completion.chunk",…,"choices":[],"usage":{"prompt_tokens":12,"completion_tokens":13,"total_tokens":25}}

data: [DONE]</code></pre>
      </div>
    </details>

    <details class="ep" name="endpoint" id="embeddings">
      <summary><span class="m post">POST</span><code>/v1/embeddings</code><span class="what">Deterministic embeddings</span><span class="key">key</span></summary>
      <div class="body">
        <p>Each input is hashed with SHA-256 to seed an xorshift32 generator, and the vector is normalised to length 1. So <b>the same input always gives the same vector</b> on every server, but distances between vectors carry no meaning.</p>
        <h3>Body</h3>
        <div class="tbl"><table>
          <tr><th>Field</th><th>Required</th><th>Notes</th></tr>
          <tr><td><code>model</code></td><td>No</td><td>Default <code>fake-embed</code></td></tr>
          <tr><td><code>input</code></td><td>Yes</td><td>A string or an array of strings. One vector per item, in order (<code>index</code>)</td></tr>
          <tr><td><code>encoding_format</code></td><td>No</td><td><code>float</code> (default) returns an array of numbers; <code>base64</code> returns little-endian float32 as base64 (the OpenAI SDK asks for this by default)</td></tr>
          <tr><td><code>dimensions</code></td><td>No</td><td>1 to 8192. Default <code>${dim}</code> (variable <code>EMBED_DIM</code>)</td></tr>
        </table></div>
        <h3>Example</h3>
<pre><code>curl ${base}/embeddings ${auth} \\
  -H "Content-Type: application/json" \\
  -d '{"model":"fake-embed","input":["chunk 1","chunk 2"]}'</code></pre>
<pre><code>{
  "object": "list",
  "data": [
    { "object": "embedding", "index": 0, "embedding": [0.0123, -0.0311, …] },
    { "object": "embedding", "index": 1, "embedding": [-0.0207, 0.0044, …] }
  ],
  "model": "fake-embed",
  "usage": { "prompt_tokens": 4, "total_tokens": 4 }
}</code></pre>
        <div class="note">Explore locks an embedding model once a project has ingested documents with it. Do not change <code>EMBED_DIM</code> or the algorithm while a project uses it; add a new model id instead.</div>
      </div>
    </details>

    <details class="ep" name="endpoint" id="responses">
      <summary><span class="m post">POST</span><code>/v1/responses</code><span class="what">OpenAI Responses API</span><span class="key">key</span></summary>
      <div class="body">
        <p>A minimal Responses API for model type <code>response</code>. No streaming. <code>input</code> is a string, or an array of messages like chat (the last <code>user</code> message is used, including <code>input_text</code> parts).</p>
<pre><code>curl ${base}/responses ${auth} \\
  -H "Content-Type: application/json" \\
  -d '{"model":"fake-chat","input":"Summarise this document"}'</code></pre>
<pre><code>{
  "id": "resp-…",
  "object": "response",
  "created_at": 1763600000,
  "status": "completed",
  "model": "fake-chat",
  "output": [{
    "type": "message", "id": "msg-…", "role": "assistant", "status": "completed",
    "content": [{ "type": "output_text", "text": "[fake-llm] This is a fake answer to: \\"Summarise this document\\"", "annotations": [] }]
  }],
  "output_text": "[fake-llm] This is a fake answer to: \\"Summarise this document\\"",
  "usage": { "input_tokens": 6, "output_tokens": 16, "total_tokens": 22 }
}</code></pre>
      </div>
    </details>

    <details class="ep" name="endpoint" id="azure">
      <summary><span class="m post">POST</span><code>/openai/deployments/{name}/…</code><span class="what">Azure-style paths</span><span class="key">key</span></summary>
      <div class="body">
        <p>For clients configured as Azure OpenAI. Two paths are served, with the same body and response as their <code>/v1</code> counterparts:</p>
        <div class="tbl"><table>
          <tr><th>Path</th><th>Same as</th></tr>
          <tr><td><code>/openai/deployments/{name}/chat/completions</code></td><td><a href="#chat">Chat</a> and <a href="#stream">streaming</a></td></tr>
          <tr><td><code>/openai/deployments/{name}/embeddings</code></td><td><a href="#embeddings">Embeddings</a></td></tr>
        </table></div>
        <p>The model is taken from <code>{name}</code> (the deployment name) when the body has no <code>model</code>. The <code>api-version</code> query parameter is accepted and ignored. Azure clients send the key in the <code>api-key</code> header.</p>
<pre><code>curl "${o}/openai/deployments/fake-chat/chat/completions?api-version=2024-10-21" \\
  -H "api-key: $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"messages":[{"role":"user","content":"Hello"}]}'</code></pre>
      </div>
    </details>

    <p>Paths are matched by their ending, so they work with or without the <code>/v1</code> prefix. Every response has the CORS header <code>Access-Control-Allow-Origin: *</code>.</p>
    </div>
  </details>

  <details class="card" id="auth">
    <summary><h2>Authentication</h2></summary>
    <div class="card-body">
    <p>The home page and <code>GET /health</code> are public. Protected requests require the server's <code>API_KEY</code> secret. Send it in one of these headers, listed in priority order.</p>
    <div class="tbl"><table>
      <tr><th>Header</th><th>Used by</th></tr>
      <tr><td><code>Authorization: Bearer &lt;key&gt;</code></td><td>OpenAI SDK; LiteLLM providers <code>openai</code>, <code>openai_like</code>, <code>hosted_vllm</code></td></tr>
      <tr><td><code>api-key: &lt;key&gt;</code></td><td>Azure OpenAI</td></tr>
      <tr><td><code>x-api-key: &lt;key&gt;</code></td><td>Anthropic-style clients and API gateways</td></tr>
    </table></div>
    <p>A missing key returns <code>401 missing_api_key</code>, a wrong key <code>401 invalid_api_key</code>. CORS preflight (<code>OPTIONS</code>) needs no key. The examples read the key from the shell variable <code>$API_KEY</code>.</p>
    </div>
  </details>

  <details class="card" id="models">
    <summary><h2>Fake models</h2></summary>
    <div class="card-body">
    <p>Use these as the <code>model</code> value in the request body, or as the <code>base_model</code> in Explore. Models are matched by their ending, so <code>openai/fake-reject</code> is rejected too. Unknown model ids are accepted and behave like <code>fake-chat</code>. Without a <code>model</code>, the default is <code>fake-chat</code> (chat, responses) or <code>fake-embed</code> (embeddings).</p>
    <div class="tbl"><table>
      <tr><th>Model id</th><th>Type</th><th>Behaviour</th></tr>
      ${modelRows}
    </table></div>
    </div>
  </details>

  <details class="card" id="errors">
    <summary><h2>Errors</h2></summary>
    <div class="card-body">
    <p>Errors use the OpenAI format: <code>{"error":{"message","type","param","code"}}</code>.</p>
    <div class="tbl"><table>
      <tr><th>HTTP</th><th><code>code</code></th><th>When</th></tr>
      <tr><td>401</td><td><code>missing_api_key</code></td><td>No key in <code>Authorization</code>, <code>api-key</code> or <code>x-api-key</code></td></tr>
      <tr><td>401</td><td><code>invalid_api_key</code></td><td>The key does not match the server's <code>API_KEY</code></td></tr>
      <tr><td>500</td><td><code>server_misconfigured</code></td><td>A protected request reached a server with no <code>API_KEY</code> configured</td></tr>
      <tr><td>404</td><td><code>model_not_found</code></td><td>Model <code>fake-reject</code>. Explore shows "The provider rejected this model" and <code>llmModelHealth</code> returns <code>ok: false</code></td></tr>
      <tr><td>404</td><td><code>not_found</code></td><td>Unknown path</td></tr>
      <tr><td>405</td><td><code>method_not_allowed</code></td><td>A POST endpoint called with another method</td></tr>
      <tr><td>400</td><td><code>invalid_dimensions</code></td><td><code>dimensions</code> outside 1 to 8192</td></tr>
    </table></div>
    <p>Model <code>fake-slow</code> does not fail, but waits about 5 seconds before answering (also when streaming). Use it to test timeouts and loading states.</p>
    </div>
  </details>

  <details class="card" id="clients">
    <summary><h2>Clients</h2></summary>
    <div class="card-body">
    <h3>LiteLLM</h3>
<pre><code>import litellm
r = litellm.completion(model="openai/fake-chat", api_base="${base}",
                       api_key="YOUR_API_KEY", messages=[{"role": "user", "content": "hi"}])
print(r.choices[0].message.content)

e = litellm.embedding(model="openai/fake-embed", api_base="${base}",
                      api_key="YOUR_API_KEY", input=["hi"])
print(len(e.data[0]["embedding"]))</code></pre>
    <h3>OpenAI SDK (Python)</h3>
<pre><code>from openai import OpenAI
client = OpenAI(base_url="${base}", api_key="YOUR_API_KEY")
print(client.chat.completions.create(model="fake-chat",
      messages=[{"role": "user", "content": "hi"}]).choices[0].message.content)</code></pre>
    <h3>OpenAI SDK (Node)</h3>
<pre><code>import OpenAI from "openai";
const client = new OpenAI({ baseURL: "${base}", apiKey: "YOUR_API_KEY" });
const r = await client.chat.completions.create({ model: "fake-chat", messages: [{ role: "user", content: "hi" }] });
console.log(r.choices[0].message.content);</code></pre>
    <h3>Postman</h3>
    <p>Import <code>postman/fake-llm.postman_collection.json</code> and an environment from the repo's <code>postman/</code> folder, and set <code>baseUrl</code> to <code>${o}</code> and <code>apiKey</code> to the server's key.</p>
    </div>
  </details>

  <details class="card" id="limits">
    <summary><h2>Limits</h2></summary>
    <div class="card-body">
    <ul>
      <li>Answers have no real content: use this to test flows, configuration, UI and errors, not to judge RAG quality.</li>
      <li>No tool calling, function calling, JSON mode or images: those parameters are ignored.</li>
      <li>Calls without the right key are refused before any work is done, so they cost almost no CPU. They still count as requests on the Cloudflare plan.</li>
      <li>Cloudflare Workers free plan: about 100,000 requests per day and about 10 ms CPU per request. Large embedding batches can exceed the CPU limit, so keep batches moderate. Waiting time (<code>fake-slow</code>, streaming) does not count as CPU.</li>
      <li>The server is stateless: no history and no state between requests.</li>
    </ul>
    </div>
  </details>
</div>
<script>
(function () {
  var items = Array.prototype.slice.call(document.querySelectorAll("details.ep"));
  items.forEach(function (d) {
    d.addEventListener("toggle", function () {
      if (d.open) items.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });
  function openFromHash() {
    var t = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!t) return;
    for (var p = t; p; p = p.parentElement) if (p.tagName === "DETAILS") p.open = true;
    t.scrollIntoView({ block: "start" });
  }
  window.addEventListener("hashchange", openFromHash);
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (a && a.getAttribute("href") === location.hash) setTimeout(openFromHash, 0);
  });
  openFromHash();
})();
</script>
</body>
</html>`;
}
