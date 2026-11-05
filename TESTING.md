# Try the extensions yourself

About 5 minutes to set up, then 10–15 minutes per extension. Use your normal Chrome.

## 1. Build the test versions (once, and again after any change)

```bash
pnpm install
```
```bash
pnpm build hirefill && pnpm build flipcomps && pnpm build reconfinder && pnpm build borderbatch && pnpm build workfromwhere
```

VisaFlag needs its sponsor lists, which normally come from the data website. Until that exists, this command builds the real lists and serves them from your computer. Leave it running while you test VisaFlag:

```bash
pnpm visaflag:try
```

## 2. Load them into Chrome

1. Open `chrome://extensions` and turn on **Developer mode** (top right).
2. Click **Load unpacked** and choose `extensions/<name>/dist` (for example `extensions/hirefill/dist`). Do this for each one.
3. Pin them: puzzle-piece icon in the toolbar → pin.

Test versions show **(dev)** in their name. After you rebuild, click the ↻ on the extension's card and reload the web page you're testing on.

## 3. Try Pro without paying

Test versions accept this key anywhere it asks for a license: **TEST-PRO-0000-0000**. It never works in the store versions. Click **Remove key** to go back to the free plan.

## What to try

### HireFill (job applications)
1. Click the HireFill icon. The app opens in the side panel. Upload your CV (PDF or Word) and check the **Profile** tab.
2. Fill in **Questions** (work authorization, sponsorship and so on).
3. Open a real application and click **⚡ Fill with HireFill**. Don't submit anything you don't mean to.
   - Greenhouse: any company's `job-boards.greenhouse.io/<company>/jobs/<id>`
   - Lever: `jobs.lever.co/<company>/<id>/apply`
   - Workday: any company's "Apply" flow (you'll need to create an account with that employer)
4. Check the colours: green = filled, yellow = check it, red = needs you. Click **Next empty field**.
5. Free limit check: autofill should never stop. The AI drafts (Tailor tab) stop after 5 on the free plan.

### VisaFlag (visa sponsors)
1. With `pnpm visaflag:try` running, load `extensions/visaflag/dist`. In its settings, tick the countries.
2. Open LinkedIn jobs in London or Amsterdam, or search "Monzo", "Google" or "JPMorganChase". Badges appear next to the company name.
3. US badges say "no data" until you add the US file (see `extensions/visaflag/README.md`).

### WorkFromWhere (remote jobs)
1. Set your country in its settings.
2. Open remote jobs on LinkedIn, We Work Remotely or Remote OK. Look for posts that say "US only" or "EU only".
3. Click the badge: the sentence it used should be highlighted in the post.

### FlipComps (resellers)
1. Open any listing on eBay, Poshmark, Mercari, Depop or Etsy. The panel shows fees and what you keep.
2. Click **eBay sold ↗**. On the sold results the panel shows the median. Free gives 10 different searches a day.

### ReconFinder (QuickBooks Online)
1. Open **Reconcile** for an account in QuickBooks Online (a sandbox company works: developer.intuit.com).
2. Untick one transaction. ReconFinder should name that transaction as the cause of the difference.
3. It must never tick or change anything itself.

### BorderBatch (photos)
1. Click its icon: it opens in the side panel. Drop in a few photos, pick 4:5 and a border, then click **Process**.
2. Download the ZIP and check the size (1080 × 1350) and that the location data is gone.

## When something's off

Note the page address, what you expected and what happened (a screenshot helps). Send me the list and I'll fix it.
