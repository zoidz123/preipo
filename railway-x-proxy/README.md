# Railway X Search Proxy

Tiny Railway service that calls X search from outside your local network. The default app path uses `GET /2/tweets/search/all`.

## Deploy

```bash
cd railway-x-proxy
npm install
npm install -g @railway/cli
railway login
railway init
railway variable set X_BEARER_TOKEN="YOUR_X_BEARER_TOKEN"
railway variable set PROXY_KEY="pick-a-random-secret"
railway up
```

In the Railway dashboard, add/generate a public domain for the service.

## Test

```bash
curl "https://YOUR-SERVICE.up.railway.app/health"
```

Default SpaceX ranked search:

```bash
curl -H "x-proxy-key: YOUR_PROXY_KEY" \
  "https://YOUR-SERVICE.up.railway.app/search/all"
```
By default this uses a broad SpaceX query, sorts by age-decayed engagement relevance, and keeps only verified accounts.

Use `query_preset=core|market|broad` for three opinionated starter queries.

Custom query:

```bash
curl -G -H "x-proxy-key: YOUR_PROXY_KEY" \
  --data-urlencode 'query=(SpaceX OR Starship OR Falcon9 OR "Falcon 9") lang:en -is:retweet -is:reply' \
  --data-urlencode 'max_results=100' \
  --data-urlencode 'sort_order=relevancy' \
  --data-urlencode 'verified_only=true' \
  "https://YOUR-SERVICE.up.railway.app/search/all"
```

Verified-only mode:

```bash
curl -G -H "x-proxy-key: YOUR_PROXY_KEY" \
  --data-urlencode 'query_preset=market' \
  --data-urlencode 'sort_order=relevancy' \
  --data-urlencode 'verified_only=true' \
  --data-urlencode 'ranked=true' \
  --data-urlencode 'max_results=10' \
  "https://YOUR-SERVICE.up.railway.app/search/all"
```

Show raw X API shape:

```bash
curl -G -H "x-proxy-key: YOUR_PROXY_KEY" \
  --data-urlencode 'ranked=false' \
  "https://YOUR-SERVICE.up.railway.app/search/all"
```

Set `ranked=false` if you want raw X API output.
