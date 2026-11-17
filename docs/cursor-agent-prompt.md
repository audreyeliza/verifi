# Prompt for the second agent (Cursor)

Paste everything below the line into Cursor's agent.

---

You're working on **Verifi**, a Base44 app (Vite + React SPA, Tailwind, Base44 SDK) in this folder. Verifi helps low-income households in Ohio apply for SNAP, WIC, HEAP and Medicaid from one profile. Read `AGENTS.md` and `README.md` first. Before writing any Base44 code, read the relevant skills in `.agents/skills/`: `base44-platform-entities` (including `references/rls.md`), `base44-platform-backend-functions`, `base44-platform-integrations-sdk`, `base44-platform-workflows` and `base44-platform-frontend`.

## What already exists (don't rebuild it)

- **Real accounts:** email/password sign-up with an email code, login, and password reset (`/login`, `/register`, `/forgot-password`, `/reset-password`). Signed-in pages sit under `ProtectedRoute` in `src/App.jsx`.
- **Roles:** caseworkers are users with the app role `admin`. `isCaseworker(user)` lives in `src/lib/verifi.js`, and the `CaseworkerRoute` component gates `/caseworker/*`.
- **Data, with row-level security:**
  - `Applicant`: one profile per user. The owner and admins can read and update it.
  - `Application`: one per program. The owner can create it, only with status `Submitted`. Only admins can update it.
  - Schemas are in `base44/entities/`.
- **Eligibility engine:** `src/lib/eligibility.js`. These are pure functions using Ohio income limits. `checkEligibility(applicant, overrides)` returns one result per program: `{ key, label, result: 'Likely eligible'|'Needs review'|'Not eligible', amount, benefit, reason, limit }`. Pass `overrides` for "what if" questions, e.g. `{ monthly_income: 2400 }`.
- **Flow:** `/consent` → `/connect` (profile form) → `/profile` → `/results` (runs eligibility and creates Applications) → `/applications` (status tracker). Caseworkers use `/caseworker` and `/caseworker/:id`, where they can start review, approve, or deny with a reason.
- **Mobile-first:** the app is meant to feel like a phone app. `src/components/MobileTabBar.jsx` is the bottom navigation on phones, and desktop uses the top nav (`VerifiNav`). Design every new screen for a 390px-wide phone first. Add a tab to `MobileTabBar` only if it's a main destination (5 tabs max).

## Rules that will bite you

1. **SDK sort/limit must be positional:** `base44.entities.X.filter(query, '-created_date', 50)` and `.list('-created_date', 100)`. The options-object form `{ sort, limit }` returns zero rows on the local dev backend.
2. **Never send `null` for a typed field** in create/update. The API rejects it ("Input should be a valid string"), so leave the key out instead.
3. **Core integrations are backend-only for this app.** `UploadPrivateFile`, `ExtractDataFromUploadedFile`, `InvokeLLM` and `SendEmail` must run inside a backend function (`base44/functions/<name>/entry.ts`) that the frontend calls with `base44.functions.invoke(...)`. Check that the caller is signed in, and that they own the record they're touching.
4. **Every new entity that holds personal data needs an `rls` block:** owner-or-admin for read, update and delete. Copy the pattern in `base44/entities/Applicant.jsonc`. Never store file contents in entity fields; store the private `file_uri`.
5. **Don't rewrite the existing auth pages** (`Login`, `Register`, `ForgotPassword`, `ResetPassword`, `Mfa`, `src/lib/authMfa*.js`).
6. **Plain language:** a 6th–8th grade reading level, short sentences, and say what to do next. Every eligibility number is an *estimate*, so say so. Never promise someone will get a benefit.
7. **Keep the existing look:** navy (`bg-navy`, `text-navy`), green for verified (`text-verify`, `bg-verify-soft`), rounded-2xl white cards on `bg-canvas`, and the `font-heading` headings. Reuse `StatusPill`, `VerifiNav` and `FlowProgress`.

## How to work

- Build **one feature at a time**, in the order below. Finish each one before starting the next.
- Run the app with `base44 dev` (not `npm run dev`) and open http://localhost:5173. Local data is in memory and is wiped on restart. When you register a test account locally, the email code is printed in the `base44 dev` terminal output ("use this verification code: …").
- To test caseworker screens, you need a user with role `admin`. Set it in the Base44 dashboard (Users), or ask the human how they set up their test admin.
- After each feature: run `npm run lint` and `npm run build` (both must pass), click through it at phone width, then write a short summary of what you changed and how you tested it.
- Don't deploy or publish anything. The human publishes from the Base44 dashboard.

