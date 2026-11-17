import { useEffect, useRef, useState } from 'react';
import { Wallet, Upload, Loader2, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { money, toList } from '@/lib/verifi';
import {
  MAX_STUB_BYTES,
  PAY_FREQUENCIES,
  STUB_FILE_TYPES,
  combineStubs,
  fileToBase64,
  formatPayDate,
  frequencyLabel,
  monthlyEquivalent,
  omitEmpty,
} from '@/lib/income';

// Income step of the profile form (/connect).
//
// CONTRACT — keep these props stable:
//   value:    { monthly_income, income_source, employer, job_title }
//   onChange: (partial) => void  — merge fields into the form
//   applicant: the saved Applicant record (has .id)
const input =
  'w-full rounded-3xl border border-border/70 bg-white px-4 py-3 text-[14px] text-navy outline-none transition-colors focus:border-brand/50';

function errorText(err) {
  return err?.response?.data?.error || err?.message || 'Something went wrong. Try again.';
}

function applyCombined(docs, onChange) {
  const { monthly_income, employer } = combineStubs(docs);
  const partial = { monthly_income, income_source: 'Uploaded document' };
  if (employer) partial.employer = employer;
  onChange(partial);
}

export default function IncomeSection({ value, onChange, applicant }) {
  const [mode, setMode] = useState(value.income_source === 'Self-reported' ? 'manual' : 'upload');
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const [saved, setSaved] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [confirmingId, setConfirmingId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!applicant?.id) return undefined;
    let alive = true;
    base44.entities.IncomeDocument.filter({ applicant: applicant.id }, '-created_date', 20)
      .then((rows) => {
        if (!alive) return;
        const docs = toList(rows);
        setSaved(docs);
        if (docs.length && modeRef.current === 'upload') applyCombined(docs, onChange);
      })
      .catch(() => {
        if (alive) setError('Could not load your pay stubs.');
      });
    return () => {
      alive = false;
    };
  }, [applicant?.id]);

  const uploadOne = async (file) => {
    if (!STUB_FILE_TYPES.includes(file.type)) {
      setError('Use a JPG, PNG, or PDF.');
      return;
    }
    if (file.size > MAX_STUB_BYTES) {
      setError('That file is too big. Use a photo or PDF under 8 MB.');
      return;
    }
    const dataBase64 = await fileToBase64(file);
    const response = await base44.functions.invoke('extractPayStub', {
      filename: file.name,
      content_type: file.type,
      data_base64: dataBase64,
    });
    const data = response.data || {};
    if (!data.file_uri) throw new Error('We could not store that file.');
    setDrafts((prev) => [
      ...prev,
      {
        localId: `${Date.now()}-${file.name}`,
        filename: file.name,
        file_uri: data.file_uri,
        employer: data.employer || '',
        gross_pay: data.gross_pay ?? '',
        pay_frequency: data.pay_frequency || '',
        pay_date: data.pay_date || '',
        warning: data.warning || '',
      },
    ]);
  };

  const onFiles = async (event) => {
    const files = [...(event.target.files || [])];
    event.target.value = '';
    if (!files.length) return;
    setError('');
    setUploading(true);
    try {
      for (const file of files) {
        // Sequential so a phone on a slow connection is not sending several stubs at once.
        // eslint-disable-next-line no-await-in-loop
        await uploadOne(file);
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setUploading(false);
    }
  };

  const updateDraft = (localId, partial) => {
    setDrafts((prev) => prev.map((draft) => (draft.localId === localId ? { ...draft, ...partial } : draft)));
  };

  const confirmDraft = async (draft) => {
    const monthly = monthlyEquivalent(draft.gross_pay, draft.pay_frequency);
    if (monthly == null) {
      setError('Enter the gross pay and how often you are paid, then confirm.');
      return;
    }
    if (!applicant?.id) {
      setError('Your profile is still loading. Wait a moment and try again.');
      return;
    }
    setError('');
    setConfirmingId(draft.localId);
    try {
      const created = await base44.entities.IncomeDocument.create(omitEmpty({
        applicant: applicant.id,
        file_uri: draft.file_uri,
        employer: draft.employer.trim(),
        gross_pay: Number(draft.gross_pay),
        pay_frequency: draft.pay_frequency,
        pay_date: draft.pay_date,
        monthly_equivalent: monthly,
      }));
      const next = [...saved, created];
      setSaved(next);
      setDrafts((prev) => prev.filter((item) => item.localId !== draft.localId));
      setMode('upload');
      applyCombined(next, onChange);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setConfirmingId('');
    }
  };

  const removeSaved = async (doc) => {
    setError('');
    try {
      await base44.entities.IncomeDocument.delete(doc.id);
      const next = saved.filter((item) => item.id !== doc.id);
      setSaved(next);
      if (next.length) applyCombined(next, onChange);
      else onChange({ income_source: 'Self-reported' });
    } catch (err) {
      setError(errorText(err));
    }
  };

  const useManual = () => {
    modeRef.current = 'manual';
    setMode('manual');
    onChange({ income_source: 'Self-reported' });
  };

  const useUpload = () => {
    modeRef.current = 'upload';
    setMode('upload');
    if (saved.length) applyCombined(saved, onChange);
  };

  return (
    <section className="rounded-3xl border border-border/70 bg-white p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Wallet className="h-5 w-5" strokeWidth={2} />
        </span>
        <div>
          <h2 className="font-heading text-[15.5px] font-semibold text-navy">Income</h2>
          <p className="text-[13px] text-muted-foreground">
            Total monthly pay before taxes, for everyone in your household.
          </p>
        </div>
      </div>

      {mode === 'upload' ? (
        <div className="mt-5 space-y-3">
          <p className="text-[13px] leading-relaxed text-navy-muted">
            Upload a pay stub for each job. A photo or PDF is fine. If you upload two paychecks from the same job, we use the newest one so we do not count that pay twice.
          </p>

          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-3xl border border-dashed border-brand/30 bg-canvas px-4 py-5 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-navy">
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            </span>
            <span className="text-[14px] font-semibold text-navy">
              {uploading ? 'Reading your pay stub…' : 'Upload a pay stub'}
            </span>
            <span className="text-[12px] text-muted-foreground">JPG, PNG, or PDF. You can take a photo.</span>
            <input
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              multiple
              className="sr-only"
              disabled={uploading}
              onChange={onFiles}
            />
          </label>

          {drafts.map((draft) => {
            const preview = monthlyEquivalent(draft.gross_pay, draft.pay_frequency);
            return (
              <div key={draft.localId} className="rounded-3xl border border-border/70 bg-canvas p-4">
                <p className="text-[13px] font-semibold text-navy">Check these numbers</p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {draft.filename}. Fix anything that looks wrong, then confirm.
                </p>
                {draft.warning && (
                  <p className="mt-2 text-[12.5px] text-amber-800">{draft.warning}</p>
                )}
                <div className="mt-3 grid gap-3">
                  <label className="block">
                    <span className="text-[12.5px] font-medium text-navy">Employer</span>
                    <input
                      className={`${input} mt-1.5`}
                      value={draft.employer}
                      onChange={(e) => updateDraft(draft.localId, { employer: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[12.5px] font-medium text-navy">Gross pay this paycheck (before taxes)</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      className={`${input} mt-1.5`}
                      value={draft.gross_pay}
                      onChange={(e) => updateDraft(draft.localId, { gross_pay: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[12.5px] font-medium text-navy">How often are you paid?</span>
                    <select
                      className={`${input} mt-1.5`}
                      value={draft.pay_frequency}
                      onChange={(e) => updateDraft(draft.localId, { pay_frequency: e.target.value })}
                    >
                      <option value="">Choose one</option>
                      {PAY_FREQUENCIES.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[12.5px] font-medium text-navy">Pay date</span>
                    <input
                      type="date"
                      className={`${input} mt-1.5`}
                      value={draft.pay_date}
                      onChange={(e) => updateDraft(draft.localId, { pay_date: e.target.value })}
                    />
                  </label>
                </div>
                <p className="mt-3 text-[13px] text-navy">
                  {preview == null
                    ? 'We need the pay and how often you are paid to estimate a month.'
                    : `About ${money(preview)} a month from this stub. This is an estimate.`}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={confirmingId === draft.localId}
                    onClick={() => confirmDraft(draft)}
                    className="rounded-2xl bg-brand px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-brand-deep disabled:bg-slate-300"
                  >
                    {confirmingId === draft.localId ? 'Saving…' : 'Confirm'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrafts((prev) => prev.filter((item) => item.localId !== draft.localId))}
                    className="rounded-full border border-border bg-white px-4 py-2.5 text-[14px] font-semibold text-navy"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}

          {saved.map((doc) => (
            <div key={doc.id} className="flex items-start justify-between gap-3 rounded-3xl border border-border/70 bg-white px-4 py-3">
              <div>
                <p className="text-[14px] font-semibold text-navy">{doc.employer || 'Pay stub'}</p>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                  {frequencyLabel(doc.pay_frequency)}
                  {doc.pay_date ? ` · ${formatPayDate(doc.pay_date)}` : ''}
                  {doc.monthly_equivalent != null ? ` · about ${money(doc.monthly_equivalent)}/mo` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeSaved(doc)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-canvas hover:text-navy"
                aria-label="Remove pay stub"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {saved.length > 0 && (
            <p className="text-[13px] text-navy">
              We will use about {money(value.monthly_income)} a month before taxes. This is an estimate from your stubs.
            </p>
          )}

          <button type="button" onClick={useManual} className="text-[13px] font-semibold text-navy underline-offset-4 hover:underline">
            Enter it myself instead
          </button>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-[12.5px] font-medium text-navy">Monthly income (before taxes)</span>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-muted-foreground">
                $
              </span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                required
                className={`${input} pl-7`}
                value={value.monthly_income ?? ''}
                onChange={(e) =>
                  onChange({
                    monthly_income: e.target.value === '' ? null : Number(e.target.value),
                    income_source: 'Self-reported',
                  })
                }
              />
            </div>
            <p className="mt-1.5 text-[12px] text-muted-foreground">
              Use this if you are paid in cash. We will mark it self-reported.
            </p>
          </label>
          <label className="block">
            <span className="text-[12.5px] font-medium text-navy">Employer (optional)</span>
            <input
              className={`${input} mt-1.5`}
              value={value.employer ?? ''}
              onChange={(e) => onChange({ employer: e.target.value })}
            />
          </label>
          <label className="block sm:col-span-2">
            <button type="button" onClick={useUpload} className="text-[13px] font-semibold text-navy underline-offset-4 hover:underline">
              Upload a pay stub instead
            </button>
          </label>
        </div>
      )}

      <label className="mt-4 block">
        <span className="text-[12.5px] font-medium text-navy">Job title (optional)</span>
        <input
          className={`${input} mt-1.5`}
          value={value.job_title ?? ''}
          onChange={(e) => onChange({ job_title: e.target.value })}
        />
      </label>

      {value.income_source && (
        <p className="mt-3 text-[12px] text-muted-foreground">Source: {value.income_source}</p>
      )}
      {error && <p className="mt-3 text-[13px] text-rose-600">{error}</p>}
    </section>
  );
}
