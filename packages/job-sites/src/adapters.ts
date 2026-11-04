/**
 * Site adapters. ALL page selectors live here, one block per site, so a site
 * redesign is a one-place fix. Selectors are tried in order; when none match,
 * adapters fall back to JSON-LD + a generic description finder.
 *
 * Verified against live pages (Nov 2026): Greenhouse, Lever, We Work Remotely,
 * Remote OK, SEEK. Others use known selectors + fallbacks (LinkedIn needs a
 * login; StepStone blocks automated browsers) — test those by hand.
 */
import type { JobPage, ListItem, SiteAdapter } from './types';
import { clean, first, guessDescription, largest, structuredApplicantLocations, textOf, textsOf } from './dom';

interface Spec {
  id: string;
  label: string;
  matches: string[];
  host: RegExp;
  /** Optional path test, e.g. only job pages. */
  path?: RegExp;
  allFrames?: boolean;
  title: string[];
  company: string[];
  location: string[];
  /** Join all location matches (e.g. several region tags) instead of taking the first. */
  locationAll?: boolean;
  description: string[];
  /** Badge goes before this; defaults to the description element. */
  anchor?: string[];
  list?: { item: string[]; location: string[]; company?: string[]; key: (el: Element) => string };
  /** Escape hatch for sites that need code, not just selectors. */
  pickDescription?: (doc: Document) => Element | null;
}

function make(spec: Spec): SiteAdapter {
  return {
    id: spec.id,
    label: spec.label,
    matches: spec.matches,
    allFrames: spec.allFrames,
    test: (url) => spec.host.test(url.hostname) && (!spec.path || spec.path.test(url.pathname + url.search)),
    readJob(doc): JobPage | null {
      const descriptionEl = spec.pickDescription?.(doc) ?? first(doc, spec.description) ?? guessDescription(doc);
      const structuredLocations = structuredApplicantLocations(doc);
      if (!descriptionEl && structuredLocations.length === 0) return null;
      const locationText = spec.locationAll ? textsOf(doc, spec.location).join(' · ') : textOf(doc, spec.location);
      const companyEl = first(doc, spec.company);
      return {
        descriptionEl,
        locationText,
        structuredLocations,
        titleText: textOf(doc, spec.title) || clean(doc.title),
        companyText: clean(companyEl?.textContent),
        companyEl,
        anchorEl: (spec.anchor && first(doc, spec.anchor)) || descriptionEl,
        url: doc.location?.href ?? '',
      };
    },
    listItems: spec.list
      ? (doc): ListItem[] => {
          // The first selector that matches anything wins, so nested matches
          // (a card inside a list item) never get two badges.
          const items: ListItem[] = [];
          for (const sel of spec.list!.item) {
            const els = doc.querySelectorAll(sel);
            if (!els.length) continue;
            els.forEach((el) => {
              const locationText = textsOf(el, spec.list!.location).join(' · ');
              const companyEl = spec.list!.company ? first(el, spec.list!.company) : null;
              const companyText = clean(companyEl?.textContent);
              if (locationText || companyText) items.push({ el, locationText, companyText, companyEl, key: spec.list!.key(el) });
            });
            break;
          }
          return items;
        }
      : undefined,
  };
}

const attr = (name: string) => (el: Element) => el.getAttribute(name) ?? el.querySelector(`[${name}]`)?.getAttribute(name) ?? '';
const href = (el: Element) => (el.querySelector('a[href]') as HTMLAnchorElement | null)?.href ?? el.id ?? '';

