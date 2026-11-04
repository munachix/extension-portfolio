# FillSnip: Text Templates & Snippets with Fill-in Fields

## Store listing
- **Name:** FillSnip: Text Templates & Snippets with Fill-in Fields
- **Summary:** Type ;intro to insert saved replies anywhere. Templates with fill-in fields like {name} and {price}. Text expander for any site.
- **Category:** Productivity → Tools
- **SEO keywords:** text expander, text templates, canned responses, snippets chrome, proposal templates, saved replies, text blaze alternative

## Problem
Freelancers, recruiters, support agents and sales reps retype the same proposals and replies with small changes (client name, price, deadline) dozens of times a day.

## Competition
**Text Blaze** (market leader, freemium), Magical, Briskine, Auto Text Expander.

**Our edge:**
- A simpler, cheaper lifetime option.
- **Ready-made template packs** for specific jobs (Upwork proposals, recruiter outreach, customer support, real estate replies).
- A fill-in form pops up before inserting.

## MVP (free, up to 15 snippets)
- Create snippets with a shortcut (`;intro`) and fields: `{client_name}`, `{price}`, `{date:+3d}`, `{clipboard}`.
- Typing the shortcut in any text box (inputs, textareas, content-editable editors including Gmail and LinkedIn) opens a small form, then inserts the filled text.
- Right-click → "Insert snippet" menu.

## Pro ($3.99/mo or $24 lifetime)
- Unlimited snippets, folders, search palette (`Ctrl+Shift+Space`).
- Dropdown fields `{tone: friendly|formal}` and optional sections.
- **Template packs** (the SEO hook: each pack gets its own landing page, like "Upwork proposal templates").
- Backup/sync via Chrome sync storage (it has limits, so chunk large libraries) or an exported JSON file.

## Tech
- A content script on all sites listens for `input` events and detects the shortcut prefix.
- Insertion with `document.execCommand('insertText')` (still the most compatible method for rich editors), falling back to setting the value and dispatching input events.
- **Permissions:** `storage`, `contextMenus`, host `<all_urls>`. This needs a clear justification at review ("Inserts user-created text in text fields the user is typing in; no data collected").

## Acceptance tests
- [ ] Works in Gmail compose, LinkedIn message, Upwork proposal box, Google Docs (skip if not possible; document the limitation).
- [ ] Field form appears and the cursor returns to the right place after insert.
- [ ] Undo (Ctrl+Z) removes the inserted text.

## Risks
- `<all_urls>` reviews are slower. Mitigate with a minimal code footprint and a clear privacy policy.
- Text Blaze dominates the generic search terms, so win on the long-tail template-pack keywords.
