import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const SOCIAL_QUERY_PRESETS: Record<string, string> = {
  core: `(SpaceX OR @SpaceX OR "SpaceX IPO" OR SPCX OR "SpaceX S-1" OR Starlink OR Starship OR xAI OR Grok OR Hyperliquid) lang:en -is:retweet -is:reply`,
  market:
    `("SpaceX IPO" OR SPCX OR "SpaceX S-1" OR "SpaceX filing" OR "pre-IPO" OR "market cap" OR Hyperliquid OR "SpaceX valuation") lang:en -is:retweet -is:reply`,
  broad:
    `(SpaceX OR @SpaceX OR Starlink OR Starship OR Starbase OR xAI OR Grok OR "AI data center" OR "SpaceX S-1" OR Hyperliquid OR "space internet") lang:en -is:retweet -is:reply`,
};

function buildSocialFeedUrl(requestUrl: URL) {
  const endpointParam = requestUrl.searchParams.get("endpoint") || "all";
  const endpoint = endpointParam === "recent" ? "recent" : "all";
  const queryPreset = requestUrl.searchParams.get("query_preset") || "core";
  const query = requestUrl.searchParams.get("query") || SOCIAL_QUERY_PRESETS[queryPreset] || SOCIAL_QUERY_PRESETS.core;
  const maxResults = requestUrl.searchParams.get("max_results") || "12";

  const xUrl = new URL(`https://api.x.com/2/tweets/search/${endpoint}`);
  xUrl.searchParams.set("query", query);
  xUrl.searchParams.set("max_results", maxResults);
  xUrl.searchParams.set("sort_order", requestUrl.searchParams.get("sort_order") || "relevancy");
  xUrl.searchParams.set(
    "tweet.fields",
    requestUrl.searchParams.get("tweet.fields") ??
      "created_at,author_id,public_metrics,entities,lang,source,possibly_sensitive,reply_settings,conversation_id",
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
    requestUrl.searchParams.get("media.fields") ?? "url,preview_image_url,width,height,type",
  );

  return xUrl;
}

type SocialFeedProxyResponse = {
  status: number;
  payload: unknown;
};

async function fetchSocialFeedFromX(requestUrl: URL) {
  const xUrl = buildSocialFeedUrl(requestUrl);
  const bearerToken = process.env.X_BEARER_TOKEN;

  if (!bearerToken) {
    return { status: 503, payload: { error: "X_BEARER_TOKEN is not set." } };
  }

  const xResponse = await fetch(xUrl, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
  });
  const bodyText = await xResponse.text();
  const body = bodyText ? JSON.parse(bodyText) : {};

  if (!xResponse.ok) {
    return { status: xResponse.status, payload: body };
  }

  const limit = Number(requestUrl.searchParams.get("limit") ?? requestUrl.searchParams.get("max_results") ?? "12");
  const ranked = requestUrl.searchParams.get("ranked") !== "false";
  const endpoint = requestUrl.searchParams.get("endpoint") || "all";
  const endpointLabel = endpoint === "recent" ? "recent" : "all";

  if (!ranked) return { status: xResponse.status, payload: body };

  const users = new Map((body.includes?.users ?? []).map((user: { id: string; verified?: boolean }) => [user.id, user]));
  const rankedData = (body.data ?? [])
    .slice(0, limit);

  return {
    status: xResponse.status,
    payload: {
      ...body,
      data: rankedData,
      meta: {
        ...body.meta,
        ranked_count: rankedData.length,
        ranking: `X ${endpointLabel} API passthrough`,
      },
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: "fmp-top-us-equities",
      configureServer(server) {
        server.middlewares.use("/api/top-us-equities", async (_request, response) => {
          const apiKey = process.env.FMP_API_KEY;

          if (!apiKey) {
            response.statusCode = 503;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({ error: "FMP_API_KEY is not set" }));
            return;
          }

          const url = new URL("https://financialmodelingprep.com/stable/company-screener");
          url.searchParams.set("country", "US");
          url.searchParams.set("marketCapMoreThan", "500000000000");
          url.searchParams.set("isEtf", "false");
          url.searchParams.set("isFund", "false");
          url.searchParams.set("isActivelyTrading", "true");
          url.searchParams.set("limit", "100");
          url.searchParams.set("apikey", apiKey);

          try {
            const fmpResponse = await fetch(url);
            const text = await fmpResponse.text();
            response.statusCode = fmpResponse.status;
            response.setHeader("Content-Type", fmpResponse.headers.get("content-type") ?? "application/json");
            response.end(text);
          } catch {
            response.statusCode = 502;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({ error: "Failed to fetch FMP company screener" }));
          }
        });

        server.middlewares.use("/api/social-feed", async (request, response) => {
          try {
            const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host}`);
            const endpointResponse = await fetchSocialFeedFromX(requestUrl);
            response.setHeader("Content-Type", "application/json");
            response.statusCode = endpointResponse.status;
            response.end(JSON.stringify(endpointResponse.payload));
          } catch (error) {
            response.statusCode = 500;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown server error." }));
          }
        });
      },
    },
  ],
});
