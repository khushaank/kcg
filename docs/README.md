# KCG Foundation — community care and maker collection

All project guides and templates are together in this folder. Production website: **https://kcg.b2bindustrial.in**.

## Start here

| Guide | Use it for |
| --- | --- |
| [Deployment and credentials](DEPLOYMENT.md) | GitHub, Netlify, the production domain, Supabase variables and Edge Functions |
| [First-time Supabase setup](SETUP.md) | SQL order, staff accounts, roles and MFA |
| [Remaining Supabase steps](SUPABASE-REMAINING.md) | What to do after SQL 01–07 and assigning your super admin |
| [SEO and Lighthouse](SEO.md) | Search metadata, performance work, reports and audit commands |
| [Error handling](ERROR-HANDLING.md) | Recovery behaviour and failure checks |
| [Staff workspace](ADMIN.md) | Managing foundation content, makers, products and orders |
| [Razorpay setup](RAZORPAY-SETUP.md) | Merchant account, Route, maker accounts, secrets and test payments |
| [Security](SECURITY.md) | Protections, browser warnings and release checks |
| [Entry and upload limits](DATA-LIMITS.md) | Image/video sizes, text and numeric restrictions |
| [Media checklist](MEDIA-CHECKLIST.md) | Which photographs, films and stories to prepare |
| [Media delivery instructions](MEDIA-INBOX.md) | How to organise files in the media intake folder |
| [Maker details template](MAKER-DETAILS-TEMPLATE.md) | Copy-ready prompts for maker and product information |
| [Asset credits](ASSETS.md) | Original and illustrative image sources |
| [Generated rural illustrations](GENERATED-IMAGES.md) | Installed assets, disclosures and generation prompts |

Commands in these guides run from the project root, `A:\Software\KCG-main`, unless stated otherwise. SQL remains in [supabase/sql](../supabase/sql/), and incoming media belongs in [media-inbox](../media-inbox/).

A foundation-led website centred on KCG’s education, nutrition and community work, with a supporting maker collection. Products put the maker’s film, portrait, life story, style, process and provenance first. Built with Vite, plain JavaScript, CSS and Supabase. No application server is needed for the website; sensitive payment operations run in Supabase Edge Functions.

For the complete first-time walkthrough, start with **[SETUP.md](SETUP.md)**. For the photos, films and stories to supply, use **[MEDIA-CHECKLIST.md](MEDIA-CHECKLIST.md)**. Your original logo is used intact throughout the site.

## Start here

Use Node.js 24 or newer (the test runner imports the Edge Function TypeScript directly).

```powershell
npm install
npm run dev
```

Open the local URL printed in the terminal. Without credentials, the website runs as an explicitly labelled **preview collection**. Sample pieces and studio profiles illustrate the experience; they cannot accept payments. Your original foundation journal and healthcare photographs are retained. No Supabase project has been modified.

## Where to add your Supabase credentials

Copy `.env.example` to **`.env.local` in this folder**:

