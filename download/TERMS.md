# Krypta — Terms and Conditions

**Effective date:** November 1, 2026
**Operator:** Hashim
**Platform:** Krypta (the "Platform")
**Operator contact:** Provided by each user at signup (phone, WhatsApp, or email — your choice)

By signing up for an account on Krypta, you (the "User") agree to these Terms. If you do not agree, do not create an account.

---

## 1. What Krypta Is

Krypta is a lead-generation and AI-representation platform that connects independent digital creators, developers, and designers with clients who need their skills. The Platform provides:

- A zero-knowledge encrypted vault where you store your skills, pricing floors, portfolio links, and BYOK API keys
- AI tools that draft client outreach and advise you on your freelance practice
- An inbound marketplace where clients post project briefs
- A personal wallet that tracks your earnings from completed projects and processes your withdrawals
- Aggregation of legitimate lead sources (Hacker News, GitHub, Mastodon, Bluesky, RSS feeds, and others added over time)

Krypta is operated personally by Hashim. There is no automated moderation, no algorithmic account termination, and no opaque decision-making. When something goes wrong, Hashim handles it directly via the contact method you provided at signup.

---

## 2. Platform Fee Structure

Krypta charges a percentage fee on every withdrawal you request, deducted from the gross withdrawal amount before payout. The fee rate depends on whether you signed up during the early-adopter window.

### 2.1 Early Adopter Rate (28%)

The first **10 users** to sign up for Krypta are locked in as Early Adopters. Their fee rate is **28%** for the lifetime of their account. This rate never increases, regardless of how large the Platform grows.

Example: An Early Adopter requests a withdrawal of $100.00.
- Operator fee (28%): $28.00
- User receives: $72.00

### 2.2 Standard Rate (35%)

Users who sign up after the first 10 are subject to the **35% standard fee rate**.

Example: A Standard user requests a withdrawal of $100.00.
- Operator fee (35%): $35.00
- User receives: $65.00

### 2.3 Why the fee is what it is

The operator is transparent about what the fee covers:

- Z AI API usage (the Guide AI runs on GLM-4.6, billed per token)
- VPS hosting and Postgres database
- Domain registration and renewal
- Advertising and creator acquisition
- Operator time for personal support, misuse handling, and withdrawal fulfillment
- Continued development of the Platform

The fee is not negotiable per-transaction. If you believe the fee is too high for your use case, you are free to not use the Platform.

### 2.4 No fee on deposits, only withdrawals

You are not charged when earnings land in your wallet. You are only charged when you request a withdrawal. If you never withdraw, you are never charged.

### 2.5 Minimum withdrawal threshold

The minimum withdrawal request is **$20.00 USD equivalent** (or local-currency equivalent at the time of processing). Withdrawal requests below this amount will be rejected.

### 2.6 Fee rate changes

The operator reserves the right to **decrease** the standard fee rate at any time, effective for all future withdrawals. The operator will **never increase** the rate for users who have already signed up. Your rate at signup is locked for the lifetime of your account.

---

## 3. Withdrawal Methods

When you request a withdrawal, you select one of the withdrawal methods you have previously added to your encrypted vault. Krypta supports:

### 3.1 Pakistan

- **JazzCash** — mobile wallet, requires the phone number linked to your JazzCash account
- **EasyPaisa** — mobile wallet, requires the phone number linked to your EasyPaisa account
- **NayaPay** — mobile wallet, requires your NayaPay account ID or phone number

### 3.2 India

- **Paytm** — mobile wallet, requires your Paytm-registered phone number
- **UPI** — bank-backed instant transfer, requires your UPI ID (e.g., `yourname@bank`)

### 3.3 International

- **PayPal** — requires your PayPal email address
- **Bank Account (Wire/ACH)** — requires account holder name, account number, routing/SWIFT code, and bank name

### 3.4 Other methods

If you need a withdrawal method not listed above (e.g., Wise, Revolut, Payoneer, Crypto USDT), contact Hashim directly via your registered contact method. Approval is at the operator's discretion and processed case-by-case.

### 3.5 Storage of withdrawal method details

All withdrawal method details you save in the Platform are encrypted in your browser before being stored. The operator cannot read them. When you request a withdrawal, the operator receives only the method label (e.g., "JazzCash — +92 300 1234567") and the request amount. To fulfill the withdrawal, Hashim will contact you via your registered contact method to confirm the full payout details before sending funds.

