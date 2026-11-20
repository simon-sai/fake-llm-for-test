# fake-llm-for-test

A fake, OpenAI-compatible LLM API that runs on Cloudflare Workers (free plan). It returns well-formed but
meaningless answers, so Explore (through LiteLLM) can treat it as a working LLM in tests without a real model.

## Endpoints

All paths are under `/v1` and need the API key (`Authorization: Bearer <key>` or an `api-key` header).

| Endpoint | Purpose |
| --- | --- |
| `POST /v1/chat/completions` | Chat, with and without `stream: true` (SSE) |
| `POST /v1/embeddings` | Deterministic embeddings (1536 dimensions, `float` or `base64`) |
| `POST /v1/responses` | OpenAI Responses API (model type `response`) |
| `GET /v1/models` | Lists the fake models |

## Fake models

| Model id | Behaviour |
| --- | --- |
| `fake-chat` | Answers with a fixed text that echoes the last user message |
| `fake-embed` | Same input always gives the same vector |
| `fake-reject` | Always returns 404 `model_not_found` |
| `fake-slow` | Answers after about 5 seconds |

## Run locally

```bash
npm install
echo "API_KEY=dev-key" > .dev.vars
npx wrangler dev        # http://localhost:8787
```

## Deploy

```bash
npx wrangler login
npx wrangler secret put API_KEY
npx wrangler deploy     # https://fake-llm.<subdomain>.workers.dev
```

## Use in Explore

1. Site owner: enable the `openai` provider in Administration > LLM Settings.
2. Workspace admin: add a credential with `api_base` = `https://fake-llm.<subdomain>.workers.dev/v1` and
   `api_key` = the secret.
3. Add a `chat` model with base model `fake-chat` and make it the default. Add an `embedding` model with base model
   `fake-embed` if the workspace has the `vector` add-on.

Do not change the embedding dimension after a project has ingested documents with it.