## Features, in order

### 1. Pay stub upload (income source)
Income is currently typed in and tagged "Self-reported". Replace that with a pay stub upload in `src/components/IncomeSection.jsx`, keeping its props contract (`value`, `onChange`, `applicant`) exactly as the comment at the top of that file describes.
- Backend function `extractPayStub`: it accepts an uploaded file (image or PDF), stores it with `UploadPrivateFile`, extracts gross pay, pay period (weekly, biweekly, semimonthly or monthly), pay date and employer, then converts the result to gross monthly income (weekly ×52/12, biweekly ×26/12, semimonthly ×2).
- New entity `IncomeDocument`: `applicant`, `file_uri`, `employer`, `gross_pay`, `pay_frequency`, `pay_date`, `monthly_equivalent`, with owner-or-admin RLS.
- UI: the person uploads one or more stubs, sees the extracted numbers, can correct them, and confirms. Then call `onChange({ monthly_income, employer, income_source: 'Uploaded document' })`. Keep a small "Enter it myself instead" fallback, tagged `Self-reported`, for people paid in cash.
- On the caseworker case detail (`src/pages/CaseDetail.jsx`), list the person's documents with a link to view each one (a signed URL from a backend function).

### 2. Raise calculator
A page at `/calculator`, plus a link from `/applications`: "Thinking about more hours or a new job?"
- Input: new monthly income, or extra hours × hourly rate.
- Show, per program, today's result next to the result with the new income, using `checkEligibility(applicant, { monthly_income: newIncome })`. Highlight any program that would change, and show net effect = extra pay − lost SNAP dollars.
- Plain-language summary, e.g. "You'd take home about $X more per month, even after SNAP goes down by $Y." Warn clearly when a program would be lost entirely (especially Medicaid).

### 3. Change alerts
When someone saves a change to income or household on `/connect`, compare `checkEligibility(before)` with `checkEligibility(after)`.
- If any program's result or amount changes, show a screen before they leave: which programs are affected, how, and what to do next. For example, Ohio requires reporting changes, so tell them who to contact.
- New entity `Alert` (owner-or-admin RLS): `applicant`, `kind` (`change`, `rule_update`, `renewal`, `notice`), `title`, `body`, `read_at`. Show unread alerts at the top of `/applications`.

### 4. Denial helper
On a `Denied` application in `/applications`, add an "Understand this and appeal" button.
- A backend function uses `InvokeLLM` to explain the caseworker's `decision_reason` in plain words, say whether it looks fixable (missing document vs. truly over income), and draft a pre-filled appeal / state hearing request letter using the person's profile.
- Show the letter so they can edit, copy and download it. Look up and cite the real Ohio state hearing process and deadline (ODJFS) rather than guessing; put the source link in the UI.

### 5. Plain-language letters
A page at `/letters`: the person photographs or uploads a notice they got from an agency, or pastes its text.
- A backend function extracts the text and uses `InvokeLLM` to return: what this letter is, what it means for them, whether they need to do anything, and by when.
- Store a `Notice` entity (owner-or-admin RLS) with the file URI and the explanation. If there's a deadline, also create an `Alert`.

### 6. Government updates
- New entity `RuleUpdate`: `title`, `summary`, `programs` (array of program keys), `effective_date`, `source_url`. Everyone can read it; only admins can create or edit it (see the "Everyone reads; only admins create or edit" pattern in the RLS skill).
- Admin page `/caseworker/updates` to post updates.
- Applicants see the updates that touch programs they've applied to, on `/applications`, each with a one-paragraph "what this means for you" (`InvokeLLM`, personalized to their profile and cached on an `Alert`).
- Seed one real example with a source link: Medicaid renewals moving to every 6 months starting in 2027.

### 7. Auto-renewal (re-check)
- When an application is approved, set `renewal_due_at` on it (12 months; 6 for Medicaid starting in 2027).
- A scheduled Base44 workflow runs daily. For applications due within 30 days, it re-runs `checkEligibility` on the current profile. If the newest income document is older than 60 days, it creates an `Alert` asking for a new pay stub. Otherwise it marks the application `renewal_ready` and creates an `Alert` saying "We've rechecked your info. Nothing to upload."
- Be honest in the UI: this rechecks Verifi's data and prepares the renewal. It doesn't file with the state.
