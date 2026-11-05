# What remains after SQL 01–07 and creating your super admin

Keep your existing project, users and super admin assignment. Do not rerun the bootstrap or create duplicate users.

## 1. Apply the remaining upgrade

Open Supabase → SQL Editor → New query. Paste all of [08-security.sql](../supabase/sql/08-security.sql) and Run. It adds server request quotas and routes public enquiries/newsletter submissions through a protected Edge Function. It preserves staff accounts, roles, content and orders.

Deploy the functions and updated website together: SQL 08 blocks the old direct browser form submissions. Until the new function is deployed, those submissions will fail safely.

## 2. Deploy the four functions

Follow the exact commands in [Deployment, section 5](DEPLOYMENT.md#5-apply-the-security-upgrade-and-deploy-the-server-functions):

- `submit-public-form` — required for enquiries, volunteer/donation enquiries and newsletter subscriptions.
- `create-checkout` — creates or resumes an authenticated order.
- `verify-payment` — verifies payment signatures and payment status.
- `payment-webhook` — processes signed payment notifications.

The supplied `supabase/config.toml` disables the gateway JWT check for these endpoints; customer functions verify authentication internally, and the webhook verifies its signature. Preserve those internal checks.

## 3. Set credentials in the correct places

| Location | Values |
| --- | --- |
| Local `.env.local` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` |
| Hosting build environment | The same two public `VITE_` values, then rebuild |
| GitHub repository Actions variables, if using CI | The same two public `VITE_` values |
| Supabase Edge Function secrets | `ALLOWED_ORIGINS`; Razorpay secrets when enabling payments |

For production set `ALLOWED_ORIGINS=https://kcg.b2bindustrial.in`. Add your exact local origins while developing, such as `http://127.0.0.1:5173` and `http://127.0.0.1:4173`, separated by commas. These are origins with no trailing slash or page path.

For payments set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and a separate `RAZORPAY_WEBHOOK_SECRET`. Supabase supplies its own server credentials inside hosted functions. Never put service-role keys, staff passwords, database passwords or Razorpay secrets in frontend `VITE_` variables or GitHub source. [Supabase secrets documentation](https://supabase.com/docs/guides/functions/secrets).

## 4. Finish authentication settings

- Site URL: `https://kcg.b2bindustrial.in`.
- Customer redirect allowlist: `https://kcg.b2bindustrial.in/account.html` and `https://kcg.b2bindustrial.in/checkout.html`.
- Keep TOTP MFA enabled. Sign in with the existing staff account and complete authenticator enrolment.
- Configure custom SMTP and test customer sign-in emails with an address outside your project team. Supabase’s default mail service is restricted and is unsuitable for general production delivery. [SMTP setup](https://supabase.com/docs/guides/auth/auth-smtp).
- Check the existing `admin_users` membership has `role = super_admin` and `enabled = true`. Customer registration does not grant staff access.

## 5. Verify storage and permissions

Run [after-setup.sql](../supabase/checks/after-setup.sql) in SQL Editor after 08. This is a read-only diagnostic, not a ninth migration. Expect:

- `sql_08_quota_function_installed = true`.
- Your enabled super admin appears in the role counts.
- `kcg-media`: 2,097,152 bytes; `kcg-films`: 52,428,800 bytes; `kcg-captions`: 262,144 bytes.
- RLS (`rowsecurity`) is true on the listed application tables.
- The three direct-public-access privilege results are false.
- Foundation name is `KCG Foundation`.

Use Supabase Security Advisor too. Then test an enquiry, newsletter subscription and staff draft/media save with your own test content. Confirm a signed-out visitor cannot modify staff content. The connected Supabase account available during this work did not list the project configured in this website, so its installed SQL, staff membership and function deployment could not be independently confirmed. No hosted project was changed.

## 6. Enable payments when ready

Follow [Razorpay setup](RAZORPAY-SETUP.md) for merchant activation, Route, verified maker linked accounts, webhook setup and test payments. Publishing the frontend or connecting Supabase does not activate payments. Start in test mode; confirm maker allocation and order reconciliation before switching to live keys.

## 7. Rebuild after publishing content

Public pages contain a build-time snapshot of published content for fast loading and indexing, then refresh from Supabase in the browser. Rebuild/redeploy after publishing foundation content, stories, products or maker profiles so the initial HTML and sitemap also update. Prices and checkout availability are checked live before payment.
