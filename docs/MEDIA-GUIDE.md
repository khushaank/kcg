# Photos, films and stories to supply

Your original `Logo.png` is already included. Compressed copies are used in the navbar and staff sign-in; repeated footer/hero logo graphics were removed. You do not need to send it again. An original SVG or transparent high-resolution version is optional if you have one.

## Foundation material

| Supply | Suggested quantity | Where it goes |
| --- | --- | --- |
| Strong, wide photograph of the foundation's real work | 2–3 options | Home-page lead photograph; choose one primary image |
| Education/school support photographs | 3–5 | Education program and community gallery |
| Nutrition/meal support photographs | 3–5 | Nutrition program and community gallery |
| Health camp/welfare photographs | 3–5 | Healthcare program, journal and gallery |
| Volunteers and team working together | 2–3 | Volunteering and journal stories |
| Approved portrait of Late Sh. Kailash Chand Gupta | 1, optional | Foundation story / legacy feature |
| Short foundation introduction film | 60–120 seconds, optional | Keep for a future foundation film feature; it is not currently a separate home-page video slot |

For each foundation photo, include a short caption, what happened, the location, the approximate date and who may be named. Include the verified foundation story, current program descriptions, public contact details and any claims/numbers you want to publish with their supporting context.

## For each maker — the person comes first

| Supply | What it should show | Website field / use |
| --- | --- | --- |
| **One clear portrait** | The maker's face, in natural light; a vertical or square composition | Maker portrait; shown on their profile, collection cards and product pages |
| One workshop / process photograph | Their actual workspace, tools and materials | Workshop/process photograph and film poster fallback |
| Tools, hands and details | 1–3 optional photographs | Supporting material for future stories; keep separate from the product's 2–3 image gallery |
| Personal introduction / interview film | 1–3 minutes, optional | Source material for their story; a making film belongs to each product page |
| **Life story** | Their background, daily life, family/community context they want to share, aspirations and important turning points | Full life story |
| **How they learned** | Teachers, family traditions, practice, training and milestones | Learning the craft |
| **Their own style** | Preferred forms, colours, motifs, materials and what makes their work recognisable | Signature style |
| **Roots and place** | Village/town, district/state, country, community and craft tradition | Location and cultural roots |
| A quote in their own words | One or two approved sentences | Maker quotation |

Also supply their preferred display name, pronunciation if helpful, craft name and a short introduction. Do not include private contact details in the biography unless the maker explicitly wants them public.

## For each product

### The making film — highest priority

Supply **one film showing that maker making this actual piece or the same clearly identified design**. Ideally include:

1. The maker introducing themself and the piece.
2. Raw materials and their source.
3. The important stages, tools and hand techniques.
4. A close-up of a distinctive detail or finishing step.
5. The finished piece and what it means to the maker.

Aim for **60–180 seconds**, landscape **16:9**, preferably **1080p**. Keep it steady and use natural light and clear sound. Their own language is welcome. Supply the original spoken words/transcript and an English or Hindi translation if available. A `.vtt` caption file is optional; a written transcript is required to publish the product through the workspace.

The website supports **MP4/WebM up to 50 MB** in Supabase Storage, or a YouTube/Vimeo link. Keep the original high-quality file even if you also prepare a smaller web copy. Add one still frame as the film's poster image.

### Two or three photographs of that same product

1. **Front / full view** — the complete product, a clean setting and accurate colour. This becomes the collection and cart image.
2. **Second angle / in use** — show depth, shape and scale, or how the product is used.
3. **Detail / texture** — optional third view showing the weave, glaze, stitching, carving or other distinctive detail.

Use different photographs, rather than the same picture cropped three ways. JPEG, PNG, WebP or AVIF are supported. A web copy must be **at most 2 MB** and no more than **4,096 pixels per side**, preferably around **1,600–2,400 pixels** on its longest side. Keep the original masters. Caption files must be WebVTT and no larger than **256 KB**. See the entry limits below for all limits.

### Product information

