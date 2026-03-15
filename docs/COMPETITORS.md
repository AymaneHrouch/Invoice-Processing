# COMPETITORS.md — Moroccan E-Invoicing Competitor Landscape

Last updated: March 2026

---

## 1. Hisab.ma — Primary Direct Competitor

**URL**: hisab.ma
**Positioning**: "Morocco's Modern E-Invoicing Platform for SMEs & Accountants"
**Tech stack**: Next.js 16, PostgreSQL, TypeScript, WebSocket, PWA
**Status**: Live (MVP), 500+ active businesses claimed, 50K+ invoices processed

### Features (Shipped)

| Feature | Details |
|---------|---------|
| Invoice creation | Customizable, branded invoices with automated tax calculations |
| Bilingual PDFs | French and Arabic (full RTL support) |
| Customer management | B2B and B2C database with ICE validation |
| UBL 2.1 export | XML export ready for DGI submission |
| 10-year archive | Immutable storage with SHA-256 integrity chains |
| Multi-org console | Accountants manage multiple client companies from one dashboard |
| Reports & analytics | Revenue, outstanding payments, business performance |
| Team collaboration | Role-based access, granular permissions, audit trail |
| Bulk import | Excel/CSV import for invoices, expenses, products |
| REST API + SDK | Full TypeScript SDK, webhook events |
| Multilingual | French, Arabic (RTL), English — full interface + invoices |
| Email & SMS notifications | Send invoices directly to customers |
| Payment tracking | Track invoice status and settlements |

### Features (In Progress / Coming Soon)

| Feature | Status |
|---------|--------|
| Expense tracking | In progress |
| Advanced reports | In progress |
| Mobile app (PWA) | In progress |
| DGI direct integration | In progress |
| Payment links (CMI) | Coming soon |
| AI assistant | Coming soon |
| Accounting export | Coming soon |
| Inventory management | Coming soon |

### Future Roadmap

Point of Sale, Payroll/CNSS, App marketplace, Franchise management

### Pricing

| Plan | Price (annual) | Limits |
|------|---------------|--------|
| Starter | 124 MAD/month | 200 invoices/month, 1 user |
| Pro | 291 MAD/month | 1,000 invoices/month, 3 users, API access |
| Accountant | 832 MAD/month | Unlimited invoices, 10 client entities |
| Enterprise | Custom | Unlimited everything, data residency in Morocco |

14-day free trial, no credit card required.

### Strengths
- Already live and shipping fast
- Very polished marketing and UX
- Bilingual (FR/AR) with proper RTL — most competitors don't have this
- Multi-org for accountants is a strong distribution play
- REST API + TypeScript SDK shows developer-first mindset
- PostgreSQL (not MongoDB) — good for relational invoice data
- Public roadmap builds trust

### Weaknesses / What They DON'T Have
- **No AI parsing / OCR** — you must manually enter all incoming invoices
- **No incoming invoice management (Achats)** — focused entirely on emission (Ventes)
- **No scanned document upload** — can't handle paper/PDF invoices from suppliers
- **DGI integration is "in progress"** — not live yet, same as everyone
- **Testimonials appear fabricated** — names like "Youssef Alami" and "Café Moderne" look generic
- **500+ businesses claim** — hard to verify, may be signups not active users
- **Help center is nearly empty** — only 3 articles total
- **No Darija support** — French/Arabic/English but no Moroccan Arabic

---

## 2. Vouch.ma — Infrastructure Competitor (Different Category)

**URL**: vouch.ma
**Positioning**: "Technical gateway for UBL 2.1 compliant e-invoicing"
**Type**: API/infrastructure layer (B2B2B), not end-user app
**Status**: Pre-launch, building sandbox

### What They Do
- API endpoint to submit invoice data → returns UBL 2.1 XML
- Electronic signature integration (HSM modules, FIPS 140-2 Level 3)
- DGI xHub clearance submission
- Real-time status tracking (Submitted, Validated, Rejected)
- Accountant multi-client console

### What They DON'T Do
- No invoice creation UI for businesses
- No AI parsing / OCR
- No customer/contact management
- No dashboard or analytics

### Relevance to Voynich
Not a direct competitor — potential integration partner. Voynich could use Vouch.ma's API for DGI clearance instead of building it in-house.

---

## 3. Other Moroccan Players

### Facturis (site.facturis.ma)
- SaaS invoicing for TPE/PME
- Basic invoice creation, devis, bons de commande
- Claims DGI readiness (UBL/CII, electronic signature)
- Simple UI, limited features
- No AI, no OCR, no incoming invoice management

