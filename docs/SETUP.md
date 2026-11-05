# KCG Foundation: first-time setup

Follow these steps for first-time setup. If your staff sign-in already works, apply only the latest SQL upgrade listed in step 3; project and account creation are one-time tasks.

## 1. Create your Supabase project

1. Sign in at [Supabase](https://supabase.com/dashboard).
2. Choose **New project**, select your organisation, and name the project `KCG Foundation`.
3. Choose a region close to your visitors. Choose and privately save the database password; it does **not** go in the website.
4. Wait until the project finishes provisioning.

## 2. Add the two website credentials

In your project's **Connect** dialog or **Settings → API Keys**, find the project URL and **publishable key**.

Open **`.env.local` in `A:\Software\KCG-main`** and replace the placeholders:

```dotenv
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

These are the two public values the browser needs. Keep service-role keys, payment secrets, database passwords and staff passwords out of this file. The file is ignored by Git. Restart `npm run dev` after changing it; rebuild before deployment.

## 3. Run the SQL files

Inside the same Supabase project:

1. Open **SQL Editor** from the left sidebar.
2. Choose **New query**.
3. Open the first file below on your computer, copy **all** its SQL, paste it into the editor, then press **Run**.
4. Wait for success. Open a new query and repeat with the next file.

| Order | File | What it creates |
| --- | --- | --- |
| 1 | [01-schema.sql](../supabase/sql/01-schema.sql) | Makers, products, customer carts, orders, enquiries, newsletter and initial permissions |
| 2 | [02-content.sql](../supabase/sql/02-content.sql) | Your existing foundation journal articles |
| 3 | [03-storage.sql](../supabase/sql/03-storage.sql) | Image storage bucket |
| 4 | [04-maker-stories.sql](../supabase/sql/04-maker-stories.sql) | Portraits, personal stories, making films, galleries and provenance |
| 5 | [05-admin.sql](../supabase/sql/05-admin.sql) | Staff membership, foundation content, gallery and upload permissions |
| 6 | [06-staff-roles.sql](../supabase/sql/06-staff-roles.sql) | Super admin / manager / editor permissions and mandatory password + MFA checks |
| 7 | [07-content-limits.sql](../supabase/sql/07-content-limits.sql) | Locked name, upload sizes, content and quantity limits |
| 8 | [08-security.sql](../supabase/sql/08-security.sql) | Private request quotas and server-only public form writes |

**Already ran 01–07: run only 08 now, then deploy the updated Edge Functions as shown in [DEPLOYMENT.md](DEPLOYMENT.md). New project: run all eight in order.** File 01 is a one-time bootstrap. File 05 refuses to run after staff roles have been installed. Future role changes are made in `admin_users`; they do not require rerunning the schema. SQL 08 and the updated public-form function/frontend must be deployed together.

Afterwards, **Table Editor** should show `makers`, `products`, `site_content`, `gallery_items`, `admin_users`, `orders` and the other records. **Storage** should show `kcg-media`, `kcg-films` and `kcg-captions`. Run the project's **Security Advisor** and review any project-specific findings. See [DATA-LIMITS.md](DATA-LIMITS.md) for all content and media limits.

Do not change `public.admin_users` to allow public writes. Its protected membership table is what keeps an ordinary customer account out of the staff workspace.

## 4. Create your staff ID and password

1. Open **Authentication → Users** in Supabase.
2. Use **Add user / Create user** to create an email/password account for yourself. The staff ID is this email address.
3. Choose a unique password of at least 16 characters. Confirm the email when creating an account you own, or complete Supabase's confirmation process.
4. Configure the project's password policy and keep Supabase's sign-in rate limits enabled. Ensure TOTP multi-factor authentication is enabled in the Auth settings.

There is no shared `admin/admin` account and no password embedded in the website. You create and manage passwords in Supabase Auth. We never create a plaintext password table or fetch a password into the browser. Supabase verifies the password securely. [Supabase password authentication](https://supabase.com/docs/guides/auth/passwords).

## 5. Give yourself super admin access

Create a new SQL Editor query and run the following with **your exact staff email**:

```sql
insert into public.admin_users(user_id, role, enabled)
select id, 'super_admin', true
from auth.users
where lower(email) = lower('YOUR-DIRECTOR-EMAIL@example.com')
on conflict(user_id) do update
set role = excluded.role, enabled = true;
```

If the query affects zero rows, the account does not exist yet or the email does not match. Check Authentication → Users and correct the email. No password belongs in this SQL.

To grant another person access, first create their Authentication account, then run the same query using their email and either `editor` or `manager` instead of `super_admin`.

| Permission | Editor | Manager | Super admin |
| --- | --- | --- | --- |
| Add/edit draft makers, products, journal and gallery | Yes | Yes | Yes |
| Upload public website media | Yes | Yes | Yes |
| Publish or move published content to draft | No | Yes | Yes |
| Change foundation content and programs | No | Yes | Yes |
| Read enquiries, subscribers and customer orders | No | Yes | Yes |
| Mark a paid order shipped / delivered | No | Yes | Yes |
| Configure verified maker payout accounts | No | No | Yes |
| Assign staff roles from the website | No | No | No |

An editor can read a published story, but a manager must move it to draft before the editor changes it. This prevents an editor's unreviewed edits from changing a live page.

**Roles are managed only through Supabase.** In Table Editor → `admin_users`, the columns are:

- `user_id`: the user's UUID from Authentication → Users.
- `role`: `super_admin`, `manager`, or `editor`.
- `enabled`: turn off to remove staff access immediately.

The website cannot insert, change or delete staff memberships. Do not use user-editable profile metadata to assign roles.

Example revocation, from SQL Editor:

```sql
update public.admin_users
set enabled = false
where user_id = 'THE-STAFF-USER-UUID';
```

## 6. Open the private staff address and set up MFA

Your staff address is:

```text
/seva-karyalaya-7c9e4b2d.html
```

The old `/admin.html` page is removed. The staff address is not linked from public navigation or the footer, and its page asks search engines not to index it. The URL is only a discreet entrance; the password, MFA and database permissions enforce security.

For local development, open:

```text
http://127.0.0.1:5173/seva-karyalaya-7c9e4b2d.html
```

1. Sign in with your staff ID (email) and the password you created in Supabase.
2. On your first sign-in, choose **Set up authenticator**.
3. Scan the QR code with your authenticator app. Enter its current six-digit code.
   If you cannot scan it, expand **Manual setup key**, add that key in your authenticator as a time-based account, and enter the code the app generates. Keep this key private.
4. The workspace opens after Supabase verifies the code and the database confirms your active role.
5. On later sign-ins, enter your password and authenticator code again.

Staff authentication is separate from customer sign-in. Staff tokens stay **in memory only**: there is no remembered staff login in localStorage, sessionStorage or a persistent cookie. Reloading/closing the page requires signing in again. The page locks after 15 minutes without interaction and staff database access expires 30 minutes after the password sign-in; roles and revocations are checked by the database on each request.

Secure authentication still requires a temporary session/token as proof of identity. Removing that proof entirely would make protected requests impossible. This implementation keeps the proof temporary rather than retrieving readable passwords. A sign-out does not magically erase already-issued JWTs; disabling membership in Supabase immediately blocks staff operations. [Supabase sessions](https://supabase.com/docs/guides/auth/sessions), [MFA](https://supabase.com/docs/guides/auth/auth-mfa).

If an authenticator is lost, the Supabase project owner should first disable that staff membership, then recover/reset the account's MFA through Supabase Auth. Do not remove the MFA policies to regain access.

## 7. Customer sign-in settings

In **Authentication → URL Configuration**, set the production Site URL and allow these customer redirects:

```text
http://127.0.0.1:5173/account.html
http://127.0.0.1:5173/checkout.html
https://kcg.b2bindustrial.in/account.html
https://kcg.b2bindustrial.in/checkout.html
```

Customer accounts use email links. Staff sign-in uses a password and authenticator instead; the staff page does not need a magic-link redirect. Configure production SMTP before accepting real customers. Customer registration never assigns staff membership.

## 8. Run and publish the website

From `A:\Software\KCG-main`, using Node.js 24 or newer:

```powershell
npm install
npm run dev
```

Open the local address printed by Vite. The public website leads with the foundation's work. The maker collection remains a supporting section. Use the staff workspace to add the real people, media and products.

Before hosting:

```powershell
npm test
npm run build
```

Upload the contents of **`dist/`** to your host at the domain root. Do not upload `.env.local`, documentation, source files or database secrets. Vite embeds only the public project URL/publishable key in its browser build. On an existing host, remove the old `admin.html` deployment file so the obsolete route does not remain available.

Use HTTPS on the production domain. The build includes security headers for Apache (`.htaccess`) and hosts supporting `_headers`, including no-store for the staff page and protection against framing. If your host uses a different configuration system, apply the equivalent headers there; a Vite preview does not verify your hosting provider's header configuration.

For GitHub credentials and hosting, follow [DEPLOYMENT.md](DEPLOYMENT.md). For merchant accounts, linked maker accounts and test/live keys, follow [RAZORPAY-SETUP.md](RAZORPAY-SETUP.md). Connecting Supabase does not by itself activate payment processing. Security controls and browser warnings are explained in [SECURITY.md](SECURITY.md).

## Next: your media and stories

Use [MEDIA-CHECKLIST.md](MEDIA-CHECKLIST.md). You can upload through your authorised workspace, or place the source files in `media-inbox/` and tell me they are ready so I can map and add them to the website.
