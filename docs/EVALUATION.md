# Project Evaluation — Voynich Invoice Management Platform

## 1. Product Assessment

### Is this a real problem worth solving in Morocco?

**Yes. One of the most concrete, time-bound opportunities in the Moroccan B2B software market right now.**

Morocco's DGI e-invoicing mandate (2026-2027) is not optional. Every business that invoices will need a compliant solution. The question is not whether SMEs will need this — it is whether they will pay for it, and whether Voynich will be the one they use.

### Who actually cares?

**Primary (high urgency):**
- **Accountants and fiduciaires** — they manage 5–50 clients each. A tool that centralizes invoice management and exports compliance-ready UBL XML is high-leverage for them. This is the highest-value segment.
- **SME owners in formal sectors** (import/export, construction subcontractors, services, consulting) — they already invoice and are aware of DGI pressure.

**Secondary (reachable but harder):**
- **Freelancers and auto-entrepreneurs** — they invoice but have minimal compliance pressure today and are highly price-sensitive. They will not pay unless forced by a client or DGI.
- **Mid-market companies with internal admin** — already have ERP or are evaluating one. Voynich must win before they sign with Sage or Odoo.

**Non-buyers (do not target):**
- Any business operating primarily informally (cash economy, no declared invoices). The majority of Moroccan commerce. They will not use this.

### Painkiller or Vitamin?

**Today: Vitamin. In 2026: Painkiller.**

Right now, invoice management in Morocco is handled via Excel, WhatsApp photos, and paper folders. Businesses are not in pain — they are used to this. The DGI mandate changes this completely. Voynich has a 12-18 month window to establish itself before the mandate becomes urgent.

### Competitive Landscape

| Competitor | Reality |
|---|---|
| **Sage 100 / Odoo** | Over-complex, expensive (3,000–15,000 MAD/yr setup + license), requires integrator. SMEs avoid it. |
| **Invoiceberry / Zoho Invoice** | Generic, not Morocco-specific, no DGI compliance path. |
| **Cegid / Microsoft 365** | Enterprise tier. Irrelevant for target. |
| **Local fiduciaires offering Excel templates** | Current "competition" — zero switching cost, zero features, but trusted. |
| **Wafabail / CIH digital tools** | Bank-embedded invoicing — narrow, not invoice management. |
| **DGI's own xHub platform** | Will exist but will be painful to use directly. Voynich can be the UX layer on top. |

**Honest assessment**: There is no serious, compliance-ready, affordable, Morocco-first invoice management SaaS. Voynich has genuine first-mover opportunity — if it moves fast.

---

## 2. Technical & Product Quality

### Architecture Quality: **Above average for stage**

- Clean layered architecture (routes → services → crud → database). Junior devs can navigate without breaking things.
- Single `invoices` collection with `direction` field is a pragmatic choice that avoids premature schema complexity.
- Atomic sequential invoice numbering using `find_one_and_update` is correct — race condition handled properly.
- OCR caching via MD5 is smart cost management (Azure DI is expensive per call).
- Audit trail (`history` array per invoice) is production-grade thinking at early stage. Useful for compliance later.

### Scalability Potential: **Adequate for 0–1,000 companies, needs work beyond**

- PyMongo sync driver on FastAPI async is a mismatch that will bite at scale. Not critical now.
- Single `company_profile` document per tenant is fine but the multi-tenant architecture does not exist yet. Everything is single-tenant. This will need a major refactor when they sell to accountants managing multiple companies.
- No background job queue. PDF generation via weasyprint is synchronous and blocks the request thread. Under load (e.g., bulk export), this will cause timeouts.

### Maintainability: **Good**

- CLAUDE.md is exceptional documentation for a small project. Whoever reads the codebase can understand decisions and rationale.
- Ruff linting enforced. Code style is consistent.
- Frontend component structure is clean. Hooks separate data-fetching from rendering.

### Over-engineering detected:

- Recent activity feed via MongoDB `$unwind` aggregation is elegant but adds complexity for a feature few users will rely on daily. Worth keeping but not worth optimizing early.
- PDF branding (logo + color + custom footer) is nice-to-have at this stage. The time spent here would have been better spent on multi-tenancy scaffolding.

### Under-building detected (critical gaps):

- **No multi-tenancy**: The biggest gap. Every company shares the same database schema with no tenant isolation. You cannot sell to an accountant managing 20 clients without this.
- **No UBL 2.1 XML**: The entire compliance story — the reason to exist in 2026 — is not built. This is the core value proposition and it is missing.
- **No background workers**: Synchronous PDF/OCR in request threads will not survive production load.
- **No tests**: Zero test coverage visible. For a compliance product handling financial data, this is a liability.