### Sogress (sogress.com)
- Cloud commercial management (facturation + stock + CRM + POS)
- Moroccan-specific (ICE, RC, IF, Patente, TVA)
- Targets TPE/PME and auto-entrepreneurs
- Claims "facture en moins d'une minute"
- No AI, no OCR, no UBL export mentioned

### EFacture Express / Bravico (bravico.ma)
- Interesting middleware approach: "keep your Excel/ERP, we make it compliant"
- Import Excel → automatic DGI compliance checks → validation
- Free during pilot phase
- No AI parsing, but the "keep your existing tools" angle is smart

### einvoice.ma
- Basic online invoicing tool
- French/Arabic/English
- Moroccan TVA handling
- Free/freemium model
- Very basic — no UBL, no DGI integration, no AI

### Sage Maroc
- Enterprise accounting/ERP (dominant in medium/large businesses)
- Will certainly add DGI e-invoicing compliance
- Expensive (15,000-40,000 MAD/year)
- Overkill for TPE/small PME

### Dolibarr (open source, configured for Morocco)
- Free ERP with Moroccan localization
- Requires technical setup
- No AI, no DGI integration built-in

---

## 4. Voynich Competitive Positioning

### What Only Voynich Has (Potential Moat)

| Capability | Voynich | Hisab | Facturis | Sogress | Vouch |
|-----------|---------|-------|----------|---------|-------|
| AI invoice parsing (OCR) | **YES** | No | No | No | No |
| Scanned/photo invoice upload | **YES** | No | No | No | No |
| Incoming invoice management | **YES** | No | No | No | No |
| Azure DI + Moroccan regex | **YES** | No | No | No | No |

### Where Voynich Needs to Catch Up

| Capability | Voynich | Hisab |
|-----------|---------|-------|
| Bilingual invoices (FR/AR) | No | **YES** |
| UBL 2.1 export | No | **YES** |
| Multi-org for accountants | No | **YES** |
| REST API / SDK | No | **YES** |
| Team collaboration + roles | Basic | **YES** |
| 10-year compliant archive | No | **YES** |
| Bulk import (Excel/CSV) | No | **YES** |
| Payment tracking UI | Basic | **YES** |
| Mobile experience | No | **In progress** |
| DGI direct integration | No | **In progress** |

### Voynich's Strategic Positioning

**Short version**: Hisab helps you CREATE invoices. Voynich helps you CREATE AND RECEIVE invoices with AI.

**The full pitch**: "Hisab is great if you only send invoices. But every business also receives dozens of supplier invoices every month — messy PDFs, scanned documents, paper receipts. Hisab can't handle those. Voynich uses AI to read your supplier invoices, extract the data automatically, and organize everything — both your sales and your purchases — in one place. One app for all your invoices, not just the ones you send."

### Priority Features to Build (based on competitive gap)

1. **Company profile + contact directory** — table stakes, Hisab already has this
2. **Outgoing invoice creation with proper Moroccan fields** — match Hisab's emission flow
3. **Bilingual PDF generation (FR/AR)** — critical for Moroccan market, Hisab's strong point
4. **UBL 2.1 export** — compliance requirement, Hisab already ships this
5. **Sequential numbering** — legal requirement Hisab handles automatically
6. **Improve AI parsing reliability** — this is the MOAT, make it unbeatable
7. **Mobile-friendly UI** — businesses use phones for everything in Morocco

### What NOT to Build (Hisab is ahead, focus elsewhere)

- Multi-org accountant console (nice but not your initial market)
- REST API / TypeScript SDK (build for end users first)
- App marketplace / franchise management (way too early)
- Point of Sale / Payroll (completely different products)

---

## 5. Key Takeaway

Hisab is building the **emission-first** invoicing tool. Clean, polished, well-marketed. But they're ignoring the entire **reception side** — which is half of every business's invoice reality.

Voynich's unique position is being the only Moroccan tool that handles BOTH sides with AI on the reception side. This is a genuine differentiation, not a marketing spin. No competitor in the Moroccan market does this.

The risk: Hisab could add OCR/AI parsing to their roadmap (they list "AI Assistant" as coming soon). The defense: your Azure DI pipeline with Moroccan-specific extraction (ICE regex, TVA patterns, Arabic text cleaning, multi-provider OCR factory) is not trivial to replicate. Build it deeper, make it more reliable, accumulate training data from real Moroccan invoices — that's your moat.