- Product name, collection/category and short introduction.
- Which maker made it.
- Exact place of origin: village/town, region/state and country.
- Materials and where they come from, when known.
- Technique and ordered making steps; explain what happens and why.
- Time needed to make it, including drying/firing/finishing where applicable.
- Its cultural, personal or functional significance, in the maker's approved account.
- Dimensions/size, weight if relevant, and useful care instructions.
- Price in rupees, stock quantity, dispatch estimate and delivery/return details.
- One caption and a plain-language image description for each photograph.

## How to give me the files

Put them in **`A:\Software\KCG-main\media-inbox`** using a structure like this:

```text
media-inbox/
  foundation/
    home-work-01.jpg
    education-01.jpg
    health-camp-01.jpg
    CAPTIONS.txt
  makers/
    maker-name/
      DETAILS.txt
      portrait.jpg
      workshop.jpg
      product-name/
        DETAILS.txt
        front.jpg
        second-angle.jpg
        detail.jpg
        making.mp4
        film-poster.jpg
        transcript.txt
        captions.vtt
```

A starter is in the maker details template below in this documentation folder. Copy its prompts into each maker's `DETAILS.txt`. File names can differ; the important part is keeping each maker and product together. Links to large videos can go in the corresponding `DETAILS.txt` file.

When the files are ready, tell me which folder to use. I can map each item to the correct maker/product, add captions and descriptions from your supplied information, connect the media to the website and verify the pages. You can also upload directly through the authorised staff workspace once Supabase is connected.

Only provide material you have permission to publish, including the maker's approval of their biography and portrait. For identifiable children, obtain guardian approval. Keep passwords, authentication codes and payment secrets out of this folder. New records can remain drafts until you review them.

# KCG staff workspace


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

Images upload to `kcg-media` with a **2 MB** limit (maximum 4,096 px per side in the admin). Films upload to `kcg-films` with a **50 MB** limit; captions use `kcg-captions` with a **256 KB** limit. Only one upload runs at a time in each tab. Uploads get unique names and do not overwrite live files. Save the record after uploading to attach the public URL. SQL 07 is already applied in your project. See the entry limits below for text and numeric limits. The foundation name and logo cannot be changed through this workspace.

The media is for public website use. Follow **the checklist above** for what to supply and how to organise it. Keep authentication credentials out of the media folder.

Managers/super admins can inspect order details and mark verified paid orders shipped/delivered. Payment amounts and paid status cannot be changed by the browser. Super admins can configure approved Razorpay Route linked accounts. Refunds, disputes and settlements stay in Razorpay. Newsletter collection stores consent; sending campaigns is separate.


## Entry and upload limits

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

SQL 08 is already applied. Deploy the Edge Functions following [SETUP.md](SETUP.md) to activate public form and checkout quotas.

# Maker

- Preferred display name:
- Craft:
- Village/town, district/state, country:
- Portrait file:
- Workshop photograph:
- Short introduction:

## Life story and everyday life

