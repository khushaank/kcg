# Error handling and recovery

Public pages keep their published HTML visible when an application file fails to download. A compact recovery notice offers refresh, contact and dismiss controls; it never displays raw server errors or credentials. Runtime failures and rejected actions have a fallback notice. Offline notices keep visitors aware that submission and payment need a connection.

Supabase browser requests abort after 20 seconds. Public content reads have an earlier eight-second deadline and preserve a published snapshot when refresh fails. Staff media uploads have a two-minute request limit. Errors release form/save/upload buttons, preserve entered values and show relevant connection, access, rate-limit or validation advice. Server-side validation, quotas and permissions remain authoritative.

Forms reset only after a successful submission. The device bag survives catalogue and account-sync failures. Failed catalogue reads block adding pieces and payment until availability can be checked. Missing images fall back once to a placeholder, including removal of broken responsive candidates. Failed films show a recovery message; transcripts remain readable.

The Razorpay script has a 15-second loading deadline. Payment verification failures direct customers to their account and order reference instead of encouraging a second payment. Writes and payments are never automatically retried by the request wrapper. A lost connection after sending a write can leave its outcome uncertain: check the saved record or order before repeating it. Checkout retains its idempotency reference.

Staff save and upload failures preserve the current form. Unexpected staff action failures show safe messages; authentication and permission failures continue to deny protected access. Idle/absolute session expiry still locks the workspace. Save important work promptly; a timeout cannot preserve an authenticated session indefinitely.

## Checks before deployment

1. Run `npm test`, `npm run build` and `npm run check:security`.
2. Open the production preview on desktop and phone. Check navigation, public content and missing-page recovery.
3. In browser DevTools, switch Network to Offline while a form has unsaved text. Confirm the notice appears and text remains. Reconnect before submitting.
4. Block an image request and refresh. Confirm the placeholder appears without an infinite request loop.
5. Block a public content request and reload. The initial published content should stay readable. If the catalogue fails, the saved bag must remain and payment must be blocked.
6. With your authorised staff account, test a rejected upload, draft save, expired access and MFA error. Verify save buttons recover and unsaved fields remain on a failed save.
7. In Razorpay test mode, test widget closure and payment verification failure. Use order status to resolve uncertain payment outcomes.

Local automated checks cover request cancellation, safe error classification, preserved catalogue/cart state, server validation, quotas and role restrictions. They do not replace live provider checks, SMTP delivery, staff sign-in or a complete payment test using your own authorised accounts.
