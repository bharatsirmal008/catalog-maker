"use client";
export default function CatalogError({ reset }: { reset: () => void }) { return <section role="alert" className="empty-state"><h2>We couldn’t load this page</h2><p>Please try again in a moment.</p><button className="button" onClick={reset}>Try again</button></section>; }
