import { GuestLink } from "@/components/guest-link";
import Link from "next/link";

const features = [
  {
    title: "Flexible splits",
    body: "Equal, exact amounts, percentages, or shares. The leftover cent goes to the person who paid.",
  },
  {
    title: "More than one currency",
    body: "Log a dinner in yen and a train in euros. Balances stay in the group's currency, using the rate from that day.",
  },
  {
    title: "A clear path to settle",
    body: "See who owes whom, record a partial payment, and watch the balance update immediately.",
  },
  {
    title: "People without accounts",
    body: "Add a roommate by name. They still show up in the split, even if they never sign in.",
  },
];

export default function HomePage() {
  return (
    <main id="main">
      <section className="mx-auto grid max-w-page gap-8 px-4 py-16 sm:py-24">
        <p className="text-sm font-semibold text-accent">Group expenses</p>
        <div className="max-w-content">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Split expenses. Settle up. Stay friends.</h1>
          <p className="mt-4 text-lg text-text-secondary">
            One shared record of who paid, how it was divided, and what it takes to get square. Built for roommates, trips, and the dinner that nobody wants to spreadsheet.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <GuestLink className="btn-accent inline-flex min-h-11 items-center rounded-md px-4 text-sm font-semibold underline-offset-4">
            Try as guest
          </GuestLink>
          <Link href="/sign-up" className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-4 text-sm font-semibold underline-offset-4 hover:bg-bg-tertiary">
            Sign up
          </Link>
        </div>
      </section>
      <section aria-label="Features" className="border-t border-border">
        <ul className="mx-auto grid max-w-page gap-6 px-4 py-12 sm:grid-cols-2">
          {features.map((feature) => (
            <li key={feature.title} className="rounded-lg border border-border bg-surface p-5">
              <h2 className="text-lg font-semibold">{feature.title}</h2>
              <p className="mt-2 text-text-secondary">{feature.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
