/**
 * Everything the website says about each product. Prices come from each
 * extension.config.json so the site and the extension can't disagree.
 */
const LICENSE_ROW = ['License server', 'Only when you enter a Pro key: the key and a random id for this browser, so our server can ask Creem (our payment provider) if it’s valid. Re-checked about once a week.'];

export const PRODUCTS = [
  {
    slug: 'hirefill',
    name: 'HireFill',
    audience: 'Job seekers',
    line: 'Fills job applications from your CV, Workday included. You review, you submit.',
    title: 'Job Application Autofill for Workday, Greenhouse and Lever',
    h1: 'The whole application, <em>filled in a click.</em>',
    lede: 'Upload your CV once. On Workday, Greenhouse, Lever, iCIMS and the rest, HireFill fills every field it can and colours what’s left, so you only answer the questions that are really yours.',
    priceLine: 'Autofill free, no limit',
    spec: [['Works on', 'Workday · Greenhouse · Lever · iCIMS · Taleo · SmartRecruiters · Ashby · BambooHR · Workable · JazzHR · SuccessFactors · LinkedIn Easy Apply · Indeed'], ['Your data', 'Stays in your browser. No account.'], ['Never', 'Clicks Submit or Apply']],
    url: 'acme.wd5.myworkdayjobs.com/careers/job/Senior-Engineer/apply',
    mock: () => `
      <h4>My Experience</h4><div class="sm">Step 3 of 6</div>
      <div class="f-row"><label>Job title*</label><div class="f-in g">Senior Software Engineer</div></div>
      <div class="f-row"><label>Company*</label><div class="f-in g">Stripe</div></div>
      <div class="f-row"><label>Will you now or in the future require sponsorship?*</label><div class="f-in g">No</div></div>
      <div class="f-row"><label>Why do you want to work here?</label><div class="f-in y">I’ve spent five years building payment…</div></div>
      <div class="f-chk"><span class="f-in r"></span> I agree to the privacy notice</div>
      <div class="hf-panel"><div class="b">Fill again</div><div class="s"><b class="g">18</b> filled · <b class="y">1</b> please check · <b class="r">1</b> needs you</div><div class="t">Review everything, then click Submit yourself.</div></div>`,
    steps: [
      ['Upload your CV', 'PDF or Word. It’s read on your computer into a profile you can check and correct.'],
      ['Answer the usual questions once', 'Work authorization, sponsorship, notice period, salary. Demographic questions default to “prefer not to say”.'],
      ['Click Fill on any application', 'Green is filled, yellow is worth a look, red needs you. “Next empty field” jumps straight there.'],
    ],
    details: [
      ['Workday, properly', 'Adds a Work Experience entry per job, fills month/year dates and custom dropdowns, and carries on after you click Next.'],
      ['Answer Bank', 'Type an answer once and HireFill offers it for similar questions on later applications.'],
      ['Never invents', 'CV tailoring only rewords and reorders what you actually did. A truth guard flags any employer, number or date that isn’t in your profile.'],
      ['Tracker', 'Every application is logged with the date and portal, with follow-up reminders and CSV export.'],
    ],
    free: ['Autofill on every supported portal, no limit', 'Workday work history, dates and dropdowns', 'Answer Bank and application tracker', 'Keyword match against the job post'],
    pro: ['AI CV tailoring with before/after and the truth guard', 'PDF and Word export of the tailored CV', 'Cover letters and answer drafts in three tones', 'Works with Chrome’s built-in AI or your own key'],
    proNote: 'Try it first: 5 AI drafts are included free.',
    freeSub: 'Everything you need to apply faster.',
    proSub: 'For tailoring each application to the job.',
    faq: [
      ['Is autofill really unlimited on the free plan?', 'Yes. Autofill, the Workday handling, the Answer Bank and the tracker have no limit and no time limit. Pro is only for the AI writing help.'],
      ['Will it submit an application for me?', 'No. HireFill refuses to click Submit, Apply or Send buttons. It fills, you review, you submit.'],
      ['Where does my CV go?', 'Nowhere. It’s read and stored in your browser. If you choose to use your own OpenAI, Anthropic or Google key for AI help, only the text for that request goes to that provider.'],
      ['What if a portal changes and a field stops filling?', 'It’s marked red so you see it, and you can fill it yourself. Email us the page and we’ll fix it, usually within days.'],
    ],
    privacy: {
      summary: 'HireFill has no servers that receive your data, no account and no tracking. Your CV and profile stay in your browser.',
      stored: ['Your profile: contact details, work history, education and skills', 'Your CV files and any tailored versions', 'Answers you save, your application tracker and settings', 'How many free AI drafts you’ve used, and your license status'],
      reads: 'On job application sites, HireFill reads the form you are viewing and fills it from your profile. When you ask it to tailor your CV, it reads the job post on the page. This happens on your computer.',
      sends: [['AI provider (optional)', 'Only if you add your own OpenAI, Anthropic or Google key: the text needed for that request (relevant parts of your profile and the job post), sent to the provider you picked, under their privacy policy. Chrome’s built-in AI runs on your computer and sends nothing.'], LICENSE_ROW],
      permissions: [['storage, unlimitedStorage', 'Keeps your profile and CV files in your browser. CV files can be larger than the default limit.'], ['sidePanel', 'Opens the HireFill app beside the application.'], ['scripting, activeTab', '“Fill the current tab” on sites not listed, only when you click.'], ['Job portals', 'Shows the Fill button and fills the form you’re looking at, including forms inside frames (iCIMS, Taleo).'], ['AI providers (optional)', 'Asked for only if you choose to use your own key.']],
      delete: 'Click “Delete all my data” in HireFill’s settings, or uninstall the extension. Both remove everything it stored.',
    },
    terms: [
      ['Your applications are yours', 'HireFill fills forms from the profile you give it. You are responsible for checking every field before you submit, and for the truth of what you send to employers.'],
      ['AI writing', 'AI drafts can be wrong. The truth guard flags facts that aren’t in your profile, but it can miss things. Read and edit every draft before you use it.'],
      ['Your own AI key', 'If you use your own key, the provider’s terms and charges apply between you and them.'],
    ],
  },
  {
    slug: 'visaflag',
    name: 'VisaFlag',
    audience: 'International job seekers',
    line: 'Shows whether a company sponsors work visas, right next to its name on the job post.',
    title: 'Visa Sponsor Checker for LinkedIn, Indeed and Glassdoor',
    h1: 'Know who sponsors <em>before you apply.</em>',
    lede: 'VisaFlag checks the company on every job page against official government sponsor registers for the US, UK, Canada and the Netherlands, and puts the answer next to the company name.',
    priceLine: 'Free for all 4 countries',
    spec: [['Works on', 'LinkedIn · Indeed · Glassdoor · Reed · StepStone · Totaljobs'], ['Data', 'US Dept. of Labor · GOV.UK Home Office · Government of Canada · IND (Netherlands)'], ['Your data', 'Matching runs on your computer']],
    url: 'linkedin.com/jobs/view/software-engineer',
    mock: () => `
      <h4>Software Engineer, Payments</h4><div class="sm">London · Hybrid · 2 days ago</div>
      <div class="co"><b>Monzo</b><span class="pill no">🇺🇸 ✕ Not listed</span><span class="pill ok">🇬🇧 ✓ Sponsor</span><span class="pill no">🇨🇦 ✕</span><span class="pill no">🇳🇱 ✕</span></div>
      <div class="pop"><div class="h">Monzo</div>
        <div class="e"><b>🇬🇧 UK licensed sponsor</b><span class="sm">Registered as “Monzo Bank Limited”</span><div>Skilled Worker · Global Business Mobility · A-rated · London</div></div>
        <div class="e"><b>🇺🇸 Not on the H-1B list</b><span class="sm">No certified filings found for this name</span></div></div>
      <div class="lst"><div><span>Backend Engineer<span class="sm">Google · Mountain View</span></span><span class="pill ok">🇺🇸 ✓ Sponsor</span></div><div><span>Data Analyst<span class="sm">Tiny Labs · Remote</span></span><span class="pill no">🇺🇸 ✕ Not listed</span></div></div>`,
    steps: [
      ['Pick your countries', 'US, UK, Canada, the Netherlands, or all four. The lists download once and update weekly.'],
      ['Browse jobs as usual', 'Badges appear next to the company name on job pages and on search results.'],
      ['Click a badge for details', 'The official registered name, visa routes and rating, and for the US, how many H-1B filings.'],
    ],
    details: [
      ['Official sources only', 'US Department of Labor LCA disclosures, the GOV.UK register of licensed sponsors, Canada’s positive LMIA list and the Dutch IND recognised sponsors.'],
      ['Handles messy names', '“Google” on LinkedIn finds “Google (UK) Limited”; “JPMorganChase” finds “JPMorgan Chase Bank, N.A.”. Near matches say “likely” and show the registered name so you can judge.'],
      ['Search any company', 'Type a name in the panel to check a company before you even find a job there.'],
      ['Honest about limits', 'Being licensed to sponsor doesn’t mean a company will sponsor a particular job. VisaFlag tells you where to look, not what an employer will do.'],
    ],
    free: ['All 4 countries at once', 'Badges on job pages and search results', 'Company search', 'Weekly data updates'],
    pro: ['US: H-1B filings per year and median salary offered', 'Hide companies that don’t sponsor from search results', 'Save a shortlist and export it to CSV'],
    proNote: 'One payment. No subscription.',
    freeSub: 'Every country, every job page.',
    proSub: 'For narrowing a serious search.',
    faq: [
      ['How current is the data?', 'The UK, Dutch and Canadian lists are refreshed weekly from the government sites. US H-1B data is published quarterly by the Department of Labor and updated when it is.'],
      ['Does “Sponsor” mean they’ll sponsor me?', 'No. It means the company is on the official register or has filed for visas recently. Always confirm with the employer. This isn’t legal advice.'],
      ['Does VisaFlag see what I browse?', 'It reads the company name on the page you’re viewing and matches it on your computer. Your browsing is never sent anywhere.'],
    ],
    privacy: {
      summary: 'VisaFlag does not collect, sell or share your data. It has no analytics or tracking.',
      stored: ['Your chosen countries and settings', 'The downloaded sponsor lists', 'Saved companies (Pro) and your license status'],
      reads: 'On supported job sites, VisaFlag reads the company name on the page you are viewing and compares it with the sponsor lists stored in your browser.',
      sends: [['Sponsor lists', 'About once a week VisaFlag downloads the public sponsor lists from our website. The request contains no information about you or what you browse.'], LICENSE_ROW],
      permissions: [['storage', 'Keeps your settings, saved companies and the sponsor lists in your browser.'], ['alarms', 'Checks once a week for updated lists.'], ['Data website', 'Downloads the public sponsor lists. No user data is sent.'], ['Job sites', 'Reads the company name on the job page you open, to show the badge.']],
      delete: 'Uninstall the extension to remove everything it stored.',
    },
    terms: [
      ['Not legal or immigration advice', 'VisaFlag shows what official public registers say. It does not tell you whether you qualify for a visa or whether an employer will sponsor a role. Confirm with the employer and, where needed, an immigration professional.'],
      ['Data accuracy', 'Government lists can be out of date, and company names don’t always match exactly. “Likely” matches show the registered name so you can check. We are not responsible for decisions made from the data.'],
    ],
  },
  {
    slug: 'workfromwhere',
    name: 'WorkFromWhere',
    audience: 'Remote job seekers',
    line: 'Tells you whether a “remote” job accepts applicants from your country.',
    title: 'Remote Job Location Checker',
    h1: '“Remote” — <em>but from where?</em>',
    lede: 'Half the remote jobs you open are really “US only” or “EU work permit required”, hidden at the bottom of the post. WorkFromWhere reads the whole post and tells you in a second, with the sentence highlighted.',
    priceLine: 'Free, no limit',
    spec: [['Works on', 'LinkedIn · Indeed · SEEK · StepStone · Reed · XING · We Work Remotely · Remote OK · Wellfound · Greenhouse · Lever · Ashby and more (17 sites)'], ['Countries', '185+ and regions like EU, EMEA, LATAM, APAC'], ['Your data', 'Nothing leaves your computer']],
    url: 'linkedin.com/jobs/view/senior-product-designer',
    mock: () => `
      <h4>Senior Product Designer</h4><div class="jd"><div class="meta"><span>Northwind</span><span>Remote</span><span>Full-time</span></div></div>
      <div class="wfw-badge"><span class="dot"></span><b>Restricted</b> Only open to the United States <small>· for Nigeria</small></div>
      <div class="jd"><p>We’re a distributed team building tools for modern finance teams. You’ll own the design of our reporting suite end to end.</p>
      <p>This is a fully remote role. <mark>Candidates must be located in the United States and authorized to work there.</mark></p></div>
      <div class="wfw-list"><div><span>Staff Engineer · Linear</span><i class="g">● Open to you</i></div><div><span>Designer · Basecamp</span><i class="u">● Unclear</i></div><div><span>PM · Acme</span><i class="r">● Restricted</i></div></div>`,
    steps: [
      ['Tell it where you are', 'Your country and time zone. It’s guessed from your browser; you confirm.'],
      ['Open any job post', 'A badge appears: green open to you, red restricted, yellow unclear.'],
      ['See why', 'Click the badge and the exact sentence is highlighted in the post.'],
    ],
    details: [
      ['Understands real wording', '“US residents only”, “must reside in the EU”, “Remote (LATAM)”, “open to candidates in EMEA”, “except India”, W-2 only.'],
      ['Time zones too', '“UTC-3 to UTC+3”, “within 2 hours of CET”, “9am–5pm EST”, with Pro showing the hours in your own time.'],
      ['German posts', '“Wohnsitz in Deutschland”, “Remote aus Deutschland”, “ortsunabhängig”.'],
      ['On search results', 'Every listing gets a small badge so you can skip the ones that aren’t open to you.'],
    ],
    free: ['The badge on every job post', 'Badges on search-result lists', 'Any country, 17 job sites', '“Check this page” on any other site'],
    pro: ['Hide the jobs you can’t take', 'Required hours shown in your time zone', 'Save open jobs and export to CSV', 'Your own phrase rules'],
    proNote: 'One payment. No subscription.',
    freeSub: 'The answer, on every job.',
    proSub: 'For a cleaner, faster search.',
    faq: [
      ['How accurate is it?', 'It quotes the sentence it used, so you can always check. When a post doesn’t say, the badge is yellow rather than guessing.'],
      ['Does it read my LinkedIn account?', 'No. It reads the job post on the page you’re viewing, on your computer, and nothing else.'],
    ],
    privacy: {
      summary: 'WorkFromWhere does not collect, sell or share your data. No servers receive your browsing, and there is no analytics or tracking.',
      stored: ['Your country and time zone', 'Your settings, custom phrase rules and saved jobs (Pro)', 'Your license status (Pro)'],
      reads: 'On supported job sites, and on other pages when you click “Check this page”, WorkFromWhere reads the job post you are viewing to show the badge. The text is processed on your computer.',
      sends: [LICENSE_ROW],
      permissions: [['storage', 'Keeps your country, settings and saved jobs in your browser.'], ['activeTab, scripting', 'Reads one tab once, when you click “Check this page” on a site we don’t list.'], ['Job sites', 'Reads the job description and location on the post you open.']],
      delete: 'Uninstall the extension to remove everything it stored.',
    },
    terms: [
      ['A reading aid, not a promise', 'WorkFromWhere interprets what a job post says. Posts can be vague, outdated or wrong, and employers can change their minds. Confirm eligibility with the employer before relying on a badge.'],
    ],
  },
  {
    slug: 'flipcomps',
    name: 'FlipComps',
    audience: 'Resellers',
    line: 'Sold comps and what you actually keep after fees, on eBay, Poshmark, Mercari, Depop and Etsy.',
    title: 'Sold Prices and Profit Calculator for eBay, Poshmark and Mercari',
    h1: 'Price it right. <em>Keep more.</em>',
    lede: 'On any listing, FlipComps shows what you’d keep on every major platform after their current US fees, and one click takes you to sold comps. On sold results it gives you the real median, outliers removed.',
    priceLine: 'Free fee table · 10 sold summaries a day',
    spec: [['Works on', 'eBay · Poshmark · Mercari · Depop · Etsy'], ['Fees', 'Current US rates, editable for your category'], ['Never', 'Lists, shares or messages anything']],
    url: 'poshmark.com/listing/Nike-Air-Max-90',
    mock: () => `
      <div class="fc"><div class="ph"></div><div>
        <h4>Nike Air Max 90 White Black, Men’s 10</h4><div class="sm">Pre-owned · Excellent</div><div class="pr">$85.00</div>
        <div class="fc-panel"><div class="hd">What you keep <span>cost $20 · ship $10</span></div>
          <table><tr><th>Platform</th><th>Fees</th><th>You keep</th></tr>
          <tr class="best"><td>Depop</td><td>$3.26</td><td>$51.74</td></tr>
          <tr><td>Poshmark</td><td>$17.00</td><td>$48.00</td></tr>
          <tr><td>Mercari</td><td>$8.50</td><td>$46.50</td></tr>
          <tr><td>eBay</td><td>$11.96</td><td>$43.04</td></tr></table>
          <div class="ft">Sold: median $61 · typical $55–$68 · 8 of 10 used</div></div>
      </div></div>`,
    steps: [
      ['Open a listing', 'Yours or anyone’s, on any of the five platforms.'],
      ['See what you keep', 'Every platform’s fees on one table, with your cost and shipping taken off.'],
      ['Check what it sold for', 'One click to sold results; FlipComps summarises the prices on the page.'],
    ],
    details: [
      ['Real median, not wishful thinking', 'Lots, parts-only and typo prices are dropped before the median and typical range are worked out.'],
      ['Current fees', 'eBay 13.6% + per-order fee with category rates, Poshmark $2.95 / 20%, Mercari, Depop and Etsy fees built in.'],
      ['Price for your profit', 'Pro works backwards: the price you need on each platform to keep, say, $20.'],
      ['Read-only', 'It never lists, relists, shares or messages, so it can’t put your seller account at risk.'],
    ],
    free: ['Fee and profit table on every listing', 'One-click sold searches on 3 platforms', 'Sold-page summary for 10 searches a day'],
    pro: ['Unlimited sold summaries', 'Price for your target profit', 'Inventory log with cost and CSV export', 'Edit fee rates and promoted-listing fees'],
    proNote: 'Monthly, or once for life.',
    freeSub: 'Enough for a normal sourcing day.',
    proSub: 'For full-time sellers.',
    faq: [
      ['What counts as one of the 10 daily summaries?', 'Each different search you open. Re-opening, scrolling or re-sorting the same search is free.'],
      ['Is it allowed by eBay and Poshmark?', 'FlipComps only reads the page you’re already looking at. It doesn’t automate anything on your account.'],
    ],
    privacy: {
      summary: 'FlipComps reads the marketplace page you are viewing and does its calculations in your browser. No analytics, no tracking.',
      stored: ['Your cost, shipping and fee settings', 'Your inventory log (Pro)', 'How many free sold summaries you’ve used today, and your license status'],
      reads: 'On eBay, Poshmark, Mercari, Depop and Etsy, FlipComps reads the title and price of the listing, or the prices on a sold-results page, that you are viewing. It makes no requests to the marketplaces itself.',
      sends: [LICENSE_ROW],
      permissions: [['storage', 'Keeps your settings and inventory log in your browser.'], ['Marketplace sites', 'Reads the listing or sold-results page you’re viewing.']],
      delete: 'Uninstall the extension to remove everything it stored.',
    },
    terms: [
      ['Estimates, not quotes', 'Fees and sold-price summaries are estimates from published rates and the page you’re viewing. Marketplaces change fees and apply their own rules; always check the final amount on the platform.'],
      ['Your selling decisions', 'Prices you set and items you buy are your decisions. We are not responsible for profit or loss.'],
    ],
  },
  {
    slug: 'reconfinder',
    name: 'ReconFinder',
    audience: 'Bookkeepers',
    line: 'Finds the transaction behind a QuickBooks Online reconciliation difference.',
    title: 'QuickBooks Online Reconciliation Difference Finder',
    h1: 'Off by $89.00? <em>Here’s why.</em>',
    lede: 'On the QuickBooks Online Reconcile screen, ReconFinder reads the difference and the transactions, then points at the likely cause: a missing tick, a duplicate, a wrong sign or two swapped digits.',
    priceLine: 'Free on every reconciliation',
    spec: [['Works on', 'QuickBooks Online Reconcile screen'], ['Never', 'Ticks, edits or saves anything'], ['Your data', 'No financial data leaves your browser']],
    url: 'qbo.intuit.com/app/reconcile',
    mock: () => `
      <div class="rc-top"><div>Statement ending<b>$12,480.17</b></div><div>Cleared<b>$12,391.17</b></div><div class="diff">Difference<b>$89.00</b></div></div>
      <table class="rc-tbl">
        <tr class="on"><td><span class="box"></span></td><td>10/02</td><td>Stripe payout</td><td>$1,240.00</td></tr>
        <tr class="on"><td><span class="box"></span></td><td>10/05</td><td>Office Depot</td><td>−$64.18</td></tr>
        <tr class="sus"><td><span class="box"></span></td><td>10/09</td><td>Vendor refund</td><td>$89.00</td></tr>
        <tr class="on"><td><span class="box"></span></td><td>10/12</td><td>Coffee Shop</td><td>−$12.75</td></tr>
        <tr class="on"><td><span class="box"></span></td><td>10/14</td><td>Gusto payroll</td><td>−$3,410.00</td></tr></table>
      <div class="rc-panel"><div class="hd">ReconFinder <span>$89.00</span></div>
        <div class="s top"><b>Not ticked yet: Vendor refund $89.00</b><span class="sm">Ticking it makes the difference $0.00.</span></div>
        <div class="s"><b>Entered twice?</b><span class="sm">No duplicates found.</span></div></div>`,
    steps: [
      ['Open Reconcile in QuickBooks Online', 'As you normally would, for any client.'],
      ['ReconFinder reads the difference', 'And every transaction on screen, updating as you tick.'],
      ['Check the rows it highlights', 'Click a suggestion to jump to the row. You decide what to change.'],
    ],
    details: [
      ['The usual suspects', 'A transaction not ticked or ticked by mistake, a duplicate entry, a deposit entered as a payment, or digits swapped (differences divisible by 9).'],
      ['Combinations', 'When no single transaction explains it, ReconFinder finds 2–3 that do together.'],
      ['Paste mode', 'Pro works on any list: paste from a bank statement, spreadsheet or other software.'],
      ['Readable tabs', 'Tab titles become “Client name · Reconcile”, so you can tell client files apart.'],
    ],
    free: ['Missing ticks, duplicates, wrong signs, swapped digits', 'On every reconciliation, no limit', 'Combinations on 3 reconciliations a month', 'Readable client tab titles'],
    pro: ['Combinations on every reconciliation', 'Paste mode for any statement or CSV', 'Export candidates to CSV for the client file'],
    proNote: 'Monthly or yearly. Cancel any time.',
    freeSub: 'For the everyday differences.',
    proSub: 'For bookkeepers with many clients.',
    faq: [
      ['Can it change my client’s books?', 'No. ReconFinder only reads the screen and highlights rows. It never ticks, edits or saves.'],
      ['Is client data sent anywhere?', 'No. Amounts, names and transactions are processed in your browser and never transmitted.'],
      ['Does it work with QuickBooks Desktop or Xero?', 'Not on the page itself, but Pro’s paste mode works with a list copied from anywhere.'],
    ],
    privacy: {
      summary: 'ReconFinder reads the QuickBooks Online Reconcile screen you have open and does every calculation in your browser. No financial data, client names or transactions are sent anywhere.',
      stored: ['Your license status', 'How many free combination searches you’ve used this month'],
      reads: 'On qbo.intuit.com, ReconFinder reads the Difference and the transactions shown on the Reconcile screen you have open, highlights rows and sets readable tab titles.',
      sends: [LICENSE_ROW],
      permissions: [['storage', 'Keeps your license status and free-use counter.'], ['qbo.intuit.com', 'Reads the Reconcile screen you have open. Never clicks, edits or saves.']],
      delete: 'Uninstall the extension to remove everything it stored.',
    },
    terms: [
      ['Not accounting advice', 'ReconFinder suggests possible causes of a difference. It doesn’t know your client’s circumstances. You decide what to tick, edit or adjust, and you remain responsible for the books.'],
      ['Not affiliated with Intuit', 'QuickBooks is a trademark of Intuit Inc. ReconFinder is an independent tool.'],
    ],
  },
  {
    slug: 'borderbatch',
    name: 'BorderBatch',
    audience: 'Photographers',
    line: 'No-crop borders and watermarks for Instagram, a whole batch at once, fully offline.',
    title: 'No-Crop Borders and Watermarks for Instagram, in Batches',
    h1: 'Post the whole photo. <em>Every photo.</em>',
    lede: 'Drop in a set, pick a size and a border, and BorderBatch gives you Instagram-ready files in seconds, sharp and without GPS data. Your photos never leave your computer.',
    priceLine: 'Free for 20 photos at a time',
    spec: [['Sizes', '4:5 portrait · 1:1 square · 3:4 tall · 9:16 Story'], ['Runs', 'Offline, in Chrome’s side panel'], ['Access', 'No websites at all']],
    url: 'BorderBatch · side panel',
    mock: () => `
      <div class="bb"><div class="grid">
        <div class="ig"><i class="p1"></i></div><div class="ig t"><i class="p2"></i></div><div class="ig"><i class="p3"></i></div>
        <div class="ig t"><i class="p4"></i></div><div class="ig"><i class="p5"></i></div><div class="ig"><i class="p6"></i></div></div>
        <div class="side"><b>Size</b><div class="seg"><span class="on">4:5</span><span>1:1</span><span>3:4</span><span>9:16</span></div>
          <b>Border</b><div class="sl"></div><b>Colour</b><div class="seg"><span class="on">White</span><span>Cream</span></div>
          <div class="go">Process 6 photos</div><div class="done">GPS removed · 1080 × 1350</div></div></div>`,
    steps: [
      ['Drop your photos in', 'JPEG or PNG exports, up to 20 at a time on the free plan.'],
      ['Pick a size and border', 'Thickness and colour; the preview shows exactly what Instagram will.'],
      ['Download the ZIP', 'Sharp, correctly sized files, with location data removed.'],
    ],
    details: [
      ['Offline by design', 'BorderBatch has no access to any website. It works on a plane.'],
      ['Sharp on Instagram', 'High-quality downscaling to exactly the size Instagram shows, so it doesn’t re-compress as much.'],
      ['Carousel splitter', 'Pro turns a panorama into 2–10 seamless 4:5 slides.'],
      ['Watermarks', 'Pro adds text or a logo, in any corner, at the opacity and size you choose.'],
    ],
    free: ['Every size, border thickness and colour', '20 photos per batch, one ZIP', 'GPS and EXIF removed', 'No watermark from us'],
    pro: ['Unlimited batch size', 'Text or logo watermark', 'Carousel splitter for panoramas', 'Saved looks, quality slider, sharpening'],
    proNote: 'One payment. No subscription.',
    freeSub: 'A full post’s worth, every time.',
    proSub: 'For working photographers.',
    faq: [
      ['Are my photos uploaded?', 'Never. Everything happens in your browser, and the extension has no permission to reach any website except our license check.'],
      ['Does it change the original files?', 'No. You get new copies; your originals are untouched.'],
    ],
    privacy: {
      summary: 'BorderBatch processes your photos entirely in your browser. Photos are never uploaded, and the extension has no access to any website.',
      stored: ['Your last look and saved looks', 'Your license status'],
      reads: 'BorderBatch only reads the photos you choose to drop into it. It has no content scripts and cannot see any web page.',
      sends: [LICENSE_ROW],
      permissions: [['storage', 'Remembers your looks and license status.'], ['sidePanel', 'The app runs in Chrome’s side panel.']],
      delete: 'Uninstall the extension to remove everything it stored.',
    },
    terms: [
      ['Your photos, your rights', 'You must own or have the right to use the photos you process. Keep your originals; BorderBatch makes copies.'],
      ['Not affiliated with Instagram', 'Instagram is a trademark of Meta Platforms, Inc. BorderBatch is an independent tool.'],
    ],
  },
];
