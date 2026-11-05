# Security controls and release checks

The website is hardened against common web attacks. No application can be guaranteed “non-hackable”; security also depends on Supabase, hosting, account access, payment-provider configuration, updates and monitoring. This document distinguishes implemented controls from live deployment work.

## Identity and brand

The foundation identity is **KCG Foundation**. The public content merger forces that value, the CMS has no editable foundation-name field, and SQL 07 rejects a different name. The logo is the original checked-in asset, with no CMS control that replaces it. A project owner who controls the code or database DDL can intentionally change the implementation; a website cannot prevent its infrastructure owner from doing that.

Staff require Supabase-verified password sign-in and TOTP MFA. Staff auth uses a separate memory-only client, clears access on reload, expires after 15 idle minutes or 30 minutes maximum, and periodically rechecks membership. SQL requires AAL2, a recent password method and a current enabled membership. Customer registration/user metadata cannot grant a role. Only the Supabase project owner assigns staff roles. Database policies, rather than a hidden URL, enforce access. See [SETUP.md](SETUP.md).

## Browser protections and the reported warnings

The production build generates response headers for Netlify and Apache, scoped to your configured Supabase origin. The Vite preview uses the same policy logic for local checks.

- **CSP:** scripts load from the website and explicitly allowed payment-provider hosts. `unsafe-eval`, inline JavaScript and inline event handlers are not permitted. Object embedding, base-tag changes and framing by another site are blocked. The staff policy is stricter and does not load payment scripts. Payment pages allow inline **styles** for the vendor's Checkout UI; this does not enable inline JavaScript.
- **HTTPS/HSTS:** production headers request HTTPS and one-year HSTS. HSTS applies only when actually served over HTTPS. The local HTTP preview deliberately omits HTTPS upgrade/HSTS.
- **Other headers:** `nosniff`, restrictive referrer policy, same-origin resource policy, popup-compatible opener isolation, and a permissions policy disabling camera, microphone, geolocation, USB, serial and deprecated unload events.
- **Private pages:** staff, account and checkout HTML are marked `no-store` and `noindex`. Search directives are not authorisation controls.
- **Content rendering:** user-provided text is escaped. Journal HTML is reduced to a small inert editorial-tag allowlist; scripts, attributes and active embeds from article bodies are discarded. Media URLs are checked and film providers are restricted. Third-party videos load after a visitor chooses to watch.

There are **no `eval()`, `new Function()` or string timers in the site's runtime source**, and the build check scans the output for arbitrary-code evaluation and deprecated `unload` handlers. An “eval blocked by CSP” message means the browser refused an attempted evaluation; it does not mean you should add `unsafe-eval`. Keep that restriction. If the warning remains, expand its **source location** in DevTools to identify whether it comes from a browser extension, third-party payment frame or the site. The site does not run the temporary development verification harnesses used during coding; they are excluded from `dist/`.

The admin uses `beforeunload` **only while an edit is unsaved**, to warn before closing the page. It removes the listener after saving/discarding. `beforeunload` is a different event from deprecated `unload`; session security uses `pageshow`, server verification and time limits. [CSP guidance](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/CSP), [Chrome unload deprecation](https://developer.chrome.com/docs/web-platform/deprecating-unload).

## Database, file and API protections

All app tables use RLS and explicit grants. Anonymous visitors see published content, customers access only their own cart/orders, editors edit drafts, managers publish and handle operations, and super admins configure payout accounts. Staff cannot grant membership through the site. Payment preparation/confirmation functions are server-only. SQL 07 adds field/entry/stock/price/cart constraints and locked branding; Storage enforces the media byte/type limits. See [DATA-LIMITS.md](DATA-LIMITS.md).

After SQL 08 and the updated Edge Functions are deployed:

| Operation | Server restriction |
| --- | --- |
| Public form body | 16,000 bytes before JSON parsing; email/name/topic/message/amount validation |
| Public form submissions | 3 per email and form kind/hour; a shared budget of 30/minute and 500/hour |
| Checkout creation/resumption | 5/minute and 30/hour per server-verified customer |
| Payment verification | 10/minute per verified customer |
| Checkout / verification bodies | 16,000 / 4,000 bytes |
| Signed provider webhook body | 1,000,000 bytes; event ID limited to 200 characters |
| External server requests | 15-second fetch timeout |

Counters update atomically in a private, RLS-protected table. Browser roles cannot read or reset them, cannot choose their own quota, and cannot directly insert into enquiry/newsletter tables. Email quota identifiers are hashed, and old counter rows are pruned in bounded batches after two days of inactivity. The frontend honeypot drops basic bot submissions. These controls bound application work; they are **not a distributed-denial-of-service firewall**. The shared public budget can also temporarily limit legitimate traffic during an attack; review limits as genuine usage grows.

CORS accepts only `ALLOWED_ORIGINS`; it is not the authentication boundary. Checkout verifies the bearer token with Supabase Auth and ignores client-supplied prices. Server SQL locks inventory and snapshots pricing. Payment confirmation checks the HMAC, provider order, amount, currency and captured status. Retries/webhooks are idempotent. Provider API secrets stay in Supabase Edge Function secrets, not the build.

## Repository and build protection

The lockfile pins dependencies. CI runs tests, an npm vulnerability audit, build and output checks. GitHub Actions are pinned to verified full commit hashes and use read-only repository permissions without retaining checkout credentials. Dependabot checks npm/Actions weekly. `.env` files, private keys, raw media intake and verification artifacts are ignored. The build refuses private-looking `VITE_` settings and service-role credentials. The production host build requires a publishable key.

The output check confirms that private project folders/env files are absent and scripts do not contain inline executable bodies, `eval()`/`new Function()` or registered `unload` listeners. This is a regression check, not a complete secret scanner or penetration test. Enable GitHub secret scanning/push protection where available; review diffs before publishing. If a private credential was ever committed or disclosed, rotate it at the provider and remove it from history; adding `.gitignore` later does not erase exposure.

## Owner's ongoing controls

Use 2FA/passkeys and individual accounts on GitHub, Supabase, Netlify and Razorpay. Keep recovery codes offline, restrict collaborator access, use branch review, and immediately disable departed staff memberships. Avoid signing into staff from a shared or compromised device.

Use Supabase Security Advisor and project logs, Auth rate limits, exact production redirect URLs, verified customer email, suitable SMTP and backups. Confirm your project's backup/PITR availability and test restoration using a non-production copy. Do not expose the `private` schema through the Data API. Review Storage usage, database quotas and provider errors. Configure your hosting/CDN's bot/rate-limit/WAF controls for production traffic as needed; limits on the static host do not by themselves protect a separately reachable Supabase API.

Review dependency updates, test-mode payments and headers after releases. Monitor payment-setup-review orders and webhook failures without logging passwords, bearer tokens, signing secrets or unnecessary customer data. An external security assessment is appropriate before a significant public launch.

For a suspected vulnerability, contact the foundation privately through its published contact email. Do not put credentials, personal data or exploit details in a public GitHub issue.