### Critical Technical Risks:

1. **weasyprint on production**: Requires pango/cairo system libs. Works in Docker. Railway deployment needs these libs in the container — verify this is correctly set up before any demo.
2. **Azure Document Intelligence cost**: No hard cap or per-user budget tracking. A single user uploading 1,000 invoices can generate unexpected Azure bills.
3. **MongoDB Atlas free tier**: If on M0/M2, there are hard limits on connections and storage. Need to verify tier for production.

---

## 3. Market Reality Check

### Adoption Barriers

**Behavioral:**
- Moroccan SME owners are used to paper and Excel. They do not think in workflows.
- "Why do I need software for something I already do?" is the first objection. The DGI mandate is the only real answer — lean into it hard.
- Trust in cloud software with financial data is low. "My data is on someone else's server" is a real concern, especially for older business owners.

**Cultural:**
- Decision-maker is often the owner, not an employee. Sales cycles are personal and relationship-driven.
- Accountants (fiduciaires) are the gatekeepers. They recommend software to their clients. If you win the accountant, you win 20 clients at once.

**Legal (current gap):**
- Until DGI publishes the final technical specification for xHub integration, there is nothing to certify against. This creates a "wait and see" attitude in the market.
- Businesses that sign up early may feel burned if the spec changes. Manage expectations explicitly.

**Willingness to Pay:**
- Moroccan PMEs will pay for software that saves them from a fine or a government headache. They will not pay for convenience.
- Price point needs to be below 300 MAD/month for micro-businesses. Accountants will pay more (500–1,500 MAD/month) if it saves them hours per client.
- **Expectation of free tools is high**. Freemium with hard limits (e.g., 5 invoices/month free) is the only viable entry strategy.

### Will businesses realistically switch?

**Not yet. In 12 months, yes — if DGI enforcement becomes real.**

The window is: ship UBL 2.1 compliance before the mandate kicks in, get accountants using it, let them bring their clients along. That is the only go-to-market that works without massive sales spend.

---

## 4. Business Potential

### Classification: **Solid local SaaS with high-growth ceiling — conditional**

**The conditions:**
1. UBL 2.1 and DGI compliance ships before the mandate
2. Multi-tenancy ships before selling to accountants
3. The team has distribution (accountant relationships, CGEM connections, or fiduciaire network)

**Revenue potential (realistic, not optimistic):**

| Scenario | Customers | ARPU/yr | ARR |
|---|---|---|---|
| Base (solo SMEs) | 500 | 1,800 MAD | 900K MAD (~90K USD) |
| Accountant channel | 100 accountants × 10 clients avg | 6,000 MAD/accountant | 600K MAD |
| Both channels at scale | 2,000 SMEs + 300 accountants | blended | ~4M MAD ARR |

This is a 3–5M MAD ARR business within 3 years if executed well. Not a unicorn. A solid, profitable, defensible niche SaaS in an underserved market — which, in Morocco, is genuinely valuable.

**High-growth ceiling exists if**: Tunisia, Egypt, Senegal adopt similar e-invoicing mandates (likely). Same codebase, different DGI adapter. Regional expansion is realistic without full rebuild.

---

## 5. Founder Decision

### Decision: **Double down — but shift focus immediately**

**Reasoning:**

The product quality is real. The compliance timing is real. The gap in the market is real. This is not a solution looking for a problem.

But the team is currently polishing the wrong things. PDF branding, dashboard widgets, and UI polish are not what will win this market. The DGI compliance stack (UBL 2.1 → electronic signature → clearance submission) is the moat. Everything else is table stakes.

**If the founder spends the next 90 days building UBL 2.1 and getting a single accountant (fiduciaire) using the product with 5 real clients, this becomes a real business.**

If they spend the next 90 days adding features, fixing UI polish, and not talking to accountants, this becomes a portfolio piece.

The code is good. The roadmap is clear. The execution discipline is the variable.

---

## 6. Feature Strategy

### High-Leverage Features (build these, nothing else)

**1. UBL 2.1 Export — Ship this immediately**
The entire product's defensibility rests on being compliant before competitors. Every week this is not shipped is a week of lost positioning. The spec is written (`docs/UBL.md`). Build it.

**2. Accountant Mode (multi-tenancy lite)**
Let one accountant log in and switch between company profiles (their clients). Each company is isolated. The accountant can act on behalf of a client. This unlocks the entire fiduciaire distribution channel. Without this, you cannot sell to accountants. This is the highest-leverage architectural change.