export const linkedin = make({
  id: 'linkedin', label: 'LinkedIn Jobs',
  matches: ['https://*.linkedin.com/*'], host: /(^|\.)linkedin\.com$/, path: /^\/jobs/,
  title: ['.job-details-jobs-unified-top-card__job-title', '.jobs-unified-top-card__job-title', '.top-card-layout__title', 'h1'],
  company: ['.job-details-jobs-unified-top-card__company-name', '.jobs-unified-top-card__company-name', '.topcard__org-name-link'],
  location: [
    '.job-details-jobs-unified-top-card__primary-description-container .tvm__text:first-child',
    '.job-details-jobs-unified-top-card__tertiary-description-container .tvm__text:first-child',
    '.job-details-jobs-unified-top-card__bullet', '.jobs-unified-top-card__bullet', '.topcard__flavor--bullet',
  ],
  description: ['.jobs-description__content .jobs-box__html-content', '#job-details', '.jobs-description-content__text', '.jobs-description__container', '.show-more-less-html__markup', '.description__text'],
  list: {
    item: ['li[data-occludable-job-id]', '.job-card-container', '.job-search-card'],
    location: ['.job-card-container__metadata-wrapper li', '.job-card-container__metadata-item', '.artdeco-entity-lockup__caption li', '.job-search-card__location'],
    company: ['.artdeco-entity-lockup__subtitle', '.job-card-container__primary-description', '.base-search-card__subtitle'],
    key: (el) => attr('data-occludable-job-id')(el) || attr('data-job-id')(el) || href(el),
  },
});

export const indeed = make({
  id: 'indeed', label: 'Indeed',
  // Every Indeed country site is a subdomain of indeed.com (uk., de., au., nz., ca., ng. …)
  matches: ['https://*.indeed.com/*'], host: /(^|\.)indeed\.com$/,
  title: ['[data-testid="jobsearch-JobInfoHeader-title"]', 'h1.jobsearch-JobInfoHeader-title', 'h1'],
  company: ['[data-testid="inlineHeader-companyName"]', '[data-company-name="true"]'],
  location: ['[data-testid="inlineHeader-companyLocation"]', '[data-testid="job-location"]', '[data-testid="jobsearch-JobInfoHeader-companyLocation"]'],
  description: ['#jobDescriptionText'],
  list: {
    item: ['.job_seen_beacon', '[data-testid="slider_item"]'],
    location: ['[data-testid="text-location"]', '.companyLocation'],
    company: ['[data-testid="company-name"]', '.companyName'],
    key: (el) => attr('data-jk')(el) || href(el),
  },
});

export const seek = make({
  id: 'seek', label: 'SEEK (Australia & New Zealand)',
  matches: ['https://*.seek.com.au/*', 'https://seek.com.au/*', 'https://*.seek.co.nz/*', 'https://nz.seek.com/*'],
  host: /(^|\.)seek\.com\.au$|(^|\.)seek\.co\.nz$|^nz\.seek\.com$/,
  title: ['[data-automation="job-detail-title"]'],
  company: ['[data-automation="advertiser-name"]'],
  location: ['[data-automation="job-detail-location"]'],
  description: ['[data-automation="jobAdDetails"]'],
  list: {
    item: ['article[data-job-id]'],
    location: ['[data-automation="jobLocation"]'],
    company: ['[data-automation="jobCompany"]'],
    key: attr('data-job-id'),
  },
});

export const stepstone = make({
  id: 'stepstone', label: 'StepStone / Totaljobs',
  // StepStone Group sites share one front end (Germany, Austria, Belgium, NL, UK Totaljobs).
  matches: ['https://www.stepstone.de/*', 'https://www.stepstone.at/*', 'https://www.stepstone.be/*', 'https://www.stepstone.nl/*', 'https://www.totaljobs.com/*'],
  host: /(^|\.)stepstone\.(de|at|be|nl)$|(^|\.)totaljobs\.com$/,
  title: ['[data-at="header-job-title"]', 'h1'],
  company: ['[data-at="metadata-company-name"]', '[data-at="header-company-name"]'],
  location: ['[data-at="metadata-location"]', '[data-at="header-job-location"]'],
  description: ['[data-at="job-ad-content"]', '[data-at="section-text-description-content"]', '.job-ad-display'],
  list: {
    item: ['article[data-at="job-item"]'],
    location: ['[data-at="job-item-location"]'],
    company: ['[data-at="job-item-company-name"]'],
    key: (el) => el.id || href(el),
  },
});

