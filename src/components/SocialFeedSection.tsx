import { useMemo } from "react";
import type { SocialFeedPost, SocialFeedState } from "../lib/social-feed";

type SocialFeedSectionProps = {
  posts: SocialFeedPost[];
  state: SocialFeedState;
};

function compactRelativeTime(isoTime: string, now = Date.now()): string {
  const then = Date.parse(isoTime);
  if (Number.isNaN(then)) return "just now";

  const elapsedMs = Math.max(0, now - then);
  const elapsedMinutes = elapsedMs / 60000;

  if (elapsedMinutes < 1) return "now";
  if (elapsedMinutes < 60) return `${Math.floor(elapsedMinutes)}m`;
  if (elapsedMinutes < 60 * 24) return `${Math.floor(elapsedMinutes / 60)}h`;
  if (elapsedMinutes < 60 * 24 * 7) return `${Math.floor(elapsedMinutes / (60 * 24))}d`;
  if (elapsedMinutes < 60 * 24 * 30) return `${Math.floor(elapsedMinutes / (60 * 24 * 7))}w`;
  return `${Math.floor(elapsedMinutes / (60 * 24 * 30))}m`;
}

function formatMetric(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function TweetCard({ post }: { post: SocialFeedPost }) {
  const posted = compactRelativeTime(post.createdAt);

  return (
    <article className="social-card">
      <a className="social-card-link" href={post.url} target="_blank" rel="noreferrer">
        <header>
          <img
            src={post.profileImageUrl ?? "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png"}
            alt={`${post.authorName} avatar`}
          />
          <div className="social-card-meta">
            <strong>
              {post.authorName}
              {post.verified ? (
                <span className="verified-check" aria-label="Verified account">
                  ✓
                </span>
              ) : null}
            </strong>
            <small>@{post.username}</small>
            <small className="social-account-stats">
              {formatMetric(post.authorMetrics.followers)} followers · {formatMetric(post.authorMetrics.following)} following
            </small>
          </div>
          <span>{posted}</span>
        </header>
        <p>{post.text}</p>
        {post.mediaUrl ? (
          <img className="social-card-media" src={post.mediaUrl} alt="Linked media from post" loading="lazy" />
        ) : null}
        <footer>
          <span>{formatMetric(post.metrics.likes)} likes</span>
          <span>{formatMetric(post.metrics.retweets)} reposts</span>
          <span>{formatMetric(post.metrics.replies)} replies</span>
          <span>{formatMetric(post.metrics.quotes)} quotes</span>
        </footer>
      </a>
    </article>
  );
}

function TweetSkeleton() {
  return (
    <article className="social-card social-card-skeleton" aria-hidden="true">
      <div className="social-card-link">
        <header>
          <span className="skeleton-dot" />
          <div className="social-card-meta">
            <span className="skeleton-line short" />
            <span className="skeleton-line micro" />
          </div>
          <span className="skeleton-line time" />
        </header>
        <div className="skeleton-copy">
          <span className="skeleton-line" />
          <span className="skeleton-line wide" />
          <span className="skeleton-line medium" />
        </div>
        <footer>
          <span className="skeleton-line metric" />
          <span className="skeleton-line metric" />
          <span className="skeleton-line metric" />
        </footer>
      </div>
    </article>
  );
}

export function SocialFeedSection({ posts, state }: SocialFeedSectionProps) {
  const caption = useMemo(() => {
    switch (state) {
      case "loading":
        return "Loading latest conversation...";
      case "fallback":
        return "Social feed is unavailable right now.";
      case "empty":
        return "No posts match the current search right now.";
      default:
        return "Live conversation on SpaceX, SPCX, Starlink, Starship, xAI, and the IPO path.";
    }
  }, [state]);

  return (
    <section className="social-section">
      <div className="social-head">
        <h2>Social Feed</h2>
        <small>{caption}</small>
      </div>
      <div className="social-strip" aria-live={state === "loading" ? "polite" : "off"}>
        {state === "loading" ? (
          Array.from({ length: 4 }, (_, index) => <TweetSkeleton key={index} />)
        ) : posts.length === 0 ? (
          <p className="social-empty">{state === "fallback" ? "Unable to load live posts." : "No posts yet."}</p>
        ) : (
          posts.map((post) => <TweetCard post={post} key={post.id} />)
        )}
      </div>
    </section>
  );
}
