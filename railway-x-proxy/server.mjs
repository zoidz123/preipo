import http from "node:http";

const X_SEARCH_BASE_URL = "https://api.x.com/2/tweets/search/";
const X_REQUEST_TIMEOUT_MS = 18_000;
const DEFAULT_QUERY_PRESET = "core";
const DEFAULT_QUERY_PRESETS = {
  core: "(SpaceX OR @SpaceX OR \"SpaceX IPO\" OR SPCX OR \"SpaceX S-1\" OR Starlink OR Starship OR xAI OR Grok OR Hyperliquid) lang:en -is:retweet -is:reply",
  market: "(\"SpaceX IPO\" OR SPCX OR \"SpaceX S-1\" OR \"SpaceX filing\" OR \"pre-IPO\" OR \"market cap\" OR Hyperliquid OR \"SpaceX valuation\") lang:en -is:retweet -is:reply",
  broad: "(SpaceX OR @SpaceX OR Starlink OR Starship OR Starbase OR xAI OR Grok OR \"AI data center\" OR \"SpaceX S-1\" OR Hyperliquid OR \"space internet\") lang:en -is:retweet -is:reply",
};
const RELEVANCE_TOKENS = [
  "spacex",
  "spacx",
  "s-1",
  "ipo",
  "xai",
  "grok",
  "starlink",
  "starship",
  "starbase",
  "hyperliquid",
  "falcon",
  "launch",
];

function applyRelevanceBoost(tweet) {
  const text = (tweet.text ?? "").toLowerCase();
  let matches = 0;

  for (const token of RELEVANCE_TOKENS) {
    if (text.includes(token)) matches += 1;
  }
  return 1 + Math.min(matches * 0.12, 0.75);
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": process.env.ALLOWED_ORIGIN ?? "*",
    "access-control-allow-methods": "GET,OPTIONS",
    "access-control-allow-headers": "content-type,x-proxy-key",
  });
  res.end(JSON.stringify(body));
}

function requireProxyKey(req, res) {
  if (!process.env.PROXY_KEY) return true;

  const suppliedKey = req.headers["x-proxy-key"];
  if (suppliedKey === process.env.PROXY_KEY) return true;

  sendJson(res, 401, { error: "Missing or invalid x-proxy-key header." });
  return false;
}

function hotScore(tweet, now = Date.now()) {
  const metrics = tweet.public_metrics ?? {};
  const likes = metrics.like_count ?? 0;
  const reposts = metrics.retweet_count ?? 0;
  const replies = metrics.reply_count ?? 0;
  const quotes = metrics.quote_count ?? 0;
  const bookmarks = metrics.bookmark_count ?? 0;
  const impressions = metrics.impression_count ?? 0;
  const createdAt = tweet.created_at ? new Date(tweet.created_at).getTime() : now;
  const hoursOld = Math.max((now - createdAt) / 36e5, 0);

  const engagement =
    likes * 1 +
    reposts * 3 +
    replies * 2 +
    quotes * 4 +
    bookmarks * 2 +
    impressions * 0.01;

  return (engagement * applyRelevanceBoost(tweet)) / Math.pow(hoursOld + 2, 1.3);
}

function rankResponse(body, limit, { onlyVerified = false, minLikes = 0 } = {}) {
  const users = new Map((body.includes?.users ?? []).map((user) => [user.id, user]));
  const rankedMediaKeys = new Set();
  const ranked = (body.data ?? [])
    .map((tweet) => {
      const author = users.get(tweet.author_id);
      return {
        ...tweet,
        hot_score: hotScore(tweet),
        url: `https://x.com/${author?.username ?? "i"}/status/${tweet.id}`,
        author,
      };
    })
    .filter((tweet) => (onlyVerified ? tweet.author?.verified : true))
    .filter((tweet) => (tweet.public_metrics?.like_count ?? 0) >= minLikes)
    .sort((a, b) => b.hot_score - a.hot_score)
    .slice(0, limit)
    .map((tweet) => {
      for (const mediaKey of tweet.attachments?.media_keys ?? []) {
        rankedMediaKeys.add(mediaKey);
      }

      return {
        id: tweet.id,
        text: tweet.text,
        created_at: tweet.created_at,
        author_id: tweet.author_id,
        public_metrics: tweet.public_metrics,
        entities: tweet.entities,
        attachments: tweet.attachments,
        lang: tweet.lang,
        url: tweet.url,
        hot_score: tweet.hot_score,
        author: tweet.author
          ? {
              id: tweet.author.id,
              username: tweet.author.username,
              name: tweet.author.name,
              verified: tweet.author.verified,
              verified_type: tweet.author.verified_type,
              profile_image_url: tweet.author.profile_image_url,
              public_metrics: tweet.author.public_metrics,
            }
          : undefined,
      };
    });

  const rankedAuthorIds = new Set(ranked.map((tweet) => tweet.author_id));
  const includes = {
    users: (body.includes?.users ?? [])
      .filter((user) => rankedAuthorIds.has(user.id))
      .map((user) => ({
        id: user.id,
        username: user.username,
        name: user.name,
        verified: user.verified,
        verified_type: user.verified_type,
        profile_image_url: user.profile_image_url,
        public_metrics: user.public_metrics,
      })),
    media: (body.includes?.media ?? []).filter((media) => rankedMediaKeys.has(media.media_key)),
  };

  return {
    includes,
    data: ranked,
    meta: {
      ...body.meta,
      ranked_count: ranked.length,
      ranking: "age-decayed weighted engagement",
    },
  };
}