export const glassdoor = make({
  id: 'glassdoor', label: 'Glassdoor',
  matches: ['https://www.glassdoor.com/*', 'https://www.glassdoor.co.uk/*', 'https://www.glassdoor.ca/*', 'https://www.glassdoor.com.au/*', 'https://www.glassdoor.de/*', 'https://www.glassdoor.nl/*', 'https://www.glassdoor.co.in/*'],
  host: /(^|\.)glassdoor\.(com|co\.uk|ca|com\.au|de|nl|co\.in)$/,
  title: ['[data-test="job-title"]', 'h1[id^="jd-job-title"]', 'h1'],
  company: ['[data-test="employer-name"]', '[class*="EmployerProfile_employerName"]', '[class*="employerName"]'],
  location: ['[data-test="location"]', '[class*="JobDetails_location"]'],
  description: ['[class*="JobDetails_jobDescription"]', '#JobDescriptionContainer', '[class*="jobDescriptionContent"]'],
  list: {
    item: ['li[data-test="jobListing"]', 'li[class*="JobsList_jobListItem"]'],
    location: ['[data-test="emp-location"]', '[class*="JobCard_location"]'],
    company: ['[class*="EmployerProfile_compactEmployerName"]', '[data-test="employer-short-name"]'],
    key: (el) => el.getAttribute('data-jobid') ?? el.getAttribute('data-id') ?? href(el),
  },
});

export const reed = make({
  id: 'reed', label: 'Reed (UK)',
  matches: ['https://www.reed.co.uk/*'], host: /(^|\.)reed\.co\.uk$/,
  title: ['h1'],
  company: ['[itemprop="hiringOrganization"] [itemprop="name"]', '[data-qa="job-posted-by"] a'],
  location: ['[data-qa="job-location"]', '[itemprop="addressLocality"]', '.location'],
  description: ['[data-qa="job-description"]', '[itemprop="description"]', '.description'],
  list: {
    item: ['article[data-qa="job-card"]', 'article.job-result-card'],
    location: ['[data-qa="job-card-location"]', '.job-metadata__item--location'],
    company: ['[data-qa="job-card-company"]', '[data-qa="job-posted-by"] a', '.gtmJobListingPostedBy'],
    key: (el) => el.getAttribute('data-id') ?? el.id ?? href(el),
  },
});

export const weworkremotely = make({
  id: 'wwr', label: 'We Work Remotely',
  matches: ['https://weworkremotely.com/*'], host: /(^|\.)weworkremotely\.com$/,
  title: ['.lis-container__header__hero__company-info__title', 'h1'],
  company: ['.lis-container__job__sidebar__companyDetails__info__title'],
  // "Region" box on job pages; NOT the "HQ" line, which is the company's office.
  location: ['.box--region'], locationAll: true,
  description: ['.lis-container__job__content__description', '.listing-container'],
  list: {
    item: ['li.new-listing-container'],
    location: ['.new-listing__categories__category'],
    company: ['.new-listing__company-name'],
    key: href,
  },
});

export const remoteok = make({
  id: 'remoteok', label: 'Remote OK',
  matches: ['https://remoteok.com/*'], host: /(^|\.)remoteok\.com$/,
  title: ['tr.job.active h2', 'tr.job h2', 'h1'],
  company: ['tr.job.active h3', 'tr.job h3'],
  location: ['tr.job.active .location', 'tr.job:first-of-type .location'], locationAll: true,
  description: ['tr.expand.active .description', 'tr.expand .description', '.description'],
  list: {
    item: ['tr.job'],
    location: ['.location'],
    company: ['h3'],
    key: attr('data-id'),
  },
});

export const greenhouse = make({
  id: 'greenhouse', label: 'Greenhouse',
  matches: ['https://boards.greenhouse.io/*', 'https://job-boards.greenhouse.io/*', 'https://job-boards.eu.greenhouse.io/*', 'https://boards.eu.greenhouse.io/*'],
  host: /(^|\.)greenhouse\.io$/, allFrames: true,
  title: ['.job__title h1', '.app-title', 'h1'],
  company: ['.company-name'],
  location: ['.job__location', '.location'],
  description: ['.job__description', '#content'],
  anchor: ['.job__description', '#content'],
});

