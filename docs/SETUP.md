# Finish the live GitHub Pages website

Website: **https://kcg.b2bindustrial.in**. You have already added the public Supabase credentials in GitHub, run SQL 01–08 and the diagnostic SQL, created users and assigned your super admin. Keep that work. There is no new SQL to run for this update.

Follow these steps in order. Steps that change account settings happen in your own browser; private credentials never go into website source.

## 1. Check the two GitHub build values

1. Open your GitHub repository.
2. Click **Settings → Secrets and variables → Actions**.
3. Check that these exact names exist, either under **Variables** or **Secrets**. The workflows now support either location; you do not need to duplicate them.

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Your project's `https://YOUR_PROJECT_REF.supabase.co` URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | The project's `sb_publishable_…` key |

4. These are public browser configuration. Do not use a service-role key, `sb_secret_…`, database password or Razorpay secret here.
5. Under **Settings → Pages**, keep the source as **GitHub Actions** and your existing custom domain `kcg.b2bindustrial.in`. Keep **Enforce HTTPS** enabled. Your working DNS does not need to be recreated.
6. The checked-in workflow builds `dist/` and deploys it to Pages. `public/CNAME` preserves the custom domain in the build. No second hosting account is needed.

GitHub Pages hosts the frontend. Supabase hosts the database, authentication, media and server functions. GitHub variables do not automatically become Supabase function secrets. [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## 2. Configure customer authentication redirects

1. Open [Supabase Dashboard](https://supabase.com/dashboard).
2. Select the same project used by `VITE_SUPABASE_URL`.
3. Open **Authentication → URL Configuration**.
4. Set **Site URL** to:

```text
https://kcg.b2bindustrial.in
```

5. Under **Redirect URLs**, add these two entries separately:

```text
https://kcg.b2bindustrial.in/account.html
https://kcg.b2bindustrial.in/checkout.html
```

6. Click **Save changes**.
7. If you also test locally, add `http://127.0.0.1:5173/account.html` and `http://127.0.0.1:5173/checkout.html`. Local preview on port 4173 needs its own two exact entries. Production only needs the two HTTPS entries above.
8. Keep the standard magic-link email template using `{{ .ConfirmationURL }}`. Do not point every login directly to the homepage.

These redirects are for customers. Staff use password plus authenticator at `https://kcg.b2bindustrial.in/seva-karyalaya-7c9e4b2d.html`. Keep your existing staff account and `super_admin` membership; complete TOTP enrolment at sign-in. Staff access stays in memory and requires a fresh login after reload. [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## 3. Configure email delivery / SMTP

If you already have a transactional SMTP provider, use its host, port, username and password in the Supabase fields below. Otherwise, this is one concrete route using Resend. It is separate from your GitHub and Supabase accounts.

### A. Verify an email-sending domain

1. Open [Resend](https://resend.com/) and create/sign into an account controlled by the foundation.
2. Open **Domains → Add domain**.
3. Use `auth.b2bindustrial.in` as a dedicated sending subdomain. This does not change the website address.
4. Resend displays the DNS records for your account. Open the DNS provider where you manage `b2bindustrial.in`.
5. Add exactly the sending/DKIM/SPF records Resend displays, using its record names, types and values. Do not replace your website's existing CNAME or your business email records. Receiving/inbound email is not needed for sign-in delivery.
6. Return to Resend and verify the domain. Continue only after it shows **Verified**.
7. Open **API Keys → Create API key**. Use sending access for that verified domain when available. Save the generated `re_…` key privately.

### B. Put SMTP details in Supabase Auth

1. Return to your Supabase project.
2. Open **Authentication → Email** under the notifications area, then **SMTP Settings**.
3. Enable custom SMTP.
4. Enter these values:

| Supabase SMTP field | Value |
| --- | --- |
| Sender email | `login@auth.b2bindustrial.in` |
| Sender name | `KCG Foundation` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | Your private Resend `re_…` API key |

5. Click **Save**.
6. Keep this key in the SMTP password field. It is not a GitHub variable and not a Razorpay/Edge Function secret.
7. Open the website's **Your account** page and send a sign-in link to your own email address. Check inbox and spam. Open the newest link and confirm you return to the correct account/checkout page.
8. If delivery fails, check Supabase Auth logs and Resend email logs. Confirm the sender domain is verified and the sender address matches it.

The default Supabase email service is restricted; configure real SMTP for public customer sign-in. [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Resend's Supabase SMTP instructions](https://resend.com/docs/send-with-supabase-smtp).

## 4. Set the allowed website origin

1. In your Supabase project, open **Edge Functions → Secrets**.
2. Add a secret with this exact name and value:

```dotenv
ALLOWED_ORIGINS=https://kcg.b2bindustrial.in
```

3. Click **Save**.
4. Use only the origin: no trailing slash, page name or wildcard.
5. If you are also developing locally, the value can instead be:

```dotenv
ALLOWED_ORIGINS=https://kcg.b2bindustrial.in,http://127.0.0.1:5173,http://127.0.0.1:4173
```

This permits browser calls from your website. It does not give visitors staff access or replace authentication. Public forms need this setting even before payments are enabled. [Function secrets](https://supabase.com/docs/guides/functions/secrets).

## 5. Deploy all four Edge Functions

Running SQL creates database objects, not Edge Function deployments. Do this once now and repeat when the function source changes.

1. Open PowerShell on your computer.
2. Go to the project folder:

```powershell
Set-Location -LiteralPath 'A:\Software\KCG-main'
```

3. Sign into Supabase CLI using your own account:

```powershell
npx --yes supabase@3.0.0 login
```

4. Finish the browser login shown by the command. Use your Supabase Dashboard owner/account login, not the staff user created under Authentication → Users.
5. In Supabase, find your project reference in **Project Settings → General**, or take the part before `.supabase.co` in the project URL.
6. Replace the placeholder below with that reference, then run the line:

```powershell
$KcgProjectRef = 'YOUR_PROJECT_REF'
```

7. Run each command below separately and wait for its success message before the next:

```powershell
npx --yes supabase@3.0.0 functions deploy submit-public-form --remote=$KcgProjectRef --use-api --no-verify-jwt --yes
npx --yes supabase@3.0.0 functions deploy create-checkout --remote=$KcgProjectRef --use-api --no-verify-jwt --yes
npx --yes supabase@3.0.0 functions deploy verify-payment --remote=$KcgProjectRef --use-api --no-verify-jwt --yes
npx --yes supabase@3.0.0 functions deploy payment-webhook --remote=$KcgProjectRef --use-api --no-verify-jwt --yes
```

8. Return to **Supabase → Edge Functions** and confirm all four names appear.
9. `--use-api` bundles on Supabase without Docker. CLI 3 uses `--remote`; the final `--yes` explicitly authorises deployment to the reference you entered. The first `--yes` belongs to npm's package runner.
10. Keep `--no-verify-jwt` for these supplied functions. Checkout and payment verification validate the customer token internally; the webhook verifies the Razorpay signature; public submissions are intentionally available without customer login. Do not remove those checks from the code.

| Function | Purpose |
| --- | --- |
| `submit-public-form` | Contact, volunteering/donation enquiries and newsletter submissions |
| `create-checkout` | Authenticated, server-priced orders and maker allocations |
| `verify-payment` | Verifies payment and captured status |
| `payment-webhook` | Handles signed Razorpay notifications |

The Supabase runtime supplies `SUPABASE_URL` and the server credentials used by these functions. Do not copy service-role credentials into GitHub or create them as frontend settings. Missing payment secrets will keep checkout unavailable until the payment setup below is complete. Public forms and customer email login can be tested first. [Deploy functions](https://supabase.com/docs/guides/functions/deploy).

## 6. Configure payment accounts and secrets

Before enabling live checkout, review [GitHub Pages usage limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), which restrict ecommerce and sensitive transactions. Running payment APIs elsewhere does not itself establish that a Pages site complies. Confirm your intended use with GitHub if needed.

This section is needed before accepting purchases. Donation forms currently collect enquiries; they do not charge donations.

1. Sign into [Razorpay](https://razorpay.com/) using an account controlled by the foundation's authorised representative.
2. Complete onboarding for the actual operating legal entity and settlement bank account. Request **Payment Gateway / Standard Checkout and Route** for the maker marketplace.
3. Ask Razorpay to confirm eligibility and onboarding requirements for your foundation and makers. The code cannot activate a merchant account or Route.
4. Use **Test Mode** first. In **Account & Settings → API Keys**, generate a test key pair.
5. Return to **Supabase → Edge Functions → Secrets** and save:

| Secret name | Value |
| --- | --- |
| `RAZORPAY_KEY_ID` | Your `rzp_test_…` key ID |
| `RAZORPAY_KEY_SECRET` | The matching private API secret |
| `RAZORPAY_WEBHOOK_SECRET` | A separate strong random secret you create for webhook signing |

6. Generate/store the webhook secret privately in your password manager. It must differ from the API secret. Do not paste any of these private secrets into website files or GitHub build variables.
7. In Razorpay webhook settings, add this URL, replacing the project reference:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/payment-webhook
```

8. Set its signing secret to the exact same `RAZORPAY_WEBHOOK_SECRET` saved in Supabase.
9. Subscribe to **`payment.captured`** and **`order.paid`**. Keep retries enabled and use automatic payment capture for this integration.
10. In **Route → Accounts**, onboard one approved Linked Account per maker, including required bank/KYC steps. Use the corresponding test-mode linked accounts with test keys.
11. In the KCG staff workspace, open **Maker payout accounts** as super admin, choose the maker, enter that maker's approved `acc_…` linked-account ID and enable it.
12. Publish a complete real maker and test product. Test one-maker and multiple-maker orders, payment closure/failure and account order status. Check the allocation in Route.
13. After approval and successful testing, replace the test key pair, applicable linked-account IDs and webhook configuration with their matching live-mode values. Do not mix modes.

This integration allocates the full product amount to makers with zero foundation commission. Provider fees, settlement timing, refunds, reversals and disputes still need your approved payment arrangements. Refund/reconciliation operations remain in Razorpay. [API keys](https://razorpay.com/docs/payments/dashboard/account-settings/api-keys), [Route](https://razorpay.com/docs/payments/route), [Route onboarding](https://razorpay.com/docs/payments/route/dashboard), [Route webhooks](https://razorpay.com/docs/payments/route/subscribe-to-webhooks).

## 7. Publish the updated website through GitHub Pages

1. Commit/push the updated project files to your repository's `main` branch using your normal GitHub workflow. Keep `.env.local`, private credentials and `media-inbox` out of commits.
2. Open **GitHub → Actions → Deploy website**.
3. Wait for the latest deployment to finish successfully. For a rebuild without a source change, use **Run workflow**.
4. Open `https://kcg.b2bindustrial.in` and refresh.
5. Test a contact enquiry and newsletter address; confirm their rows appear in Supabase.
6. Test customer email sign-in and staff password/authenticator sign-in separately.
7. Follow [MEDIA-GUIDE.md](MEDIA-GUIDE.md) to add real foundation content, makers, films and products.
8. Re-run the Pages workflow after CMS publishing so the initial HTML and sitemap update as well. The browser also refreshes public content from Supabase.

No further Lighthouse checks are part of these steps or the deployment workflow.

## 8. If something fails

| What you see | What to check |
| --- | --- |
| Function not found / HTTP 404 | Deploy the exact function names to the same project used by the website |
| Public form fails | `submit-public-form` exists; `ALLOWED_ORIGINS` matches the live origin; inspect its Supabase function logs |
| Browser says origin/CORS blocked | Exact scheme/domain/port in `ALLOWED_ORIGINS`; no trailing slash |
| Login email does not arrive | Custom SMTP saved, verified sending domain, Auth rate limits, Resend logs and spam folder |
| Login returns to the wrong page | Site URL, the two exact redirect URLs, newest email link and standard `ConfirmationURL` template |
| Staff cannot open the workspace | Correct project/user, enabled `super_admin` membership, password sign-in and current TOTP code |
| Checkout unavailable | All payment secrets, Route approval, correct-mode enabled maker accounts and published in-stock products |
| Payment outcome uncertain | Check account order status and payment provider; do not pay again merely because verification timed out |
| GitHub production build rejects credentials | Exact variable names, `sb_publishable_…` key, no secret/service-role key, and successful latest Pages deployment |

## Hosting and protection boundaries

The build now embeds a restrictive Content Security Policy and referrer policy in each HTML page because GitHub Pages does not apply project `_headers` or `.htaccess` files. The policy blocks string evaluation and inline executable scripts, with checkout-specific payment hosts. `frame-ancestors`, custom HSTS, `no-store`, Permissions-Policy and other HTTP-header controls cannot be supplied through that HTML meta fallback. The Pages HTTPS setting and the database/Edge Function authentication policies remain important; this is not a claim that a website is unhackable. [CSP delivery](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP).

Normal image selection, dragging and touch callouts are disabled. This is a user-interface restriction, not DRM: publicly displayed images can still be retrieved or captured. Upload only material approved for public use.

Public pages keep readable content when an interactive file fails. Request timeouts show safe recovery messages. Forms reset only on success, bags survive catalogue/sync failures, and uncertain payments direct customers to order status. Staff uploads/saves preserve their error messages and entry limits. See [MEDIA-GUIDE.md](MEDIA-GUIDE.md) for roles and limits.