[Maker's approved account.]

## How they learned

[Family, teachers, practice, milestones.]

## Their personal style

[Forms, colours, motifs, techniques and influences.]

## Cultural roots and belonging

[Place, community and traditions they want to share.]

## Quote

[An approved quotation in their own words.]

# Product: [name]

- Product folder:
- Category:
- Short introduction:
- Front photograph:
- Second photograph:
- Third photograph (optional):
- Making film file / link:
- Film poster:
- Transcript / translation:
- Captions file (optional):
- Place of origin:
- Materials and their source:
- Technique:
- Time to make:
- Dimensions / size:
- Care:
- Price in rupees:
- Quantity available:
- Dispatch and delivery information:

## Making steps

1. [Step name and explanation.]
2. [Step name and explanation.]
3. [Step name and explanation.]

## Story and significance

[What the piece means, its cultural/personal context and why it is made this way.]

## Photograph captions and descriptions

1. Front view:
2. Second view:
3. Detail view:

## Publication approval

[Who approved the portrait, story and media, and when.]

## Asset credits

The following photographs are illustrative visual material. They are not represented as KCG partner makers or actual inventory. Replace them with approved product/maker photography when populating the live catalogue.

| File in public/images | Source |
| --- | --- |
| craft-hero.jpg | [Earl Wilcox, Unsplash](https://unsplash.com/photos/7zk-cuhroq4) — pottery wheel photograph, image ID 1609881583302-61548332039c |
| vase.jpg | [Sixteen Miles Out, Unsplash](https://unsplash.com/photos/a-white-vase-sitting-on-top-of-a-white-table-aFvxASlms2A) |
| bowl.jpg | [Tom Crew, Unsplash](https://unsplash.com/photos/closeup-photo-of-white-bowl-on-white-surface-Mz__0nr1AM8) |
| basket.jpg | [Federica Ariemma, Unsplash](https://unsplash.com/photos/brown-woven-basket-on-brown-wooden-table-FbjU3fNZM10) |
| textile.jpg | [Kateryna Hliznitsova, Unsplash](https://unsplash.com/photos/a-close-up-of-a-blanket-that-has-been-folded-mvezMC41OAU) |
| education.jpg | Existing website's illustrative Unsplash library photograph, image ID 1524995997946-a1c2e315a42f |
| community.jpg | Existing website's illustrative community photograph from Unsplash, image ID 1488521787991-ed7bbaae773c |
| Health-camp.jpg | Original KCG Foundation repository |
| cataract-operation.jpg | Original KCG Foundation repository |

The four existing journal articles and original Logo.png/favicon.png are retained from the supplied folder. The supplied Logo.png is used intact in the navbar and staff sign-in. Repeated hero/footer logo graphics have been removed. No replacement brand mark is used. Small interface icons remain inline SVG.

Web delivery uses compressed derivatives of the supplied logo and favicon; the original source files are unchanged. `npm run optimize:images` generates responsive WebP files under `public/images/optimized`, the image manifest, the navbar logo derivative and small favicon files. It also copies the locally hosted DM Sans font and its OFL licence from the pinned Fontsource package to `public/fonts`. Public pages do not request Google Fonts.

Learning, community meals, eye care and general pottery now have locally generated rural Indian illustrations. Known legacy stock-image paths and the eye-operation close-up are mapped to the new files. The original health-camp photograph stays in use; all supplied source files and custom maker/product uploads are retained. Illustrations have visible disclosure captions. See the generated-image note below.

### Rural health-camp hero

Generation prompt (built-in tool):

Use case: photorealistic-natural website hero asset. Input image 1 is a screenshot reference ONLY: the health-camp photograph inside the right-hand card identifies the subject to remake. Generate ONLY a new standalone landscape 3:2 image of that health-camp subject, not a screenshot, not a webpage, no interface, no logo, no typography. Reimagine community healthcare in a contemporary rural Haryana village in India. A dignified, candid medium-wide scene in a clean shaded brick-and-limewashed village courtyard under a neem tree. In the central area an Indian adult woman healthcare worker wearing a simple light clinical coat over a muted green cotton salwar kameez is seated at a modest table, checking the blood pressure of an older Indian man in an everyday off-white cotton kurta pajama. His forearm rests naturally on the table, cuff correctly on the upper arm, plausible compact medical equipment; anatomically natural hands. A few Indian village residents and a volunteer wait comfortably on ordinary chairs beside a low verandah in the background, wearing everyday salwar kameez, cotton kurtas and shirts. Subtle glimpses of surrounding village homes and greenery. Warm natural daylight, authentic skin and fabric texture, restrained earthy colours, clear high-resolution photographic detail, humane and unposed, premium editorial composition without glossy advertising lighting. Keep important people and their faces inside the central 65 percent for responsive cropping. Leave the lower quarter visually calm for an existing website caption, but DO NOT draw text or a gradient into the image. No poverty spectacle, no distress, no surgery, no blood, no oversized equipment, no hospital ward, no stereotypical costume staging, no branding or watermark, no readable signs. This is a fictional illustrative scene, not documentation of an actual foundation event or real KCG staff or patients.

Created with the built-in image-generation tool on 5 November 2026. The homepage and story introduction use `public/images/rural-health-camp-illustration.jpg`, with responsive AVIF copies. The website labels it AI-generated. The old real health-camp photograph remains in historical gallery/journal content. Existing default CMS hero paths are upgraded for display; custom uploaded heroes are preserved. No SQL change is needed.