export const lever = make({
  id: 'lever', label: 'Lever',
  matches: ['https://jobs.lever.co/*', 'https://jobs.eu.lever.co/*'], host: /^jobs\.(eu\.)?lever\.co$/,
  title: ['.posting-headline h2'],
  company: ['.main-header-logo img[alt]'],
  location: ['.posting-categories .location', '.sort-by-location'],
  description: ['.posting-page .content'],
  // The text lives in several .section-wrapper blocks; the biggest one is the description.
  pickDescription: (doc) => largest(doc, '.posting-page .section-wrapper.page-full-width'),
  anchor: ['.posting-page .section-wrapper.page-full-width:not(.main-header)'],
});

/** ATS and boards popular in Germany, the EU, UK, Australia and NZ. Selectors + JSON-LD + generic fallback. */
export const wellfound = make({
  id: 'wellfound', label: 'Wellfound', matches: ['https://wellfound.com/*'], host: /(^|\.)wellfound\.com$/, path: /^\/(jobs|company)/,
  title: ['h1'], company: ['a[href^="/company/"] h2', 'a[href^="/company/"]'], location: ['[class*="location" i]'],
  description: ['[class*="description" i]'],
});
export const ashby = make({
  id: 'ashby', label: 'Ashby', matches: ['https://jobs.ashbyhq.com/*'], host: /^jobs\.ashbyhq\.com$/,
  title: ['h1'], company: [], location: ['[class*="_location" i]'],
  description: ['[class*="_descriptionText" i]', '[class*="description" i]'],
});
export const workable = make({
  id: 'workable', label: 'Workable', matches: ['https://apply.workable.com/*'], host: /^apply\.workable\.com$/,
  title: ['[data-ui="job-title"]', 'h1'], company: [], location: ['[data-ui="job-location"]'],
  description: ['[data-ui="job-description"]', '[data-ui="job-breakdown"]'],
});
export const smartrecruiters = make({
  id: 'smartrecruiters', label: 'SmartRecruiters', matches: ['https://jobs.smartrecruiters.com/*'], host: /^jobs\.smartrecruiters\.com$/,
  title: ['h1.job-title', 'h1'], company: [], location: ['[itemprop="jobLocation"]', 'spoc-job-location', '.job-detail'],
  description: ['[itemprop="description"]', '.job-sections'],
});
export const personio = make({
  id: 'personio', label: 'Personio', matches: ['https://*.jobs.personio.de/*', 'https://*.jobs.personio.com/*'], host: /\.jobs\.personio\.(de|com)$/,
  title: ['h1'], company: [], location: ['[class*="location" i]'],
  description: ['[class*="job-description" i]', '.job-details', '#job-description'],
});
export const recruitee = make({
  id: 'recruitee', label: 'Recruitee', matches: ['https://*.recruitee.com/*'], host: /\.recruitee\.com$/,
  title: ['h1'], company: [], location: ['[class*="location" i]'],
  description: ['[class*="description" i]'],
});
export const join = make({
  id: 'join', label: 'JOIN', matches: ['https://join.com/*'], host: /^join\.com$/, path: /^\/companies\//,
  title: ['h1'], company: [], location: ['[data-testid*="location" i]'],
  description: ['[data-testid*="description" i]'],
});
export const xing = make({
  id: 'xing', label: 'XING Jobs', matches: ['https://www.xing.com/*'], host: /(^|\.)xing\.com$/, path: /^\/jobs\//,
  title: ['h1'], company: [], location: ['[data-testid*="location" i]', '[class*="location" i]'],
  description: ['[data-testid*="description" i]', '[class*="description" i]'],
});

/** Used for "Check this page" on any other site (activeTab). */
export const generic: SiteAdapter = make({
  id: 'generic', label: 'This page', matches: [], host: /./,
  title: ['h1'], company: [], location: [],
  description: ['[itemprop="description"]', '[class*="job-description" i]', '[class*="jobDescription" i]', '[id*="job-description" i]', 'article'],
});

export const ADAPTERS: SiteAdapter[] = [
  linkedin, indeed, glassdoor, seek, stepstone, reed, weworkremotely, remoteok, greenhouse, lever,
  wellfound, ashby, workable, smartrecruiters, personio, recruitee, join, xing,
];

export function adapterFor(url: URL): SiteAdapter | null {
  return ADAPTERS.find((a) => a.test(url)) ?? null;
}
