// Seed real law/rule changes into RuleUpdate. Safe to re-run (skips titles that exist).
//   Hosted:  cat scripts/seed-rule-updates.js | base44 exec --privileged --data-env prod
//   Local:   cat scripts/seed-rule-updates.js | base44 exec --local --privileged
// Re-check each source before a demo; dates come from state guidance as of Nov 2026.

const UPDATES = [
  {
    title: 'Medicaid work requirement starts in Ohio',
    status: 'Upcoming',
    effective_date: '2027-01-01',
    programs: ['Medicaid'],
    impact_key: 'medicaid_work_requirement',
    summary:
      'Starting January 1, 2027, most adults ages 19–64 on Ohio Medicaid’s expansion coverage must show 80 hours a month of work, school, job training or volunteering, or earn at least $580 a month, to keep coverage. Pregnant people, parents or caretakers of a child 13 or younger, people with disabilities and some others are exempt. Ohio will first try to confirm this with data it already has, starting with renewals due in April 2027.',
    what_to_do:
      'Keep your pay stubs or hours up to date in Verifi. If Ohio sends a letter asking for proof, answer by the deadline on the letter.',
    source_name: 'Ohio Department of Medicaid',
    source_url:
      'https://dam.assets.ohio.gov/image/upload/medicaid.ohio.gov/Families%2C%20Individuals/Programs/Community/Group_VIII_Partner_Packet_08132026.pdf',
  },
  {
    title: 'Medicaid renewals every 6 months',
    status: 'Upcoming',
    effective_date: '2027-01-01',
    programs: ['Medicaid'],
    impact_key: 'medicaid_six_month_renewal',
    summary:
      'Adults on Medicaid expansion coverage will have to renew twice a year instead of once, starting with renewals in 2027. Children’s coverage is not affected. Missing a renewal is the most common way people lose coverage they still qualify for.',
    what_to_do:
      'Watch for renewal letters every 6 months. Verifi will remind you and re-check your info so there is less to send.',
    source_name: 'NACo: CMS guidance on six-month renewals',
    source_url: 'https://www.naco.org/news/cms-issues-guidance-six-month-medicaid-renewals',
  },
  {
    title: 'New SNAP work rules in Ohio',
    status: 'In effect',
    effective_date: '2026-02-01',
    programs: ['SNAP'],
    impact_key: 'snap_work_requirement',
    summary:
      'Ohio now requires SNAP adults ages 18–64 to work, train or volunteer 80 hours a month, or SNAP is limited to 3 months every 3 years. Parents are exempt only if a child under 14 lives with them. Before, any child under 18 counted. Exemptions for veterans, people experiencing homelessness and former foster youth were removed.',
    what_to_do:
      'If this applies to you, log your work or training hours with your county Job & Family Services office. Ask them about exemptions if you can’t work.',
    source_name: 'Signal Cleveland',
    source_url: 'https://signalcleveland.org/snap-changes-work-requirements-one-big-beautiful-bill-february-1-2026/',
  },
];

const list = (r) => (Array.isArray(r) ? r : r?.items ?? []);
const existing = new Set(list(await base44.entities.RuleUpdate.list('-created_date', 200)).map((u) => u.title));
const toCreate = UPDATES.filter((u) => !existing.has(u.title)).map((u) => ({ ...u, published: true }));
if (toCreate.length) await base44.entities.RuleUpdate.bulkCreate(toCreate);
console.log(`Created ${toCreate.length}, skipped ${UPDATES.length - toCreate.length} existing.`);
