# SEO and Lighthouse

Production canonical domain: **https://kcg.b2bindustrial.in**.

## Implemented

- Descriptive page titles and meta descriptions for the foundation, programs, stories, contact and maker collection.
- Canonical URLs, Open Graph sharing fields, a Twitter large-image card and honest Organization structured data.
- A build-generated sitemap with one canonical entry per public page, plus published journal, maker and product URLs. Duplicate home/story aliases and private account/checkout/staff pages are excluded.
- Meaningful initial HTML for the main public pages, including the maker collection. Browsers refresh published data from Supabase; customers, carts, orders, staff sessions and private data are never embedded in a public snapshot.
- Published detail records update their titles, descriptions and canonical URLs. Missing detail records ask crawlers not to index them. Product/story/maker detail content still requires JavaScript; directory and foundation content is available in initial HTML.
- Responsive compressed images, small favicons, compressed original branding, local DM Sans, image dimensions and lazy loading below the fold. The homepage photograph is prioritised.
- Improved text contrast and heading structure. No third-party analytics, invented testimonials or fake review ratings were added.
- Long-lived caching for fingerprinted bundles and shorter caching for local images/fonts. Sensitive staff/account/checkout pages keep `no-store`.

Rebuild/redeploy after publishing CMS content so the HTML snapshots and sitemap also update. Browser refreshes do not update the deployed sitemap. Live catalogue checks still control availability and payment.

## Run Google Lighthouse

Lighthouse is installed as a pinned development dependency. Version 13.5.0 is used because the checked 13.6.0 dependency tree reported moderate vulnerabilities; the installed lockfile passed the dependency audit. Upgrade deliberately and rerun the audit when a safe newer tree is available.

Use two terminals from the project root:

```powershell
# Terminal 1
npm ci
npm run build
npm run preview -- --port 4173
```

```powershell
# Terminal 2: standard throttled mobile audit
npm run lighthouse -- http://127.0.0.1:4173/

# All twelve canonical public pages on mobile
npm run lighthouse -- http://127.0.0.1:4173/ --all

# Standard desktop preset
npm run lighthouse -- http://127.0.0.1:4173/ --desktop

# After deployment, measure the real host too
npm run lighthouse -- https://kcg.b2bindustrial.in/
```

The runner uses an isolated headless Chromium profile. On Windows it detects the task-local headless Chrome, installed Chrome or Edge. You can explicitly select a browser with `$env:CHROME_PATH='C:\path\to\chrome.exe'`. If no suitable browser is available, install Google's official audit browser locally:

```powershell
npx --yes @puppeteer/browsers@3.2.6 install chrome-headless-shell@stable --path artifacts/browsers
```

Reports are written as **HTML and JSON** under `artifacts/lighthouse/`, with a summary JSON per device mode. These are local diagnostics, ignored by Git and excluded from deployment. Run audits sequentially with other CPU-intensive tasks stopped; concurrent audits can distort results. No audits are skipped to improve scores. Private pages intentionally use `noindex` and are not part of the public SEO score target.

## Measured results

See [the local audit summary](../artifacts/lighthouse/summary-mobile.json) and the corresponding HTML files for exact per-page scores and timestamps. The original homepage baseline was **74 performance / 96 accessibility / 100 best practices / 100 SEO** on mobile. Results apply to the local production preview and current published content, not an independently deployed host.

Scores vary with the browser, device, CPU, network, server response and future media/content. A Lighthouse SEO score is a technical checklist, not a Google search ranking guarantee. [Lighthouse scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring), [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

## After deploying

1. Confirm HTTPS and a single preferred host at `kcg.b2bindustrial.in`; redirect alternate deployment hosts to it using your hosting provider.
2. Verify ownership in [Google Search Console](https://search.google.com/search-console/about) using your own Google account. Follow the displayed DNS or HTML verification instructions. No verification token has been invented or committed.
3. Submit `https://kcg.b2bindustrial.in/sitemap.xml` in Search Console. Inspect the homepage and program pages; request indexing after checking the rendered result.
4. Audit the deployed URL on mobile and desktop. Hosting response time and header configuration are not proven by local preview results.
5. Keep page descriptions, program details, contact information, maker stories, transcripts and image descriptions accurate. Supply real foundation photographs when available; generated illustrations stay clearly labelled.