```dotenv
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

Find these in your Supabase project's Connect dialog / API settings. Use a **publishable key**, not a secret or service-role key. Vite embeds these two public values in the browser build. Restart the dev server after changing them, and rebuild before deploying. `.env.local` is ignored by Git.

## Supabase setup

For publishing and credentials, use **[DEPLOYMENT.md](DEPLOYMENT.md)**. For the exact Razorpay accounts to create, use **[RAZORPAY-SETUP.md](RAZORPAY-SETUP.md)**. **[SECURITY.md](SECURITY.md)** describes the implemented protections, release checks and remaining hosting responsibilities.

Use a new Supabase project. In **SQL Editor**, run the supplied files in this order:

1. `supabase/sql/01-schema.sql` — makers, products, journal, carts, orders, payment records, enquiries, subscriptions, permissions and RLS.
2. `supabase/sql/02-content.sql` — the four existing KCG journal articles. This file can be rerun safely.
3. `supabase/sql/03-storage.sql` — public image bucket.
4. `supabase/sql/04-maker-stories.sql` — maker biographies, portraits, films, process and 2–3 image galleries.
5. `supabase/sql/05-admin.sql` — initial staff membership, foundation content and media uploads.
6. `supabase/sql/06-staff-roles.sql` — super admin / manager / editor access, mandatory password + MFA, and fresh-sign-in checks.
7. `supabase/sql/07-content-limits.sql` — locked foundation name, 2 MB images, 50 MB films, 256 KB captions, and content/quantity limits.
8. `supabase/sql/08-security.sql` — server-only public forms and private atomic request quotas.

If you already ran 01–07, run only 08 now, then deploy the updated functions and frontend together. For a new project run all eight in order. File 05 cannot be rerun after 06. Follow **[SETUP.md](SETUP.md)** to create accounts and assign access. **[DATA-LIMITS.md](DATA-LIMITS.md)** lists every media/content limit and where it is enforced.

The schema file is a one-time bootstrap, not an automatically rerunnable migration. Do not apply it over unrelated existing tables. Every table has RLS; public users can read published content, authenticated customers can access only their own cart/orders, and payment-account IDs are server-only. The SQL explicitly grants the required API operations. Run Supabase's Security Advisor after applying it.

In **Authentication → URL Configuration**, set your production Site URL and add exact redirect URLs:

```text
http://127.0.0.1:5173/account.html
http://127.0.0.1:5173/checkout.html
https://kcg.b2bindustrial.in/account.html
https://kcg.b2bindustrial.in/checkout.html
```

Enable email sign-in, keep the default magic-link template, and configure production SMTP for reliable delivery. Customers use email links, with no password to remember. Configure Supabase Auth's rate limits and CAPTCHA as appropriate for your launch traffic.

## Manage everything from the director’s workspace

Open **/seva-karyalaya-7c9e4b2d.html**. Create your email/password account in Supabase Authentication, assign its role through `admin_users`, and enrol an authenticator at first sign-in. See **[SETUP.md](SETUP.md)**. Staff tokens stay in memory only and do not share customer sign-in storage. Reload/close requires signing in again. Ordinary customers cannot access private staff records or write content.

The workspace provides forms for the foundation’s mission, legacy, home introduction, programs, contact details, makers, portraits, life stories, personal styles, product films, transcripts, process steps, 2–3 product photographs, provenance, practical details, pricing, stock and journal stories. Uploads go directly to Supabase Storage under admin-only policies. Editors prepare drafts; managers and super admins publish. Only super admins can change payout settings. Roles are assigned only in Supabase.

Prices are entered in rupees in the editor and stored as integer paise. The first product photograph is used in cards/cart. A published product requires a complete published maker profile, a making film and transcript, at least two images, process and core details. The sample collection remains illustrative; no fabricated biographies or unrelated people are published as actual makers.

## Payments and direct maker allocations

Supabase stores the commerce data; **Razorpay Route** handles checkout and linked-maker transfers. Supabase is not itself a payment processor. This implementation sends the full product amount to each maker's linked account and charges **zero foundation commission**. Configure and fund payment-provider fees through your foundation's merchant arrangements; a provider fee is not silently deducted by this code. Bank settlement follows Razorpay's schedule and approval requirements.

Before accepting money:

1. Activate Razorpay Standard Checkout and **Route**, complete merchant onboarding and onboard each maker as a verified linked account. Use test mode first. Enable automatic capture.
2. Add each maker's `acc_…` linked-account ID to `maker_payment_accounts` and enable that row. These records are private to server operations and authorised super admins; ordinary customers/editors/managers cannot read them.
3. In **Supabase → Edge Functions → Secrets**, add:

```dotenv
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY
RAZORPAY_KEY_SECRET=YOUR_PRIVATE_SECRET
RAZORPAY_WEBHOOK_SECRET=YOUR_SEPARATE_WEBHOOK_SECRET
ALLOWED_ORIGINS=http://127.0.0.1:5173,https://kcg.b2bindustrial.in
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to hosted Edge Functions by Supabase. Never put server secrets in `.env.local` with a `VITE_` prefix or in a public file.

4. Deploy the supplied functions using the Supabase CLI or dashboard. The checked-in `supabase/config.toml` disables gateway JWT checking because the two customer functions explicitly validate the bearer token against Supabase Auth, and the provider webhook uses HMAC verification.

