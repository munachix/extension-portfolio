/** What a site adapter reads from the job page the user is looking at. */
export interface JobPage {
  /** Element holding the job description (used for text + highlighting). */
  descriptionEl: Element | null;
  /** Location/region text from the page header or sidebar, e.g. "United States (Remote)". */
  locationText: string;
  /** Structured applicant-location data from schema.org JSON-LD, if present. */
  structuredLocations: string[];
  titleText: string;
  companyText: string;
  /** The element showing the company name (VisaFlag puts its badge right after it). */
  companyEl: Element | null;
  /** Where to insert our badge (before this element). */
  anchorEl: Element | null;
  url: string;
}

/** A job card in a search-results list. */
export interface ListItem {
  el: Element;
  /** Location text visible on the card. */
  locationText: string;
  /** Company name visible on the card ('' if none). */
  companyText: string;
  companyEl: Element | null;
  /** Stable id for de-duping (job id or URL). */
  key: string;
}

export interface SiteAdapter {
  id: string;
  label: string;
  /** Host patterns for the manifest (content_scripts.matches / host_permissions). */
  matches: string[];
  /** Run inside iframes too (embedded application forms). */
  allFrames?: boolean;
  test(url: URL): boolean;
  readJob(doc: Document): JobPage | null;
  listItems?(doc: Document): ListItem[];
}
