# Put the code on GitHub and publish the website

Production domain: **https://kcg.b2bindustrial.in**. All project guides are indexed in [README.md](README.md).

| Setting | Exact value |
| --- | --- |
| Supabase Auth Site URL | `https://kcg.b2bindustrial.in` |
| Customer account redirect | `https://kcg.b2bindustrial.in/account.html` |
| Checkout redirect | `https://kcg.b2bindustrial.in/checkout.html` |
| Production Edge Function `ALLOWED_ORIGINS` | `https://kcg.b2bindustrial.in` |
| Staff workspace | `https://kcg.b2bindustrial.in/seva-karyalaya-7c9e4b2d.html` |

Set these values in Supabase when publishing; changing the source files does not change your dashboard settings. If still testing locally, add `http://127.0.0.1:5173` to the allowed-origin secret and retain the local Auth redirect entries as well.

Use GitHub for the source repository and **Netlify for this website**. The included `netlify.toml` builds and publishes only `dist/`. GitHub Pages is unsuitable for the live store and staff password flow: its [usage limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) restrict ecommerce and sensitive transactions. Netlify supports the security headers this build generates. You do not need to buy hosting before trying its available plan; review the provider's current quotas and pricing for your usage.

## 1. Update your GitHub repository

The repository configured in this folder is `khushaank/KCG-foundation`. Push your source changes using your normal Git client. Include `docs/`, `src/`, `public/`, `scripts/`, root HTML files, `supabase/`, tests, `package.json`, `package-lock.json`, `vite.config.js`, `.github/` and `netlify.toml`. All Markdown guides now live in `docs/`; open `docs/README.md` for the index.

**Do not upload `.env.local`, `.env` files, passwords, payment secrets, database passwords, `node_modules/`, `artifacts/` or `media-inbox/`.** Git ignores those local files, but manual browser uploads can still include them if you select them. The tracked `.env.example` contains placeholders only and can be uploaded. Do not publish the raw project directory as a website.

Use a unique password/passkey and two-factor authentication for GitHub, Supabase, Netlify and Razorpay. Keep recovery codes privately. Protect your production branch with review and the `Website checks / check` CI check before merging. Dependabot proposes dependency/security updates weekly; review and test them before release.

## 2. Add the two public Supabase values on GitHub

1. Open your repository → **Settings → Secrets and variables → Actions**.
2. Open **Variables** → **New repository variable**.
3. Add `VITE_SUPABASE_URL` with your project URL, for example `https://YOUR-REF.supabase.co`.
4. Add `VITE_SUPABASE_PUBLISHABLE_KEY` with your project's `sb_publishable_…` key.
5. Push a change or run **Actions → Website checks → Run workflow**.