```powershell
npx --yes supabase@3.0.0 functions deploy create-checkout --remote=YOUR_PROJECT_REF --use-api --no-verify-jwt
npx --yes supabase@3.0.0 functions deploy verify-payment --remote=YOUR_PROJECT_REF --use-api --no-verify-jwt
npx --yes supabase@3.0.0 functions deploy payment-webhook --remote=YOUR_PROJECT_REF --use-api --no-verify-jwt
npx --yes supabase@3.0.0 functions deploy submit-public-form --remote=YOUR_PROJECT_REF --use-api --no-verify-jwt
```

5. In Razorpay, add the webhook URL `https://YOUR-PROJECT.supabase.co/functions/v1/payment-webhook`, use the separate webhook secret, and subscribe to `payment.captured` and `order.paid`. Keep webhook retry delivery enabled.
6. Run a complete **test-mode** multi-maker order. Confirm that server totals, reserved stock, a verified paid order and maker transfer allocations match. Then use your live keys and corresponding live linked accounts.

Client prices are never trusted. A service-only PostgreSQL function checks published listings and payout readiness, locks stock, snapshots prices and reserves items in one transaction. Verified customer identity is checked in each customer Edge Function. HMAC verification and a provider-side captured-payment lookup protect payment confirmation. Repeated requests and webhook deliveries do not create duplicate orders or reserve stock twice.

### Operations you will manage

- Use the workspace to view orders, items, enquiries/applications, and newsletter consent (or inspect those tables in Supabase). Newsletter collection stores consent; sending campaigns is a separate process.
- Update fulfilment status to `shipped` or `delivered` in the workspace and contact customers using their order details. Automated courier booking and transactional shipping email are not included.
- Review `creating_payment`, `payment_setup_review` and abandoned `pending_payment` orders. Inventory is deliberately **not** automatically released while a Razorpay order could still receive a payment. Reconcile uncertain provider requests by the KCG UUID in the Razorpay order receipt/notes. Relink an existing provider order instead of creating a second one. Release stock only after ruling out payment and preventing later payment against that provider order.
- Refunds, transfer reversals, disputes and settlement reconciliation are managed in the Razorpay dashboard. Update the KCG order to `refunded` or `partially_refunded` after confirming the provider result; decide stock restoration based on the returned piece. The paid webhook is not a refund or settlement ledger.
- Customers can continue an unpaid order using **Continue payment** in their account, without creating another reservation. An abandoned checkout can reserve stock; review these orders operationally. A same-tab retry with unchanged delivery details reuses the checkout key. Do not instruct a customer to pay again when verification is pending.
- Donation forms record **enquiries**, not payments or donation receipts. Mock bank/UPI details from the old site are not used.
- Newsletter/enquiry submissions use the validated, rate-limited public-form function after SQL 08. Direct browser inserts are revoked. Checkout is throttled per verified customer. Host/CDN traffic controls remain separate from these application limits.

## Build and hosting

```powershell
npm test
npm run build
npm run preview
```

Deploy the contents of **`dist/`**, not the raw source folder, to any static host at the domain root. All existing `.html` foundation URLs remain available. Set the two `VITE_` environment values in your host's build settings if building there. `.htaccess` is included for Apache. For a subdirectory deployment, adjust Vite's base and root-relative asset paths first.

Preview images are local, with credits in `ASSETS.md`. Google Fonts is the only external styling request; fallback system fonts work if it is unavailable. The original root `style.css`, `script.js`, original images and journal JSON remain in the checkout for reference; the new site uses `src/` and `public/`.

## Validation

The tests run the actual SQL inside embedded PostgreSQL (PGlite), covering permissions, cross-customer isolation, server-side prices, stock rollback, duplicate requests, payment amount mismatches and idempotent notifications. Cart and payment-signature checks run under Node. The production build is verified separately. Hosted Auth email delivery/MFA, live Storage policies and Razorpay merchant transfers require your configured projects and test-mode validation.

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [email sign-in](https://supabase.com/docs/guides/auth/auth-email-passwordless), [Edge Function secrets](https://supabase.com/docs/guides/functions/secrets), [Razorpay Route transfers](https://razorpay.com/docs/api/payments/route/create-transfers-orders/).
