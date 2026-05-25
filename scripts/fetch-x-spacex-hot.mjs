#!/usr/bin/env node

const API_BASE = "https://api.x.com/2";
const DEFAULT_QUERY =
  '(SpaceX OR @SpaceX OR "SpaceX IPO" OR SPCX OR "SpaceX S-1" OR xAI OR Grok OR Starlink OR Starship OR "Starship SN" OR "Starbase") lang:en -is:retweet -is:reply';

function getArg(name, fallback) {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function getBearerToken() {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) {
    throw new Error("Set X_BEARER_TOKEN before running this script.");
  }
  return token;
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

  return engagement / Math.pow(hoursOld + 2, 1.3);
}

function byId(items = []) {
  return new Map(items.map((item) => [item.id, item]));
}

async function xGet(path, params) {
  const url = new URL(`${API_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, value);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      Authorization: `Bearer ${getBearerToken()}`,
    },
  });
  clearTimeout(timeout);

  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`X API request failed: ${response.status} ${JSON.stringify(body)}`);
  }

  return body;
}

async function searchAll() {
  const query = getArg("query", DEFAULT_QUERY);
  const maxResults = getArg("max-results", "100");
  const sortOrder = getArg("sort", "relevancy");
  const limit = Number(getArg("limit", "25"));
  const verifiedOnly = getArg("verified-only", "true") === "true";

  const body = await xGet("/tweets/search/all", {
    query,
    max_results: maxResults,
    sort_order: sortOrder,
    "tweet.fields":
      "created_at,author_id,public_metrics,lang,entities,context_annotations,source,possibly_sensitive,reply_settings,conversation_id",
    expansions: "author_id,attachments.media_keys",
    "user.fields": "username,name,description,verified,public_metrics,profile_image_url",
    "media.fields": "url,preview_image_url,width,height,media_key",
  });

  const users = byId(body.includes?.users);
  const verifiedUsers = verifiedOnly
    ? (body.includes?.users ?? []).filter((user) => user.verified)
    : body.includes?.users ?? [];
  const verifiedSet = new Set(verifiedUsers.map((user) => user.id));
  const ranked = (body.data ?? [])
    .map((tweet) => {
      const author = users.get(tweet.author_id);
      if (verifiedOnly && !verifiedSet.has(tweet.author_id)) return null;
      return {
        score: hotScore(tweet),
        url: `https://x.com/${author?.username ?? "i"}/status/${tweet.id}`,
        author: author ? `@${author.username}` : tweet.author_id,
        created_at: tweet.created_at,
        metrics: tweet.public_metrics,
        text: tweet.text.replace(/\s+/g, " ").trim(),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  console.table(
    ranked.map((tweet) => ({
      score: tweet.score.toFixed(2),
      author: tweet.author,
      likes: tweet.metrics?.like_count ?? 0,
      reposts: tweet.metrics?.retweet_count ?? 0,
      replies: tweet.metrics?.reply_count ?? 0,
      quotes: tweet.metrics?.quote_count ?? 0,
      created_at: tweet.created_at,
      url: tweet.url,
    })),
  );

  console.log(JSON.stringify({ query, count: ranked.length, ranked }, null, 2));
}

searchAll().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