The included workflow uses these repository **variables** for its build. They are public browser configuration, so hiding them in a GitHub Secret would not hide them from visitors after compilation. A Supabase publishable key does not confer staff permissions; RLS and verified Auth identity enforce access. [GitHub variables](https://docs.github.com/en/actions/learn-github-actions/variables), [Supabase API keys](https://supabase.com/docs/guides/api/api-keys).

If you need a real GitHub Actions secret for a future server deployment, use the **Secrets** tab → **New repository secret**, and reference it through `secrets.NAME` only in the trusted server job. This repository's frontend workflow does **not** require Razorpay secrets, the Supabase service-role key, a database password or a personal access token. Do not add them to this build. [GitHub secret instructions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets).

## 3. Connect Netlify to GitHub

1. Sign in to Netlify and choose **Add new project / Import an existing project**.
2. Choose GitHub and authorise access to **only the KCG repository** when possible.
3. Select `KCG-foundation` and your production branch, normally `main`.
4. Keep the repository root as the base directory. The checked-in configuration sets:
   - Build command: `npm run build:production`
   - Publish directory: `dist`
   - Node: `24`
5. In the project's **Environment variables**, add the **same two values** `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the build/production context. GitHub Actions variables do not automatically transfer to Netlify.
6. Deploy. In the Netlify project's domain settings, add **`kcg.b2bindustrial.in`** as the primary custom domain. Follow the DNS record instructions Netlify displays in the DNS settings for `b2bindustrial.in`; use the target supplied for your actual project. Complete HTTPS provisioning, then make a fresh production deploy after any variable change. Never put private server secrets in `VITE_` variables.

The production build refuses missing/invalid public configuration or secret/service-role credentials in browser variables. Its security check verifies the finished bundle and generates `_headers` with your exact Supabase origin. Netlify serves these as HTTP headers. Staff, account and checkout pages use `no-store`. [Netlify environment variables](https://docs.netlify.com/build/configure-builds/environment-variables/), [custom headers](https://docs.netlify.com/manage/routing/headers/).

If you manually upload a build, upload only `dist/` including `_headers`. Keep root-relative URLs at the domain root; do not deploy under a GitHub project subfolder. Apache deployments can use the generated `dist/.htaccess`. A different host needs equivalent response headers.

## 4. Update Supabase for the production URL

1. **Authentication → URL Configuration:** set Site URL to `https://kcg.b2bindustrial.in`.
2. Allow these exact redirect URLs for customer email sign-in:
   - `https://kcg.b2bindustrial.in/account.html`
   - `https://kcg.b2bindustrial.in/checkout.html`
3. Keep local redirects only if still developing. Avoid broad production wildcard redirects. The staff password/MFA page does not require a magic-link redirect.
4. Configure production email delivery/SMTP, Auth rate limits and verified email sign-in. Keep TOTP MFA enabled. Assign staff roles through `admin_users`, as shown in [SETUP.md](SETUP.md).

## 5. Apply the security upgrade and deploy the server functions

You already ran SQL 01–07. In **Supabase → SQL Editor → New query**, paste all of **[08-security.sql](../supabase/sql/08-security.sql)** and press **Run**. Do not rerun 01 or 05. If starting a new project, run 01–08 in order.

Then deploy **all four updated functions** from this repository. The commands below use the verified **Supabase CLI 3.0.0** through `npx`, so no separate CLI installation or Docker is required. Log in on your own account, and run these from `A:\Software\KCG-main`:

```powershell
npx --yes supabase@3.0.0 login
npx --yes supabase@3.0.0 functions deploy create-checkout --remote=YOUR_PROJECT_REF --use-api --no-verify-jwt
npx --yes supabase@3.0.0 functions deploy verify-payment --remote=YOUR_PROJECT_REF --use-api --no-verify-jwt
npx --yes supabase@3.0.0 functions deploy payment-webhook --remote=YOUR_PROJECT_REF --use-api --no-verify-jwt
npx --yes supabase@3.0.0 functions deploy submit-public-form --remote=YOUR_PROJECT_REF --use-api --no-verify-jwt
```

`YOUR_PROJECT_REF` is the part before `.supabase.co`. CLI 3 uses `--remote=…`; older CLI 2 examples using `--project-ref` do not apply to these pinned commands. `--use-api` bundles on Supabase without Docker. `--no-verify-jwt` matches the supplied config: the public submission function is intentionally callable without a customer session, checkout functions verify the customer's bearer token themselves, and the webhook verifies Razorpay's HMAC signature. Do not remove the checks inside the functions.

In **Supabase → Edge Functions → Secrets**, set:

| Secret | Value |
| --- | --- |
| `ALLOWED_ORIGINS` | Your exact comma-separated origins, for example `https://kcg.b2bindustrial.in,http://127.0.0.1:5173` |
| `RAZORPAY_KEY_ID` | Test key ID first; live key ID only after validation |
| `RAZORPAY_KEY_SECRET` | Private Razorpay API secret |
| `RAZORPAY_WEBHOOK_SECRET` | Separate webhook-signing secret |

Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` inside its hosted function environment. Do not add that service-role key to the browser or GitHub frontend build. Public forms only need `ALLOWED_ORIGINS`; they do not need Razorpay to be activated. See [Edge Function secrets](https://supabase.com/docs/guides/functions/secrets).

SQL 08 blocks direct browser inserts into enquiry/newsletter tables. Public forms use the new server function. **Deploy the function and new frontend together with this upgrade**, and verify a real test enquiry; old frontend form code cannot submit after 08. New checkout/verification functions also require 08's quota function.

## 6. Verify before making the URL public

1. Confirm header/footer branding and every main page work on desktop and phone.
2. In browser Network, inspect a page's response headers: CSP must not contain `unsafe-eval`; `script-src` must not allow inline scripts. Confirm HSTS on HTTPS and `no-store` on the staff page.
3. Sign in to staff with your own password/authenticator and confirm the correct role. A normal customer must not reach staff data. Test editor restrictions with a separate staff account.
4. Submit one enquiry and one newsletter address; confirm they appear in Supabase. The client cannot directly insert into either table after 08.
5. Confirm a file over 2 MB is rejected by the CMS and by Supabase Storage. Verify name changes are rejected.
6. Complete the Razorpay test-mode flow in [RAZORPAY-SETUP.md](RAZORPAY-SETUP.md), including allocation to multiple makers. Do not enable live purchases until this passes.

For browser warnings, see [SECURITY.md](SECURITY.md). Local tests and dependency audits do not constitute a live penetration test. Your hosted headers, Auth configuration, provider approvals and ongoing updates still matter.