### 3.6 Processing times

- **Mobile wallets (JazzCash, EasyPaisa, NayaPay, Paytm, UPI):** Typically within 24 hours of approval, often within 2-4 hours during business hours (Pakistan time, UTC+5).
- **PayPal:** 1-3 business days after approval.
- **Bank wire/ACH:** 3-7 business days after approval, depending on the destination country and intermediary banks.
- **Other methods:** Discussed and agreed when the method is approved.

### 3.7 Currency conversion

Withdrawals are processed in the currency available to the operator at the time. If your wallet balance is in USD and you request withdrawal to a PKR wallet (JazzCash, EasyPaisa, NayaPay), the conversion uses the **mid-market exchange rate** at the time of processing as published by [xe.com](https://xe.com) or equivalent. The operator does not add a currency-conversion fee on top of the platform fee.

---

## 4. Withdrawal Request Flow

1. You submit a withdrawal request through the Wallet tab in your dashboard, specifying:
   - The withdrawal method (selected from your saved methods)
   - The amount (in USD equivalent)
2. The Platform calculates the fee based on your locked fee rate (28% or 35%) and shows you the net amount you will receive.
3. The request enters the `PENDING` status and appears in the operator's admin panel.
4. Hashim reviews the request, contacts you via your registered contact method to confirm payout details, and either:
   - **Approves** the request → status becomes `APPROVED` → funds deducted from your wallet balance → payout sent via the chosen method → status becomes `PAID`
   - **Rejects** the request → status becomes `REJECTED` → funds remain in your wallet balance → reason for rejection communicated to you
5. You can track the status of every withdrawal request in your Wallet tab.

---

## 5. Fraud, Spam, and Abuse Policy

Krypta has zero tolerance for fraud, spam, or abuse. The following behaviors result in immediate account review and likely termination:

### 5.1 User-side fraud

- Misrepresenting skills in your vault (claiming capabilities you do not have)
- Using AI-generated drafts to spam clients who have not requested contact
- Submitting withdrawal requests for earnings not legitimately owed to you
- Creating multiple accounts to abuse the early-adopter rate
- Sharing your account with other users (each account is for one person)
- Attempting to read or modify another user's vault through technical exploits

### 5.2 Client-side fraud (handled by the AI)

The AI Rep includes fraud-detection signals in every draft it generates. Leads exhibiting any of the following are flagged for review before any outreach is sent on your behalf:

- Requests for upfront payment or "advance fees" before work begins (legitimate milestones are paid in arrears)
- Pressure to communicate exclusively off-platform (signal of scam)
- Budgets that are implausibly high for vague scope ("$50,000 for a landing page")
- Requests to use Western Union, MoneyGram, gift cards, or crypto to anonymous addresses
- Email addresses or phone numbers in the first message (signal of bypass attempts)
- Unrealistic timelines (e.g., "complete a SaaS in 3 days")

When a lead is flagged, the AI Rep will decline to generate an outreach draft and will explain the red flags it detected. The flagged lead is visible to the operator for review.

### 5.3 Consequences of fraud

If fraud is confirmed against you:

- Your account is terminated immediately
- Any pending withdrawal requests are frozen pending investigation
- If the operator has already paid out funds obtained through fraud, you are liable to repay them
- You are permanently barred from creating a new account
- The operator may report confirmed fraud to relevant authorities in your jurisdiction

There is **no automated account termination**. Every fraud decision is made by Hashim personally, after reviewing the evidence and (where possible) contacting you for your side.

### 5.4 Spam and quality control

The AI Rep is configured to **refuse to generate outreach** for leads where your skill fit is below threshold. Specifically:

- If the AI's computed `fit_score` for a lead is below 30 out of 100, no draft is generated
- The AI's `fit_assessment` is included in every successful draft, so you and the client both see an honest evaluation of the match
- The AI will never claim skills you do not have in your vault
- The AI will never propose timelines or prices that contradict your stated pricing floors

This protects both clients (they get matched with creators who can actually do the work) and creators (you don't waste time on leads you can't win).

---

## 6. Zero-Knowledge Vault and Privacy

### 6.1 What is encrypted

All Tier 2 data — your skills, pricing floors, portfolio links, notes, BYOK API keys, and withdrawal method details — is encrypted in your browser using AES-GCM 256-bit encryption before being sent to the server. The encryption key is derived from your vault passphrase via PBKDF2 (250,000 iterations, SHA-256).

### 6.2 What the operator cannot read

The operator (Hashim) cannot read the contents of your vault. This is enforced at the database query level — the admin panel's Prisma query deliberately omits the ciphertext field. Even if compelled by law enforcement or a court order, the operator cannot produce data that does not exist on the server in readable form.

### 6.3 What the operator can read

The operator can see the following Tier 1 data you provide at signup or in your profile:

- Your email address (used for login)
- Your name (so Hashim can address you)
- Your preferred contact method (phone, WhatsApp, or email)
- Your contact value (the actual phone number or email)
- Feedback you choose to submit
- The structure of your vault (how many entries, what types, what labels) — but not the contents

### 6.4 Your recovery code

At signup, the Platform generates a 32-character recovery code and displays it once. This code is the **only** way to recover your vault if you lose your passphrase. The operator does not have it. The operator cannot reset your passphrase. If you lose both your passphrase and your recovery code, your vault is permanently inaccessible — to you, to the operator, to anyone.

### 6.5 Your responsibility

You are responsible for keeping your passphrase and recovery code secure. The operator is not liable for loss of vault access due to forgotten passphrases or lost recovery codes.

---

## 7. Wallet and Earnings

### 7.1 How earnings enter your wallet

Earnings are added to your wallet when:

- You and a client agree on a project scope and price (recorded through the Platform's milestone system, when available)
- The client pays a milestone invoice (off-platform, via Hashim's billing channel)
- Hashim records the deposit against your wallet

Until a deposit is recorded, the Platform does not "know" about earnings — it's a ledger, not a payment processor.

### 7.2 Wallet balance accuracy

Your wallet balance reflects what the Platform has recorded. If you believe your balance is incorrect, contact Hashim via your registered contact method within 30 days of the transaction in question. Disputes raised after 30 days may not be resolvable.

### 7.3 No interest

The Platform does not pay interest on wallet balances. Wallet balances are not bank deposits and are not FDIC-insured or equivalent. They are a record of funds owed to you by the operator, payable on withdrawal request.

### 7.4 Negative balances

The Platform will never allow your wallet balance to go negative through normal operations. If a previously-deposited earning is reversed (e.g., a client chargeback), your balance may go negative. In that case, future deposits will be applied to cover the negative balance before becoming available for withdrawal.

---

## 8. Off-Platform Billing Acknowledgment

You acknowledge that:

- Krypta does not process payments directly. All real money movement happens through Hashim's off-platform billing channels (your chosen withdrawal method, manually fulfilled by Hashim).
- Krypta is a ledger and AI-tool platform, not a payment processor.
- The operator is not a bank, escrow service, or financial institution.
- Wallet balances represent the operator's good-faith obligation to pay you, not a legal deposit.

This structure was chosen deliberately: it keeps the Platform's compliance surface small, the operator's relationship with you personal, and the AI tools focused on their actual purpose (lead generation and representation) rather than payments.

---

## 9. Acceptable Use

You agree NOT to:

- Use the Platform to facilitate money laundering, tax evasion, or sanctions evasion
- Submit withdrawal requests for amounts you have not legitimately earned through the Platform
- Use AI-generated outreach to spam, harass, or defraud clients
- Attempt to reverse-engineer, scrape, or extract data from another user's vault
- Resell or sub-license your account access
- Use the Platform if you are under 18 years old
- Use the Platform if you are located in a country subject to comprehensive sanctions by the United States, European Union, or United Kingdom

You agree TO:

- Provide accurate identity and contact information at signup
- Maintain the security of your passphrase and recovery code
- Use the AI tools honestly (no misrepresentation of skills)
- Pay the platform fee on withdrawals as defined in Section 2
- Contact Hashim via your registered contact method if anything goes wrong, before pursuing other remedies

---

## 10. Account Suspension and Termination

### 10.1 By the operator

The operator may suspend or terminate your account if:

- You violate these Terms (especially Section 5 — Fraud, Spam, and Abuse)
- The operator receives credible evidence of misconduct
- You are unresponsive to operator contact for 60+ days
- Regulatory or legal requirements force the operator to do so

The operator will make reasonable efforts to contact you before termination, via your registered contact method. If you cannot be reached, the operator may proceed with termination after a 14-day waiting period.

Upon termination:

- Your wallet balance (if any) is paid out to your last-known withdrawal method, minus the applicable fee
- Your vault entries are permanently deleted from the server
- Your Tier 1 data (name, contact, feedback) is retained for 90 days for record-keeping, then deleted
- Your account cannot be reinstated

### 10.2 By you

You may close your account at any time by:

- Withdrawing any remaining wallet balance (subject to the minimum threshold and standard fee)
- Contacting Hashim via your registered contact method and requesting account closure
- Your vault entries are deleted within 7 days of closure confirmation

---

## 11. Intellectual Property

### 11.1 Your content

You retain all intellectual property rights in your skills, portfolio, and any content you create through the Platform. The Platform receives a limited license to display your portfolio links in AI-generated drafts and in the marketplace (when you opt in).

### 11.2 Platform content

The Platform's design, AI prompts, and software are the intellectual property of Hashim. You do not acquire any rights to the Platform itself by using it.

### 11.3 AI-generated drafts

Drafts generated by the AI Rep are derivative works based on your vault content. You retain ownership of drafts you approve and send. The Platform retains no claim on outreach you send using its drafts.

---

## 12. Disclaimers and Limitation of Liability

### 12.1 "As is" service

The Platform is provided "as is" without warranties of any kind. The operator does not guarantee:

- That the Platform will be available at all times (maintenance, outages, force majeure)
- That AI-generated drafts will result in client engagement or project awards
- That leads aggregated from external sources are accurate, legitimate, or current
- That your vault will never be inaccessible due to forgotten passphrase or lost recovery code

### 12.2 Limitation of liability

To the maximum extent permitted by law, the operator's total liability to you for any claim arising from your use of the Platform is limited to **the total amount of platform fees you have paid in the 12 months preceding the claim**.

The operator is not liable for:

- Loss of vault access due to forgotten passphrase or lost recovery code
- Loss of earnings due to client non-payment (the Platform is a ledger, not a payment processor)
- Indirect, incidental, or consequential damages
- Force majeure events (war, natural disaster, government action, internet infrastructure failure)

### 12.3 No legal advice

The operator is not your lawyer, accountant, or tax advisor. The Platform does not provide legal, tax, or financial advice. The Guide AI provides strategic guidance on your freelance practice, but its outputs are not legal advice and should not be relied upon as such.

---

## 13. Dispute Resolution

### 13.1 Direct contact first

If you have a dispute with the operator, you agree to contact Hashim directly via your registered contact method and attempt to resolve the dispute in good faith for 30 days before pursuing other remedies.

### 13.2 Operator's jurisdiction

The operator is based in Pakistan. Any legal action arising from these Terms or your use of the Platform will be brought in the courts of Pakistan, unless you and the operator agree in writing to a different jurisdiction.

### 13.3 Pakistan law

These Terms are governed by the laws of Pakistan, without regard to conflict-of-law principles.

---

## 14. Changes to These Terms

The operator may update these Terms at any time. When material changes are made:

- The "Effective date" at the top of this document is updated
- All users are notified via their registered contact method
- Users who disagree with the changes may close their account and withdraw their balance under the terms in effect before the change
- Continued use after the effective date constitutes acceptance of the new Terms

The operator will never make retroactive changes to:
- The fee rate locked at your signup (Section 2)
- The zero-knowledge vault architecture (Section 6)
- The off-platform billing structure (Section 8)

---

## 15. Contact

For any question, concern, or dispute:

- **Method:** The contact method you provided at signup (phone, WhatsApp, or email)
- **Response time:** Usually within 24 hours during business hours (Pakistan time, UTC+5)
- **Operator:** Hashim, personally

There is no support team, no ticketing system, no chatbot handoff. You talk to Hashim directly.

---

## Acknowledgment

By creating an account on Krypta, you acknowledge that:

- You have read these Terms
- You understand the fee structure (28% if you are an Early Adopter, 35% otherwise)
- You understand the zero-knowledge vault means the operator cannot recover your vault if you lose your passphrase and recovery code
- You understand the Platform is a ledger, not a payment processor, and all real money movement is handled off-platform by the operator
- You understand the AI tools will refuse to generate outreach for leads where your skill fit is below threshold or where fraud signals are detected
- You understand the operator handles misuse personally, not through automated moderation

---

*These Terms are version 1.0, effective November 1, 2026. The operator may update them per Section 14.*
