# Razorpay accounts and maker payments

For this site's existing integration, use **one Razorpay Payment Gateway merchant account for the foundation/platform, with Standard Checkout and Razorpay Route**, plus **one Route Linked Account for each maker who receives money**. Route is the product that divides a customer order among third-party recipients. It supports multiple linked accounts and payment transfers. [About Route](https://razorpay.com/docs/payments/route).

## 1. Create the foundation's merchant account

1. Open [Razorpay](https://razorpay.com/) and sign up using an email and phone controlled by the foundation's authorised representative.
2. Register the real operating legal entity. Choose its actual legal/business type in onboarding; “KCG Foundation” as a website name does not determine the entity type.
3. Complete the dashboard's KYC and activation steps using the required legal, PAN, authorised representative and settlement-bank details. Use an account and documents that belong to the correct legal entity. Keep KYC documents and bank details in Razorpay's onboarding flow, not in GitHub or public maker biographies.
4. Provide the final HTTPS website URL, contact information, products/pricing, shipping/returns, privacy and terms pages. Generate test keys first. Live-key generation requires website verification. [API key setup](https://razorpay.com/docs/payments/dashboard/account-settings/api-keys).
5. Request/enable **Route** for this artisan marketplace flow. Explain that the platform takes no commission and routes product proceeds to individual makers. Confirm with Razorpay which maker/entity types are eligible and which KYC and compliance documents are required for your foundation and sellers; the website cannot grant merchant or Route approval. [Route integration](https://razorpay.com/docs/payments/route/integration-guide).

You do not need to create a RazorpayX account or a standalone merchant integration for every maker to use this code. Makers are onboarded as **Route Linked Accounts** under the approved platform. Their eligible bank/settlement details and any required dashboard access are managed through Route. [Linked Accounts](https://razorpay.com/docs/payments/route/linked-account).

## 2. Add each maker as a Linked Account

In the Razorpay Dashboard, choose **Route → Accounts → + Add Account**. Enter the maker's approved account name and email, complete the KYC form and bank details, and wait for the required approval/activation. Decide whether the maker should have their own Linked Account Dashboard access; this is separate from staff access to the KCG website. [Dashboard onboarding](https://razorpay.com/docs/payments/route/dashboard).

Once ready, copy the linked account's **`acc_…` ID**. In KCG's staff workspace, a **super admin** opens **Maker payout accounts**, selects the matching maker, pastes that ID and enables the account. Editors/managers cannot change this setting. A linked-account ID alone does not mean verification or bank settlement is complete; enable only the approved account.

Use distinct matching test-mode linked accounts with test keys. Before going live, replace the key pair and every applicable linked-account ID with its corresponding live value. Do not mix modes. [Test and live API keys](https://razorpay.com/docs/payments/dashboard/account-settings/api-keys).

## 3. Put private payment credentials in Supabase

Open **Supabase → Edge Functions → Secrets** and add:

```dotenv
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_PRIVATE_API_SECRET
RAZORPAY_WEBHOOK_SECRET=YOUR_SEPARATE_RANDOM_WEBHOOK_SECRET
ALLOWED_ORIGINS=https://kcg.b2bindustrial.in,http://127.0.0.1:5173
```

The foundation's Razorpay account owner/admin generates the key pair in **Account & Settings → API Keys**, after selecting **Test Mode**. Save the secret privately when it is generated. The browser receives only the key ID needed to open Checkout; the API secret and webhook secret remain in Supabase. Never prefix a payment secret with `VITE_`, paste it into website source, or upload it to GitHub. [Official key instructions](https://razorpay.com/docs/payments/dashboard/account-settings/api-keys).

Run SQL 08 and deploy the four functions as shown in [DEPLOYMENT.md](DEPLOYMENT.md). Supabase being connected is not enough to make payments work.

## 4. Set capture and webhook delivery

Enable automatic capture in the payment settings for this integration. Add a webhook with the exact URL:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/payment-webhook
```

Use the **same webhook secret** entered in Supabase and subscribe to **`payment.captured`** and **`order.paid`**. Keep delivery retries enabled. The server verifies the raw body's HMAC signature before changing an order to paid. Client “success” alone does not confirm payment. [Web Checkout integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps), [Route webhooks](https://razorpay.com/docs/payments/route/subscribe-to-webhooks).

## 5. Test first, then activate live mode

1. Use real authorised test maker/product records with complete publication content and test-mode payout IDs.
2. Place a test order with one maker, then another containing two different makers.
3. Verify the displayed amount equals the server's order total and paid amount.
4. Check that the order is paid only after captured-payment verification and that each maker receives the correct allocation in Route.
5. Retry payment confirmation/webhook delivery and confirm no duplicate order, stock reservation or allocation appears.
6. Exercise a failed/abandoned payment and **Continue payment** from the customer account. Review any `payment_setup_review` record before attempting another payment.
7. Confirm refund/reversal procedures, fees and settlement timing with Razorpay, then switch to the approved live keys, live linked accounts and live webhook settings. Perform a controlled authorised live validation yourself before broad launch.

This code allocates the full product price to the matching maker with zero foundation commission. Razorpay/provider fees and bank settlement timing are separate, and your merchant arrangement must cover them. Do not promise fee-free or instant bank receipt. Refunds, reversals, disputes and reconciliation remain operations in Razorpay; this site does not automate that ledger. [Transfers and fees](https://razorpay.com/docs/payments/route/transfer-fees-example).

Donation forms on this site are **enquiries only**. Product purchases are separate from charitable donation receipts. Do not treat approval for store payments as approval for any particular donation or tax treatment.
