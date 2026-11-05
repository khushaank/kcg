# Photos, films and stories to supply

Your original `Logo.png` is already included and is now used intact in the website header, footer and staff sign-in. You do not need to send it again. An original SVG or transparent high-resolution version is optional if you have one.

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

Use different photographs, rather than the same picture cropped three ways. JPEG, PNG, WebP or AVIF are supported. A web copy must be **at most 2 MB** and no more than **4,096 pixels per side**, preferably around **1,600–2,400 pixels** on its longest side. Keep the original masters. Caption files must be WebVTT and no larger than **256 KB**. See [DATA-LIMITS.md](DATA-LIMITS.md) for all limits.

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

A starter is in [MAKER-DETAILS-TEMPLATE.md](MAKER-DETAILS-TEMPLATE.md) in this documentation folder. Copy its prompts into each maker's `DETAILS.txt`. File names can differ; the important part is keeping each maker and product together. Links to large videos can go in the corresponding `DETAILS.txt` file.

When the files are ready, tell me which folder to use. I can map each item to the correct maker/product, add captions and descriptions from your supplied information, connect the media to the website and verify the pages. You can also upload directly through the authorised staff workspace once Supabase is connected.

Only provide material you have permission to publish, including the maker's approval of their biography and portrait. For identifiable children, obtain guardian approval. Keep passwords, authentication codes and payment secrets out of this folder. New records can remain drafts until you review them.
