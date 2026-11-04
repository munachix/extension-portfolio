# ReplyNudge: Client Follow-Up Reminders for Gmail

## Store listing
- **Name:** ReplyNudge: Client Follow-Up Reminders for Gmail
- **Summary:** Never forget to follow up. One click on a sent email sets a reminder if the client doesn't reply, with ready follow-up templates.
- **Category:** Productivity → Communication
- **SEO keywords:** gmail follow up reminder, email follow up, remind me if no reply, follow up email template, client follow up, gmail reminder

## Problem
Freelancers and small business owners lose deals because they forget to follow up on proposals, quotes and invoices.

## Competition
- **Gmail's built-in "nudges"**: automatic and unreliable, you can't choose which emails.
- **Boomerang, Mailtrack, Right Inbox, Streak**: bigger and pricier products.

**Our edge:** tiny, does one thing, a freelancer-focused template set, and **no Gmail account access**, so nothing gets read from your inbox.

## MVP (free, 5 active nudges)
- A "Nudge me" button in Gmail compose and on sent emails → choose 2 / 3 / 7 days.
- Saves the subject, recipient and thread link to your own computer.
- When it's due: a Chrome notification + a list in the popup. Clicking it opens the thread.
- "Mark replied" to clear.

## Pro ($3.99/mo)
- Unlimited nudges, repeat nudges (3d → 7d → 14d).
- **Follow-up templates** (proposal, quote, unpaid invoice, after interview) that insert into the reply.
- Auto-clear: when you open the thread and it has a new message from the recipient, mark it replied (read from the page, no API).
- Weekly digest of follow-ups.

## Tech: no Gmail API on purpose
- The Gmail API scopes needed for this are **restricted** and need Google's verification plus a paid security assessment. That's too costly for a $4 product.
- We use a **content script on mail.google.com** that reads only what's on screen when the user clicks our button.
- Storage: `chrome.storage.local`. Reminders: `chrome.alarms` + `notifications`.
- **Permissions:** `storage`, `alarms`, `notifications`, host `https://mail.google.com/*`.

## Acceptance tests
- [ ] The button appears in compose and in an opened sent thread.
- [ ] The reminder fires on the right day even after restarting Chrome.
- [ ] Clicking the notification opens the correct thread.

## Risks
- Gmail's page changes, so keep element selectors in a remote config file.
- Lowest-priority extension of the 10, because the generic "follow-up" space is busy. Lean on freelancer-specific templates for search ranking.
