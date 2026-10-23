import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto grid max-w-content gap-4 px-4 py-16">
      <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
      <p className="text-text-secondary">That link does not match a group or page in Expense Splitter.</p>
      <Link href="/" className="btn-accent inline-flex min-h-11 w-fit items-center rounded-md px-4 text-sm font-semibold">
        Back home
      </Link>
    </main>
  );
}
