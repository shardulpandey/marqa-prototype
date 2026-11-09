# MARQA Pipeline — UI prototype

A clickable design prototype of MARQA Pipeline as a product. Since 5 Nov 2026 it carries **every module, field, rule and message of the live app at ops.marqa.co.in (v2.7.0, schema 22, commit 543cb5e)**, redesigned, plus the SaaS modules planned around it. It is plain HTML, CSS and JS with in-memory demo data and no backend; state lasts until you reload. It is not the product build (that is planned on MERN).

## Open it
- Serve this folder over http, e.g. `python -m http.server 8834`, then open http://localhost:8834/. The service worker and install prompt need http(s).
- To add it to a phone home screen it has to be on HTTPS (a Hostinger subdomain, GitHub Pages…), then Chrome "Install app" or Safari Share > Add to Home Screen.
- **Prototype map**: grid icon at the foot of the sidebar, or More > Prototype map on a phone. It links every flow.
- **View as**: click the name at the foot of the sidebar (More > View as on a phone) to see the app as Founders, Sales, Ops or Marketing. Navigation, dashboard tiles, money, masked phones, read-only fields and permitted stage moves all follow the role, and Settings > Access changes them live.

## What it covers
| Area | From the live app | Added for the product |
|---|---|---|
| Deal record (`#/deal/<id>/<tab>`) | One record from enquiry to delivery on the 18-stage ladder; the SOP panel with all 57 stage checks (system-proven vs ticked by hand, hints); every move gate and message; founder override; lost / expired / cancelled with reasons; tabs Overview · Quote · Order & QC · Billing · Activity; quote builder with the Excel maths, rate-sheet and labour-matrix auto-fill, versions, 24 h validity and 2-day re-price, share by PDF / WhatsApp L3 / in store; international size double-check; karigar order sheet with its missing-fields list; the 33-point QC form with variance and budget status; payments, corrections, voids, invoice; timeline, quick log, templates rendered from the record; quote PDF and karigar sheet previews; duplicate and delete to Trash | Suggested next step; payment link |
| Leads, Pipeline, Orders, Quotes | Nine-field capture (+ More), source codes, abroad → INTL + NRI, met in person, duplicate check; board / list with source, type and stage filters, SLA and late badges | Voice capture; production board with material status; quotes list |
| Dashboard, Reports, Contacts | Tiles and cards per role with the live formulas, needs-attention, today lists, funnel, spillage, cycle times; walk-in × purchase matrix and client profiles; contact card with profile, merge, duplicates, Google CSV | Morning briefing, DPDP card |
| Demand, Stock | Material issue to karigars (metal and stones, from stock), founders' reverse; stock ledger for diamonds, gems, lots and jewellery with every move, refusal and import / undo | Certificate reader, memo due dates |
| Messages, Data, Settings | All templates by journey, Due now, editor; import / export / Google Sheet / Zoho / backup / Trash / audit; metal rates, rate sheets, Rules, all 32 Options lists, Access matrix with sensitive keys, People, session | Business, Workflow, Integrations, Compliance, Plan |
| SaaS modules | — | WhatsApp inbox with AI, campaigns, Shopify custom-order popup, AI Studio, gold savings schemes, counter billing, karigars, client portal, Ask MARQA assistant, sign-up wizard, plans |

## Files
- `js/model.js`: the live app's rules as constants (stages, checklists, picklists, permissions, QC, templates, settings).
- `js/records.js`: demo records (people, contacts, 28 deals across all 18 stages, stock and ledger, audit, trash, imports). All people and numbers are made up.
- `js/logic.js`: behaviour (quote maths, money, checklist proof, move gates, size conversion, roles and masking, actions). `NOW()` keeps the prototype on 4 Nov 2026.
- `js/screens-*.js`: one file per area; `app.js` is the shell, router, nav, search and install prompt. `data.js` holds the SaaS demo data.
- `css/app.css` (design system) plus one stylesheet per area.
- The live-app inventory these screens follow: `..\research\pipeline-inventory\` (model.md, screens-1.md, screens-2.md, BUILD_CONTRACT.md).

## Checking it
With the server running:
- `node tools/smoke.mjs` loads every script outside the browser (only a DOM error from the boot is expected).
- `node tools/audit.mjs [route,route]` crawls every route at desktop and phone width, clicks every action and reports dead controls, missing actions, script errors, broken routes and "undefined"/"NaN" text (`_shots/audit*.txt`).
- `node tools/shoot.mjs [filter]` screenshots the scenarios; `tools/shoot-dash|stock|settings|saas.mjs` cover each area in depth. `tools/sheet.py` tiles shots into contact sheets. `tools/eval.mjs '#/route' 'expression'` evaluates something on a page (in Git Bash prefix with `MSYS_NO_PATHCONV=1`).
- After editing, bump `VERSION` in `sw.js` (the shell list is generated from index.html).