async function handleSearch(req, res, requestUrl) {
  if (!requireProxyKey(req, res)) return;

  const bearerToken = process.env.X_BEARER_TOKEN;
  if (!bearerToken) {
    sendJson(res, 500, { error: "X_BEARER_TOKEN is not configured." });
    return;
  }

  const query = requestUrl.searchParams.get("query");
  const preset = requestUrl.searchParams.get("query_preset") ?? DEFAULT_QUERY_PRESET;
  const useDefaultQuery = requestUrl.searchParams.get("query") === null;
  const activeQuery =
    useDefaultQuery ? DEFAULT_QUERY_PRESETS[preset] ?? DEFAULT_QUERY_PRESETS.core : query;
  const onlyVerified = requestUrl.searchParams.get("verified_only") !== "false";
  const minLikes = Number(requestUrl.searchParams.get("min_likes") ?? "0");
  const maxResults = requestUrl.searchParams.get("max_results") ?? "100";
  const sortOrder = requestUrl.searchParams.get("sort_order") ?? "relevancy";
  const ranked = requestUrl.searchParams.get("ranked") !== "false";
  const limit = Number(requestUrl.searchParams.get("limit") ?? maxResults);

  const endpoint = requestUrl.pathname === "/search/recent" ? "recent" : "all";
  const xUrl = new URL(`${X_SEARCH_BASE_URL}${endpoint}`);
  xUrl.searchParams.set("query", activeQuery);
  xUrl.searchParams.set("max_results", maxResults);
  xUrl.searchParams.set("sort_order", sortOrder);
  xUrl.searchParams.set(
    "tweet.fields",
    requestUrl.searchParams.get("tweet.fields") ??
      "created_at,author_id,public_metrics,lang,entities,possibly_sensitive,conversation_id",
  );
  xUrl.searchParams.set(
    "expansions",
    requestUrl.searchParams.get("expansions") ?? "author_id,attachments.media_keys",
  );
  xUrl.searchParams.set(
    "user.fields",
    requestUrl.searchParams.get("user.fields") ??
      "username,name,description,verified,verified_type,public_metrics,profile_image_url",
  );
  xUrl.searchParams.set(
    "media.fields",
    requestUrl.searchParams.get("media.fields") ?? "url,preview_image_url,width,height,duration_ms,media_key",
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), X_REQUEST_TIMEOUT_MS);
  let xResponse;
  let text;

  try {
    xResponse = await fetch(xUrl, {
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${bearerToken}`,
      },
    });
    text = await xResponse.text();
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "AbortError";
    sendJson(res, 502, {
      error: isTimeout ? "X API request timed out." : "X API request failed.",
      detail: error instanceof Error ? error.message : "Unknown upstream error.",
    });
    return;
  } finally {
    clearTimeout(timeout);
  }

  const body = text ? JSON.parse(text) : {};
  if (ranked && xResponse.ok) {
    const response = rankResponse(body, limit, { onlyVerified, minLikes });
    sendJson(res, xResponse.status, response);
    return;
  }

  sendJson(res, xResponse.status, body);
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host}`);

    if (req.method === "OPTIONS") {
      sendJson(res, 204, {});
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/health") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/search/recent") {
      await handleSearch(req, res, requestUrl);
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/search/all") {
      await handleSearch(req, res, requestUrl);
      return;
    }

    sendJson(res, 404, {
      error: "Not found. Use GET /search/recent, /search/all, or GET /health.",
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Unknown server error.",
    });
  }
});

server.listen(Number(process.env.PORT ?? 3000), "0.0.0.0", () => {
  console.log(`X proxy listening on port ${process.env.PORT ?? 3000}`);
});
