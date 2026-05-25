export type SocialFeedState = "loading" | "live" | "empty" | "fallback";

export type SocialFeedPost = {
  id: string;
  url: string;
  text: string;
  createdAt: string;
  authorName: string;
  username: string;
  profileImageUrl: string | null;
  verified: boolean;
  authorMetrics: {
    followers: number;
    following: number;
  };
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
    quotes: number;
    bookmarks: number;
    impressions: number;
  };
  mediaUrl: string | null;
};

type ApiTweet = {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  public_metrics?: {
    like_count?: number;
    retweet_count?: number;
    reply_count?: number;
    quote_count?: number;
    bookmark_count?: number;
    impression_count?: number;
  };
  attachments?: {
    media_keys?: string[];
  };
};

type ApiUser = {
  id: string;
  name: string;
  username: string;
  verified: boolean;
  verified_type?: string;
  profile_image_url?: string;
  public_metrics?: {
    followers_count?: number;
    following_count?: number;
  };
};

type ApiMedia = {
  media_key: string;
  type?: string;
  preview_image_url?: string;
  url?: string;
};

type SocialFeedResponse = {
  data?: ApiTweet[];
  includes?: {
    users?: ApiUser[];
    media?: ApiMedia[];
  };
};

function clamp(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function normalizeNumber(value: unknown): number {
  if (typeof value !== "number") return 0;
  return clamp(value);
}

function extractMediaUrl(tweet: ApiTweet, mediaMap: Map<string, ApiMedia>): string | null {
  const mediaKey = tweet.attachments?.media_keys?.[0];
  if (!mediaKey) return null;
  const media = mediaMap.get(mediaKey);
  if (!media) return null;

  return media.type === "photo" ? media.url ?? null : media.preview_image_url ?? null;
}

function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

export async function fetchSocialFeed({
  limit = 12,
  queryPreset = "core",
  verifiedOnly = true,
  minLikes = 0,
}: {
  limit?: number;
  queryPreset?: string;
  verifiedOnly?: boolean;
  minLikes?: number;
} = {}): Promise<SocialFeedPost[]> {
  const proxyBaseUrl = import.meta.env.VITE_X_PROXY_URL || "https://preipo-x-proxy-production.up.railway.app";
  const searchUrl = proxyBaseUrl.length > 0
    ? new URL("/search/all", proxyBaseUrl)
    : new URL("/api/social-feed", window.location.origin);
  searchUrl.searchParams.set("query_preset", queryPreset);
  searchUrl.searchParams.set("max_results", String(Math.max(limit, 20)));
  searchUrl.searchParams.set("limit", String(limit));
  searchUrl.searchParams.set("endpoint", "all");
  searchUrl.searchParams.set("sort_order", "relevancy");
  searchUrl.searchParams.set("ranked", "false");

  const res = await fetch(searchUrl);
  if (!res.ok) {
    throw new Error(`Social feed request failed: ${res.status}`);
  }

  const payload = (await res.json()) as SocialFeedResponse & { data?: ApiTweet[] };
  const users = new Map((payload.includes?.users ?? []).map((user) => [user.id, user]));
  const mediaMap = new Map((payload.includes?.media ?? []).map((item) => [item.media_key, item]));

  if (!Array.isArray(payload.data)) return [];

  return payload.data.map((tweet) => {
    const author = users.get(tweet.author_id);
    const authorName = author?.name ?? "SpaceX Signal";
    const username = author?.username ?? "spacex";
    const profileImageUrl = author?.profile_image_url ?? null;
    const verified = Boolean(author?.verified || (author?.verified_type && author.verified_type !== "none"));
    const authorMetrics = author?.public_metrics ?? {};
    const metrics = tweet.public_metrics ?? {};

    return {
      id: tweet.id,
      url: `https://x.com/${username}/status/${tweet.id}`,
      text: cleanText(tweet.text),
      createdAt: tweet.created_at,
      authorName,
      username,
      profileImageUrl,
      verified,
      authorMetrics: {
        followers: normalizeNumber(authorMetrics.followers_count),
        following: normalizeNumber(authorMetrics.following_count),
      },
      metrics: {
        likes: normalizeNumber(metrics.like_count),
        retweets: normalizeNumber(metrics.retweet_count),
        replies: normalizeNumber(metrics.reply_count),
        quotes: normalizeNumber(metrics.quote_count),
        bookmarks: normalizeNumber(metrics.bookmark_count),
        impressions: normalizeNumber(metrics.impression_count),
      },
      mediaUrl: extractMediaUrl(tweet, mediaMap),
    };
  }).filter((post) => (verifiedOnly ? post.verified : true))
    .filter((post) => post.metrics.likes >= minLikes)
    .slice(0, limit);
}
