# Brand, content and upload limits

Run **[07-content-limits.sql](../supabase/sql/07-content-limits.sql)** in Supabase SQL Editor after 01–06. Existing projects that already ran 01–06 only need 07. Reload the website afterwards. This upgrade is repeatable and does not delete existing content or media.

**The name is locked to KCG Foundation.** The admin cannot edit it, the public website always uses it, and a database trigger rejects a different name. The original logo is part of the website files and is not editable through the CMS.

| Entry | Limit | Enforcement |
| --- | --- | --- |
| Image | 2 MB; JPEG, PNG, WebP or AVIF | Admin and Supabase Storage |
| Image dimensions | 4,096 px maximum on each side | Admin checks the decoded image before uploading |
| Making video | 50 MB; MP4 or WebM | Admin and Supabase Storage |
| Caption file | 256 KB; WebVTT | Admin and separate Supabase `kcg-captions` bucket; admin also checks the WEBVTT header |
| Uploads | One at a time in each admin tab | Admin |
| Product photographs | Up to 3; at least 2 different images to publish | Admin and database array maximum; publication requirements in admin |
| Process steps / foundation programs | Up to 12 each | Admin and database |
| Names / titles | 120 / 160 characters | Admin and database |
| Maker life story | 12,000 characters | Admin and database |
| Learning, style, roots, significance | 8,000 characters per field | Admin and database |
| Description | 6,000 characters | Admin and database |
| Film transcript | 20,000 characters | Admin and database |
| Journal body | 40,000 characters | Admin and database |
| Image description / caption | 300 / 500 characters | Admin and database |
| Media URL | 2,048 characters | Admin and database |
| Whole CMS entry | 192 KB including combined content | Admin and database |
| Stock | Whole numbers from 0 to 10,000 | Admin and database |
| Product price | ₹1 to ₹10,00,000 | Admin and database |
| Display order | Whole numbers from 0 to 9,999 | Admin and database |
| Customer enquiry | Name 120, email 254, message 10–4,000 characters | Public form and database |
| Cart | Up to 30 different products, up to 10 of each | Cart, checkout and database |

Here MB means 1,024 × 1,024 bytes. Every remaining CMS text field also has a length cap shown beneath its input. Oversized submissions return an error instead of being silently truncated. Use web copies of media; keep original masters outside the public website.

Catalog and admin lists load summary fields rather than every biography, transcript and article body. Full content is fetched when opening a detail page or editing one record. Admin lists stay paginated at 100 records. Public images load lazily where appropriate; films require the visitor to play them.

The bucket limits apply to new uploads through Supabase, including attempts that bypass the admin. Existing files remain available. Replace older oversized files with smaller web copies when convenient. An external media URL is hosted elsewhere, so its file size is not controlled by these buckets; use the CMS uploader for the enforced image limit. YouTube/Vimeo links are appropriate for longer films.

These entry limits bound individual files and records. They do not set a total project storage budget or block a distributed traffic attack. Monitor Supabase usage and keep Auth rate limits enabled; configure request rate limits in your production host/CDN if traffic requires them.

SQL 08 and the updated Edge Functions additionally enforce public submission and per-customer checkout quotas, with streaming body limits. See [SECURITY.md](SECURITY.md) for the exact quotas and [DEPLOYMENT.md](DEPLOYMENT.md) for activation.
