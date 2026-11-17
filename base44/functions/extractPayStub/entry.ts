import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Keep the multipliers in sync with src/lib/income.js. Functions cannot import src/.
const FACTORS = { weekly: 52 / 12, biweekly: 26 / 12, semimonthly: 2, monthly: 1 };
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']);

const FREQUENCY_ALIASES = {
  weekly: 'weekly',
  week: 'weekly',
  'bi-weekly': 'biweekly',
  biweekly: 'biweekly',
  'bi weekly': 'biweekly',
  'every two weeks': 'biweekly',
  'every 2 weeks': 'biweekly',
  semimonthly: 'semimonthly',
  'semi-monthly': 'semimonthly',
  'semi monthly': 'semimonthly',
  'twice a month': 'semimonthly',
  monthly: 'monthly',
  month: 'monthly',
};

function monthlyEquivalent(gross, frequency) {
  const factor = FACTORS[frequency];
  const amount = Number(gross);
  if (!factor || !Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * factor);
}

function normalizeFrequency(value) {
  if (!value) return '';
  const key = String(value).trim().toLowerCase();
  return FREQUENCY_ALIASES[key] || (FACTORS[key] ? key : '');
}

function normalizeDate(value) {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value).trim());
  return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
}

function firstOutput(output) {
  if (Array.isArray(output)) {
    const row = output.find((item) => item && typeof item === 'object');
    return row || {};
  }
  if (output && typeof output === 'object') return output;
  return {};
}

function fileFromBase64(dataBase64, filename, contentType) {
  const binary = atob(dataBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: contentType });
}

async function readUpload(req) {
  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return { error: 'Choose a photo or PDF of your pay stub.' };
    }
    if (file.size > MAX_BYTES) {
      return { error: 'That file is too big. Use a photo or PDF under 8 MB.' };
    }
    const type = (file.type || '').toLowerCase();
    if (!ALLOWED.has(type)) return { error: 'Use a JPG, PNG, or PDF.' };
    return { file };
  }

  const body = await req.json().catch(() => ({}));
  const dataBase64 = typeof body.data_base64 === 'string' ? body.data_base64.replace(/\s/g, '') : '';
  const type = String(body.content_type || '').toLowerCase();
  if (!dataBase64) return { error: 'Choose a photo or PDF of your pay stub.' };
  if (!ALLOWED.has(type)) return { error: 'Use a JPG, PNG, or PDF.' };
  if (dataBase64.length > Math.ceil(MAX_BYTES * 4 / 3) + 64) {
    return { error: 'That file is too big. Use a photo or PDF under 8 MB.' };
  }
  try {
    const file = fileFromBase64(
      dataBase64,
      String(body.filename || 'pay-stub').slice(0, 120),
      type
    );
    if (file.size > MAX_BYTES) {
      return { error: 'That file is too big. Use a photo or PDF under 8 MB.' };
    }
    return { file };
  } catch {
    return { error: 'We could not read that file. Try a different photo or PDF.' };
  }
}

export default async function extractPayStub(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((error) => (
      error.status === 401 ? null : Promise.reject(error)
    ));
    if (!user) return Response.json({ error: 'Sign in to upload a pay stub.' }, { status: 401 });

    const upload = await readUpload(req);
    if (upload.error) return Response.json({ error: upload.error }, { status: 400 });

    const stored = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file: upload.file });
    const fileUri = stored?.file_uri;
    if (!fileUri) {
      return Response.json({ error: 'We could not store that file. Try again.' }, { status: 500 });
    }

    let extracted = {};
    let warning = '';
    try {
      const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
        file_uri: fileUri,
        expires_in: 300,
      });
      const result = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
        file_url: signed?.signed_url,
        json_schema: {
          type: 'object',
          properties: {
            employer: { type: 'string', description: 'Employer name printed on the stub' },
            gross_pay: { type: 'number', description: 'Gross pay for this pay period, before taxes' },
            pay_frequency: {
              type: 'string',
              enum: ['weekly', 'biweekly', 'semimonthly', 'monthly'],
              description: 'How often the person is paid',
            },
            pay_date: { type: 'string', description: 'Pay date as YYYY-MM-DD' },
          },
        },
      });
      if (!result || result.status === 'error') {
        warning = 'We saved the file but could not read the numbers. Type them in.';
      } else {
        extracted = firstOutput(result.output);
      }
    } catch {
      warning = 'We saved the file but could not read the numbers. Type them in.';
    }

    const payFrequency = normalizeFrequency(extracted.pay_frequency);
    const grossPay = Number(extracted.gross_pay);
    const gross = Number.isFinite(grossPay) && grossPay >= 0 ? grossPay : null;
    const monthly = gross != null && payFrequency ? monthlyEquivalent(gross, payFrequency) : null;
    const employer = extracted.employer ? String(extracted.employer).trim().slice(0, 200) : '';
    const payDate = normalizeDate(extracted.pay_date);

    const response = { file_uri: fileUri };
    if (employer) response.employer = employer;
    if (gross != null) response.gross_pay = gross;
    if (payFrequency) response.pay_frequency = payFrequency;
    if (payDate) response.pay_date = payDate;
    if (monthly != null) response.monthly_equivalent = monthly;
    if (warning) response.warning = warning;
    return Response.json(response);
  } catch (error) {
    return Response.json({ error: error.message || 'Could not read that pay stub.' }, { status: 500 });
  }
}
