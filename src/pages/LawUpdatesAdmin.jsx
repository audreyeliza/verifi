import { useEffect, useState } from 'react';
import { Loader2, Plus, Eye, EyeOff } from 'lucide-react';
import VerifiNav from '@/components/VerifiNav';
import { LawUpdateCard } from '@/components/LawUpdates';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
import { PROGRAM_LABELS, toList } from '@/lib/verifi';
import { IMPACT_KEYS } from '@/lib/ruleImpact';
import { cn } from '@/lib/utils';

const EMPTY = {
  title: '',
  summary: '',
  what_to_do: '',
  programs: [],
  status: 'Upcoming',
  effective_date: '',
  impact_key: '',
  source_name: '',
  source_url: '',
};

const input =
  'w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-[14px] text-navy outline-none focus:border-brand/50';

export default function LawUpdatesAdmin() {
  const { toast } = useToast();
  const [updates, setUpdates] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setUpdates(toList(await base44.entities.RuleUpdate.list('-effective_date', 100)));
    setLoading(false);
  };

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  const set = (partial) => setForm((prev) => ({ ...prev, ...partial }));
  const toggleProgram = (p) =>
    set({ programs: form.programs.includes(p) ? form.programs.filter((x) => x !== p) : [...form.programs, p] });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Leave blank optional fields out; the API rejects null/empty typed values.
      const data = Object.fromEntries(
        Object.entries({ ...form, published: true }).filter(([, v]) => v !== '' && v !== null)
      );
      await base44.entities.RuleUpdate.create(data);
      setForm(EMPTY);
      await load();
      toast({ title: 'Posted', description: 'Applicants it affects will see it on their Home screen.' });
    } catch (err) {
      toast({ title: 'Could not post', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (u) => {
    await base44.entities.RuleUpdate.update(u.id, { published: !u.published });
    await load();
  };

  return (
    <div className="min-h-screen bg-canvas">
      <VerifiNav />
      <main className="mx-auto grid max-w-6xl gap-6 px-4 pb-16 pt-6 sm:px-8 lg:grid-cols-[1fr_1.1fr]">
        <section>
          <h1 className="font-heading text-[26px] font-semibold text-navy">Law updates</h1>
          <p className="mt-1 text-[14px] text-navy-muted">
            Post new or upcoming rule changes. Each applicant sees the ones that touch their programs,
            with a line about how it affects them.
          </p>

          <form onSubmit={submit} className="mt-5 space-y-4 rounded-3xl border border-border bg-white p-5">
            <label className="block">
              <span className="text-[12.5px] font-medium text-navy">Title</span>
              <input required className={`${input} mt-1.5`} value={form.title} onChange={(e) => set({ title: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-[12.5px] font-medium text-navy">What's changing (plain language)</span>
              <textarea required rows={3} className={`${input} mt-1.5`} value={form.summary} onChange={(e) => set({ summary: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-[12.5px] font-medium text-navy">What people should do</span>
              <textarea rows={2} className={`${input} mt-1.5`} value={form.what_to_do} onChange={(e) => set({ what_to_do: e.target.value })} />
            </label>

            <div>
              <span className="text-[12.5px] font-medium text-navy">Programs affected</span>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {Object.keys(PROGRAM_LABELS).map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => toggleProgram(p)}
                    className={cn(
                      'rounded-full px-3.5 py-1.5 text-[13px] font-semibold ring-1 transition-colors',
                      form.programs.includes(p) ? 'bg-brand text-white ring-brand' : 'bg-white text-navy ring-border'
                    )}
                  >
                    {PROGRAM_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-[12.5px] font-medium text-navy">Status</span>
                <select className={`${input} mt-1.5`} value={form.status} onChange={(e) => set({ status: e.target.value })}>
                  <option>Upcoming</option>
                  <option>In effect</option>
                  <option>Passed</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[12.5px] font-medium text-navy">Effective date</span>
                <input type="date" className={`${input} mt-1.5`} value={form.effective_date} onChange={(e) => set({ effective_date: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-[12.5px] font-medium text-navy">Source name</span>
                <input className={`${input} mt-1.5`} value={form.source_name} onChange={(e) => set({ source_name: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-[12.5px] font-medium text-navy">Source link</span>
                <input type="url" className={`${input} mt-1.5`} value={form.source_url} onChange={(e) => set({ source_url: e.target.value })} />
              </label>
            </div>

            <label className="block">
              <span className="text-[12.5px] font-medium text-navy">Personalized impact (optional)</span>
              <select className={`${input} mt-1.5`} value={form.impact_key} onChange={(e) => set({ impact_key: e.target.value })}>
                <option value="">General — shown to everyone in these programs</option>
                {IMPACT_KEYS.map((k) => (
                  <option key={k} value={k}>{k.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={saving || form.programs.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3 text-[14.5px] font-semibold text-white hover:bg-brand-deep disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Post update
            </button>
          </form>
        </section>

        <section>
          <h2 className="font-heading text-[18px] font-semibold text-navy lg:mt-[4.25rem]">Posted ({updates.length})</h2>
          {loading ? (
            <p className="py-10 text-center text-[14px] text-muted-foreground">Loading…</p>
          ) : (
            <div className="mt-3 space-y-3">
              {updates.map((u) => (
                <div key={u.id} className={cn(!u.published && 'opacity-60')}>
                  <LawUpdateCard update={u} />
                  <button
                    type="button"
                    onClick={() => togglePublished(u)}
                    className="mt-1.5 inline-flex items-center gap-1.5 px-2 text-[12.5px] font-semibold text-navy-muted hover:text-navy"
                  >
                    {u.published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {u.published ? 'Hide from applicants' : 'Show to applicants'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
