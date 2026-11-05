# KCG staff workspace

Start with **[SETUP.md](SETUP.md)**. It walks through project creation, credentials, running SQL, creating your staff ID/password, assigning roles in Supabase, and enrolling an authenticator.

## Staff address

`/seva-karyalaya-7c9e4b2d.html`

For local development: `http://127.0.0.1:5173/seva-karyalaya-7c9e4b2d.html`.

The public footer has no staff link, and the old `/admin.html` file is removed. The unusual URL is a discreet entrance. Supabase password verification, mandatory MFA and database permissions enforce security. There is no shared default account or plaintext password lookup.

## Sign-in and roles

Your staff ID is the email of the account created in Supabase Authentication. Sign in with its password, then its authenticator code. Staff sign-in stays in memory only; reload/close requires a new sign-in. The workspace locks after 15 minutes without interaction. Database staff access requires a password sign-in from the last 30 minutes plus verified MFA.

| Role | Scope |
| --- | --- |
| `editor` | Prepare draft makers, products, journal stories and gallery items; upload media. Published records are read-only until a manager moves them to draft. |
| `manager` | Edit foundation content/programs; review and publish content; handle enquiries, subscribers and orders; mark verified paid orders shipped/delivered. |
| `super_admin` | Everything above, plus verified maker payout settings. |

Role changes happen **only in Supabase → Table Editor → `admin_users`**, or SQL Editor. The website cannot grant memberships or change roles. Set `enabled=false` to remove staff access immediately. Follow the exact account and assignment SQL in SETUP.md.

## Foundation, journal and gallery

**Foundation & programs** edits the mission, legacy, home-page introduction and photograph, programs, public contact details, footer description and newsletter heading. These changes are public when saved.

**Journal** manages story titles, dates, categories, images, summaries and full articles. **Community gallery** manages foundation photographs, descriptions, captions and display order. Content records can remain drafts until a manager or super admin publishes them.

## People & maker stories

Add the maker's preferred name, actual portrait, craft, location, short introduction, life story, learning journey, signature style, cultural roots and approved quotation. Add a workshop/process photograph. The portrait appears on collection cards and product pages as well as the maker's own profile.

## Products & making films

Choose the real maker, then add:

- The making film, poster, short caption, transcript and optional WebVTT captions.
- Two or three **different photographs of the same piece**, with image descriptions and captions.
- Place of origin, technique, making time and ordered making steps.
- Cultural/personal significance, materials, dimensions, care and delivery information.
- Price in rupees, stock and collection display order.

The public page leads with the film, then the maker's portrait and full story, making process, gallery and provenance. Direct MP4/WebM films support native controls. YouTube/Vimeo players load only when a visitor chooses to watch.

Publishing checks the maker's portrait/story, the film and transcript, at least two product photographs, process and core details. Editors can save drafts; managers/super admins publish. Moving a record to draft preserves existing orders and media.

## Uploads and operations

Images upload to `kcg-media` with a **2 MB** limit (maximum 4,096 px per side in the admin). Films upload to `kcg-films` with a **50 MB** limit; captions use `kcg-captions` with a **256 KB** limit. Only one upload runs at a time in each tab. Uploads get unique names and do not overwrite live files. Save the record after uploading to attach the public URL. Run SQL 07 to enable the server restrictions. See [DATA-LIMITS.md](DATA-LIMITS.md) for text and numeric limits. The foundation name and logo cannot be changed through this workspace.

The media is for public website use. Follow **[MEDIA-CHECKLIST.md](MEDIA-CHECKLIST.md)** for what to supply and how to organise it. Keep authentication credentials out of the media folder.

Managers/super admins can inspect order details and mark verified paid orders shipped/delivered. Payment amounts and paid status cannot be changed by the browser. Super admins can configure approved Razorpay Route linked accounts. Refunds, disputes and settlements stay in Razorpay. Newsletter collection stores consent; sending campaigns is separate.

## Verification limits

Role restrictions, MFA/password requirements, expiry and revocation are tested against the SQL locally. Real email delivery, Auth MFA enrolment, file uploads and payment settlement still need your connected project and a live setup check. No hosted database or staff password has been created by this checkout.
