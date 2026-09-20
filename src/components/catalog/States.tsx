import Link from "next/link";
import { RetryButton } from "./RetryButton";
export function EmptyState({ title = "Nothing here just yet", message = "Try another search or explore the full collection." }: { title?: string; message?: string }) {
  return <section className="empty-state"><span aria-hidden="true">◇</span><h2>{title}</h2><p>{message}</p><Link className="button button-secondary" href="/">Explore all products</Link></section>;
}
export function ErrorState() { return <section className="empty-state" role="alert"><h2>The collection is taking a moment</h2><p>We couldn’t load the catalog. Please try again.</p><RetryButton /></section>; }
export function ProductSkeleton() { return <div className="product-grid" aria-label="Loading products" role="status">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton-card"><div /><span /><span /></div>)}</div>; }
