import Link from "next/link";
export default function NotFound() { return <section className="shell empty-state"><p className="eyebrow">404</p><h1>This piece couldn’t be found</h1><p>It may have moved or is no longer available.</p><Link className="button" href="/">Back to the collection</Link></section>; }
