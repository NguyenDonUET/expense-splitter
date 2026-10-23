# Expense Splitter

Split shared costs with friends, roommates, and travel companions. Flexible split types, multi-currency support, and clear settlement tracking keep everyone square.

![Preview of Expense Splitter](./preview.jpg)

*This is a design concept image, not the intended design. There's no Figma file, so the design decisions are yours.*

## The challenge

Expense Splitter is a **Product Challenge** on [Frontend Mentor](https://www.frontendmentor.io). There's no Figma file, so you make the design decisions. You ship a real, deployed product with a database, authentication, and a live currency-conversion API. The result is a portfolio piece that shows how you think as much as what you can build.

### Four pillars

| Pillar | What it means for Expense Splitter |
|--------|----------------------------|
| **Product thinking** | You design the expense entry flow, the group dashboard, and how balances, debts, and settlements are communicated clearly. |
| **Design taste & craft** | The brand kit gives you colors, type, and spacing. The layouts, balance displays, and settlement flows are yours. |
| **AI collaboration** | The project includes AI context files (`AGENTS.md`, `CLAUDE.md`) that give tools like Claude full project context. Lean into AI across planning, building, and polishing. |
| **Shipping real products** | Deploy to a live URL. Real database, real auth, and a live exchange-rate API. The project works end-to-end for any visitor. |

## What you're building

A shared expense tool for groups: roommates, trip companions, friend groups. You log who paid for what, split costs flexibly, and give everyone a clear path to settling up.

- **Group management**: create groups, add members (including people without accounts), and set a default currency
- **Flexible splits**: equal, exact amounts, percentages, and shares, with validation and clean rounding
- **Multi-currency support**: log expenses in any currency with real exchange rates, converted to the group's default
- **Balances & settlements**: see who owes whom, suggest pairwise payments, and handle partial settlements
- **Categories & filtering**: organize spending and break it down by category, date, and member
- **Landing page**: a professional entry point with guest access
- **Guest experience**: a fully explorable demo, no account required

### The guest experience

When you share this project, whether in your portfolio, a job application, or a social post, the person clicking your link isn't going to create an account. Guest mode is what lets them see your work instead of a login wall.

Your landing page includes a "Try as Guest" button. Guests land on a dashboard pre-loaded with 5 groups and 43 expenses: a two-week trip to Japan with mixed-currency spending (USD, JPY, EUR), a roommate household with recurring rent, an office lunch crew, a one-off birthday-gift collection, and a camping weekend. Mixed currencies, every split type, and a mix of settled and outstanding debts are all there to explore, so a visitor sees the product working within seconds.

## Project structure

```
expense-splitter/
├── spec/
│   ├── product-definition.md      # What, who, why
│   ├── core-requirements.md       # 15 features: 11 core + 4 stretch
│   ├── design-challenges.md       # 3 features YOU design
│   ├── technical-requirements.md  # Database, auth, currency API, deployment, performance
│   └── differentiators.md         # 4 enhancements (pick 1-2)
├── guidance/
│   ├── brand-kit.md               # Colors, typography, spacing, icons, mood
│   ├── patterns.md                # UI/UX do's and don'ts
│   └── accessibility.md           # WCAG checklist
├── starter/
│   ├── tokens.css                 # CSS custom properties
│   └── tailwind.css               # Optional Tailwind v4 config
├── data/
│   ├── sample-groups.json         # 5 groups, 43 expenses, intentional edge cases
│   └── README.md                  # Data edge case documentation
├── .env.example                   # Environment variable template
├── AGENTS.md                      # AI collaboration context
├── CLAUDE.md                      # Points to AGENTS.md
└── README-template.md             # Template for your solution README
```

## Getting started

1. **Read the spec.** Start with `spec/product-definition.md`, then `core-requirements.md`. Understand what you're building before you write code.

2. **Review the brand kit.** `guidance/brand-kit.md` gives you the visual foundation: colors, type, and spacing. Use it and the preview image as your starting point. Or, if you have a clear design vision of your own, create your own brand kit and go in a different direction. The starter CSS tokens and optional Tailwind config are ready to use.

3. **Explore the patterns.** `guidance/patterns.md` provides UI/UX do's and don'ts that help you make strong design decisions without a Figma file.

4. **Choose your stack.** This challenge is framework-agnostic: Next.js, Nuxt, SvelteKit, Remix, Astro, or whatever you're most productive with. The recommended path is full-stack (database plus auth), but there's a **frontend-only alternative** if you want to focus on UI/UX and frontend engineering. See `spec/technical-requirements.md` for details. Either way, the currency-conversion API integration stays.

5. **Set up your AI workflow.** This project is designed for AI collaboration. `AGENTS.md` and `CLAUDE.md` give AI tools full context about the project: specs, guidance, and collaboration approach. We recommend working with AI across every phase, from planning to building to polishing.

6. **Pick your differentiators.** Read `spec/differentiators.md` and choose 1-2 that match your interests. These are what make the project _yours_.

7. **Start building.** Begin with the foundation (auth, database, core data model), then layer in features. The core-requirements spec is your guide. Core features give you a solid product; stretch features take it to the next level.

8. **Document as you go.** Use `README-template.md` for your solution README. Record design decisions, technical trade-offs, and lessons learned as they happen, not after.

## Working with AI

Product Challenges are designed for AI collaboration. The `AGENTS.md` and `CLAUDE.md` files give AI tools like Claude, Cursor, and Copilot full project context, including the spec, brand kit, and collaboration guidelines. Load them at the start of each session.

Lean on AI for implementation, but don't accept everything it gives you. The design decisions are yours, and so is the code quality. Review what gets generated, understand it, and make sure it's something you'd be happy putting your name on. The 3 design-it-yourself features (Expense Entry UX, Group Dashboard Design, Settlement Flow Design) are where your product thinking matters most.

## Your solution repo

The `.gitignore` is pre-configured to exclude challenge reference files (`spec/`, `guidance/`, `AGENTS.md`, etc.) from your solution repo. These files are your development reference. They stay on your machine for AI sessions and planning, but they don't belong in the finished product.

Your public repo should contain:

- Your application code
- Your completed README (rename `README-template.md` → `README.md`)
- The sample data files (needed for the guest experience)
- The starter tokens (consumed by your build)

This is how real products work: you reference the spec during development, you ship the product.

## Learning outcomes

By completing this challenge, you'll have demonstrated:

- Building a full product from a spec, rather than following a tutorial
- Making genuine product and design decisions with documented reasoning
- Shipping a deployed app with a real database, authentication, and a live external API
- Modeling group expenses, flexible split types, and multi-currency balances correctly
- Handling real financial edge cases: rounding, currency conversion, and settlement math
- Creating a compelling guest experience with realistic, pre-loaded data
- Writing a professional README that showcases your thinking process

## Key design moments

These screens are where your design taste will be most visible:

1. **Expense entry.** The most frequent action in the app. The "fast path" for the common case and the transition to advanced split types define how the product feels day to day.
2. **Group dashboard.** The home base for each group. The information hierarchy (personal balance, group summary, recent expenses, what to settle) shapes the whole experience.
3. **Settlement flow.** The payoff moment. Making "who owes whom" clear, trustworthy, and satisfying to resolve is where the product earns its keep.
4. **Landing page.** The first impression. It should immediately communicate what the product does and why it matters.

## Deploying your project

Product Challenges require a live, publicly accessible URL. Recommended hosts:

- [Vercel](https://vercel.com/)
- [Netlify](https://www.netlify.com/)
- [Render](https://render.com/)
- [Fly.io](https://fly.io/)

Make sure your environment variables are configured correctly and no secrets are exposed, especially your currency API key. Test your deployed URL in an incognito window before submitting, especially the guest experience.

For more guidance, see our [hosting guide](https://www.frontendmentor.io/guides/hosting-your-solution).

## Submitting your solution

Submit your solution on the platform for the rest of the community to see. Follow our [guide to submitting solutions](https://www.frontendmentor.io/guides/how-to-submit-solutions) for the full process.

When submitting, you'll need:

- **Live site URL.** Submit the URL to your guest experience (e.g., `your-app.vercel.app/guest`), not the landing page. This makes sure our solution reporters analyze your product code rather than the homepage. On the frontend-only path there's no separate guest route, so submit your app's dashboard URL instead. Test in incognito first.
- **Repository URL.** A public repo with your solution code and completed README.

For your retrospective, Product Challenges give you a lot to write about: design decisions, AI collaboration, technical trade-offs. Be specific about what you're proud of and where you'd like feedback. See our [guide to writing effective retrospectives](https://www.frontendmentor.io/guides/write-an-effective-retrospective) for tips.

## Sharing your solution

Product Challenges create portfolio pieces worth sharing beyond the platform:

1. Share your solution page in the **#finished-projects** channel of our [community](https://www.frontendmentor.io/community).
2. Post on LinkedIn or X, including both your live URL and repo link. The guest experience means anyone clicking your link sees the product immediately.
3. Add it to your portfolio. See our [guide to using challenges in your portfolio](https://www.frontendmentor.io/guides/use-challenges-in-your-portfolio).
4. Blog about your experience. The design decisions, AI collaboration, and technical challenges make for compelling content. Great platforms to write on are [dev.to](https://dev.to/), [Hashnode](https://hashnode.com/), and [CodeNewbie](https://community.codenewbie.org/).

## Questions?

If anything in the spec is unclear or you want to discuss the challenge, join our [Discord community](https://www.frontendmentor.io/community).

## Got feedback for us?

We love receiving feedback! If you have anything you'd like to mention, please email hi[at]frontendmentor[dot]io.

## Solution notes

The app is a Next.js App Router client. Groups, expenses, and settlements live behind a `GroupStore` (`list`, `get`, `save`, `remove`). The first visit seeds `localStorage` from the sample file; later visits keep edits. Restore sample groups rewrites that store and reloads Zustand. Guests keep the same store in `sessionStorage` and never write to the database. Signed-in users call the same methods over HTTP, and the route handlers persist to MongoDB. A member can leave only when their balance is zero. A group can be deleted only after confirmation, and only when every balance is settled.

Balances are derived on read. Nothing stores a settled flag on an expense. Leftover minor units from an equal, percentage, or shares split go to the payer. A remainder of one minor unit or less is treated as zero. Settle-up suggestions are the pairwise debts, not a simplified payment graph.

Until someone signs in, each group remembers a local “viewing as” member so the dashboard can say “you owe”. That choice becomes the signed-in user once an account exists. Exchange rates are fetched with `fetch` in `/api/rates`, cached for about an hour, and stored on the expense. A typed-in rate is kept and marked as user-set. If the rate service is down, entry still works with the last table or a manual rate.
