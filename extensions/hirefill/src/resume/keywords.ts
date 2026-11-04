/** Job-post keyword match (shared engine with the KeywordFit idea): score + missing keywords. */
const SKILLS = `python,java,javascript,typescript,go,golang,rust,c++,c#,ruby,php,swift,kotlin,scala,r,sql,nosql,postgresql,postgres,mysql,mongodb,redis,elasticsearch,kafka,spark,hadoop,airflow,dbt,snowflake,bigquery,redshift,databricks,tableau,power bi,looker,excel,react,react native,vue,angular,svelte,next.js,node.js,express,django,flask,fastapi,spring,rails,.net,graphql,rest,grpc,html,css,sass,tailwind,aws,azure,gcp,google cloud,docker,kubernetes,terraform,ansible,jenkins,github actions,ci/cd,linux,bash,git,microservices,serverless,machine learning,deep learning,nlp,computer vision,pytorch,tensorflow,scikit-learn,pandas,numpy,llm,generative ai,data analysis,data science,statistics,a/b testing,etl,data modeling,figma,sketch,ux,ui,user research,product management,agile,scrum,kanban,jira,confluence,salesforce,hubspot,sap,netsuite,quickbooks,seo,sem,google analytics,content marketing,copywriting,social media,email marketing,crm,b2b,saas,stakeholder management,project management,pmp,budgeting,forecasting,financial modeling,accounting,gaap,ifrs,audit,compliance,risk management,customer success,account management,sales,negotiation,leadership,mentoring,communication,cross-functional,security,penetration testing,soc 2,iso 27001,networking,devops,sre,observability,datadog,prometheus,grafana,qa,test automation,selenium,cypress,playwright,ios,android,unity,blockchain,solidity,hipaa,ehr,nursing,teaching,recruiting,payroll,hris,workday,supply chain,logistics,procurement,six sigma,lean,autocad,solidworks,matlab`.split(',');

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const termRe = (t: string) => new RegExp(`(?<![a-z0-9])${esc(t)}(?![a-z0-9])`, 'gi');

export interface KeywordResult { score: number; found: string[]; missing: { term: string; count: number }[] }

export function keywordMatch(jobText: string, cvText: string, extraTerms: string[] = []): KeywordResult {
  const jt = jobText.toLowerCase();
  const ct = cvText.toLowerCase();
  const terms = [...new Set([...SKILLS, ...extraTerms.map((t) => t.toLowerCase())])];
  const inJob = terms.map((t) => ({ term: t, count: (jt.match(termRe(t)) ?? []).length })).filter((x) => x.count > 0);
  // drop terms contained in a longer found term ("react" inside "react native" counted once)
  const job = inJob.filter((x) => !inJob.some((y) => y.term !== x.term && y.term.includes(x.term) && y.count >= x.count));
  if (!job.length) return { score: 0, found: [], missing: [] };
  const found = job.filter((x) => termRe(x.term).test(ct));
  const missing = job.filter((x) => !found.includes(x)).sort((a, b) => b.count - a.count);
  const w = (x: { count: number }) => 1 + Math.min(x.count, 4) * 0.5;
  const score = Math.round((found.reduce((s, x) => s + w(x), 0) / job.reduce((s, x) => s + w(x), 0)) * 100);
  return { score, found: found.map((x) => x.term), missing };
}