**3. DGI Compliance Checklist / Readiness Score**
A dashboard widget showing: "Your company is X% DGI-ready." Checks ICE present, IF present, bank account present, invoices have required fields, UBL XML valid. Gamifies compliance and creates daily active usage reason before the mandate. High retention impact with zero backend complexity.

**4. Bulk Invoice Validation for Accountants**
Accountants do end-of-month reconciliation. A "validate all drafts" or "export all for DGI submission" batch action with a single confirmation is 10x more valuable to them than any UI polish. Build a workflow, not a CRUD interface.

**5. WhatsApp / Email Invoice Delivery**
After marking a vente as "sent," offer to send the PDF directly via email (SMTP) or generate a WhatsApp-shareable link. This removes a manual step that every business does after generating a PDF. Increases invoice-send volume, increases stickiness, and is a measurable engagement metric.

**6. TVA Declaration Pre-fill (Phase 4 but pull forward)**
Generate a pre-filled TVA declaration (Déclaration de TVA) from the TVA balance widget. Even a downloadable PDF pre-filled with Collectée/Déductible/Balance. This saves an accountant 30 minutes per client per quarter. This is the feature accountants will pay for.

### Features to Deprioritize:
- PDF logo/color branding (done, good enough, move on)
- Dashboard chart widgets (monthly revenue chart is nice but does not drive retention)
- Contact notes field (zero leverage)
- Tags on invoices (not asked for by users, probably)

---

## 7. Investment Decision

### Would I invest? **Yes, with conditions. Time before money.**

**I would invest time (advisory, network, introductions) immediately** if:
- The founder can articulate a clear path to 10 paying accountants in 90 days
- UBL 2.1 is on a committed 6-week delivery timeline
- There is genuine distribution plan (not "we'll do SEO")

**I would invest money** when:
- 10 accountants are actively using it with real client data
- UBL 2.1 is shipped and tested against DGI spec (when available)
- At least 3 accountants have referred another accountant unprompted (proof of word-of-mouth)

**I would not invest if:**
- The team is still building features without talking to accountants
- There is no plan for multi-tenancy before the first accountant sale
- The founder cannot name 5 specific fiduciaires they are in conversations with

**What milestones change the calculus:**
1. First 10 paying customers (any tier) → validated willingness to pay
2. UBL 2.1 compliance shipped and tested → technical moat established
3. First accountant managing 3+ clients on the platform → distribution channel proof

---

## 8. Execution Plan

### Next 30 Days — One Job Only

**Ship UBL 2.1 XML generation for outgoing invoices.**

- Implement `services/ubl.py` per the spec already in `docs/UBL.md`
- Add `GET /ventes/{id}/ubl` endpoint
- Validate output against UBL 2.1 XSD schema
- Add "Export UBL" button to validated ventes
- Do not touch dashboard, do not add new invoice fields, do not improve UI

**Parallel (non-dev):**
- Identify 10 fiduciaires in Casablanca / Rabat
- Book 5 demo meetings, bring a printed invoice generated by Voynich
- Ask one question: "If I handle DGI compliance for your clients automatically, what would you pay per client per month?"

### Next 90 Days — Multi-Tenancy + First Paying Accountant

**Technical:**
- Scaffold multi-tenancy: add `company_id` to all invoice/contact documents, scoped queries per company
- Accountant login: switch company context without re-login
- Background worker for PDF generation (Celery or simple Redis queue) — do this before demos at scale
- Add basic email delivery for ventes (SMTP, send PDF on "mark sent")

**Business:**
- Convert at least 1 accountant to a paying plan (even 200 MAD/month) with 3+ client companies on the platform
- Get 1 article or mention in a Moroccan accounting/tax newsletter or LinkedIn group
- Register in DGI's early adopter program if/when it opens

### Ignore Completely

- **Mobile app**: PME owners do not manage invoices on phones. They do it at a desk.
- **Integration marketplace** (connect to WooCommerce, Shopify, etc.): Wrong customer profile. Moroccan PMEs are not running e-commerce stacks.
- **AI features beyond OCR**: "AI-powered insights" on your invoices sounds good in a pitch deck. No Moroccan accountant cares.
- **Multi-currency beyond MAD/EUR/USD**: Adds model complexity for near-zero use cases.
- **White-labeling for banks**: Too early, wrong leverage point, distraction.
- **Consumer-facing features**: This is B2B. Do not build anything that makes it feel B2C.
- **Any further UI polish until 10 paying customers exist.**
