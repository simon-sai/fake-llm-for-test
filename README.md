# fake-llm-for-test

A fake, OpenAI-compatible LLM API that runs on Cloudflare Workers (free plan). It returns well-formed but
meaningless answers, so Explore (through LiteLLM) can treat it as a working LLM in tests without a real model.

The home page (`GET /`) documents every endpoint with examples.

## Endpoints

`GET /`, `GET /health`, and CORS preflight (`OPTIONS`) are public. Protected requests require the `API_KEY`
secret in `Authorization: Bearer <key>`, `api-key: <key>`, or `x-api-key: <key>`. Protected requests return
`401` for a missing or invalid key, and `500` if the server has no `API_KEY` configured.

| Endpoint | Purpose |
| --- | --- |
| `POST /v1/chat/completions` | Chat, with and without `stream: true` (SSE) |
| `POST /v1/embeddings` | Deterministic embeddings (1536 dimensions, `float` or `base64`) |
| `POST /v1/responses` | OpenAI Responses API (model type `response`) |
| `GET /v1/models` | Lists the fake models |
| `GET /health` | Public liveness check |

Azure-style paths (`/openai/deployments/<name>/chat/completions`) work too.

## Fake models

| Model id | Behaviour |
| --- | --- |
| `fake-chat` | Answers with a fixed text that echoes the last user message |
| `fake-embed` | Same input always gives the same vector |
| `fake-reject` | Always returns 404 `model_not_found` |
| `fake-slow` | Answers after about 5 seconds |

## Run locally

On Windows, run `start-local.cmd` (or `start-local.cmd 9000` for another port). It maps `local.fake-llm.here` to
`127.0.0.1` in the hosts file (asks for admin rights once), creates `.dev.vars` with `API_KEY=dev-key` if it is
missing, and serves the API at `http://local.fake-llm.here:8787/v1`.

Manual start:

```bash
npm install
echo "API_KEY=dev-key" > .dev.vars
npx wrangler dev        # http://localhost:8787
```

## Deploy

```bash
npx wrangler login
npx wrangler secret put API_KEY     # enter a long random value
npx wrangler deploy                 # https://fake-llm.<subdomain>.workers.dev
```

Calls with a missing or wrong key are refused before any work is done, but they still count against the free plan's
daily request limit.

## Test with Postman

Import `postman/fake-llm.postman_collection.json` and one of the environments in `postman/` (`local` or
`cloudflare`), set `apiKey`, then run the collection.

## Use in Explore

1. Site owner: enable the `openai` provider in Administration > LLM Settings.
2. Workspace admin: add a credential with `api_base` = `https://fake-llm.<subdomain>.workers.dev/v1` and
   `api_key` = the server's `API_KEY`.
3. Add a `chat` model with base model `fake-chat` and make it the default. Add an `embedding` model with base model
   `fake-embed` if the workspace has the `vector` add-on.

Do not change the embedding dimension after a project has ingested documents with it.
