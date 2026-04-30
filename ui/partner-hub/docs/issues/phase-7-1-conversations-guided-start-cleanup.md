# Phase 7.1 Cleanup — Guided Start Outreach Pipeline from Zero Data

## Repo
`jwsiejk/accountlist`

## Goal
Make **Start Outreach Pipeline** actually usable when the user starts with no jobs/opportunities.

## Problem
Phase 7 added launch copy and placeholder targets, but the button currently only runs generation. With zero jobs/opportunities, it processes 0 jobs and the user is stuck.

## Scope
### 1) Guided start workflow on Conversations page
- Replace one-click generation-only start with a simple guided workflow/wizard.
- Triggered by **Start Outreach Pipeline**.

### 2) Step 1 — Add target opportunity
Form fields:
- `company` (required)
- `role/title` (required)
- `location` (optional)
- `notes` (optional)
- `sourceUrl` (optional)

On save:
- Create `JobPosting` with `source: "manual"`
- Add to both `jobs` and `jobsById`
- Persist store

### 3) Step 2 — Add or approve outreach candidates
Candidate lanes:
- recruiter
- hiring manager
- employee/referral

Rules:
- Placeholder slots are allowed
- Real outreach generation requires approved/filled candidate details

### 4) Step 3 — Generate editable drafts
- Generate drafts only for selected opportunity + approved candidates
- Do **not** generate drafts for placeholders like “Recruiter target needed” unless explicitly approved

### 5) Empty states
Show explicit guidance strings:
- “Add a target company/opportunity to begin.”
- “Add or approve at least one outreach candidate.”
- “Generate drafts once an opportunity and candidate exist.”

### 6) Manual-only sending stays intact
Keep current manual controls only:
- edit
- copy
- open profile/email if available
- mark sent

## Constraints
- No external APIs
- No scraping
- No LinkedIn automation
- No auto-send

## Tests
Add/adjust coverage for:
- create manual opportunity from wizard data
- add opportunity to `jobs`/`jobsById`
- create candidate slots for a manual opportunity
- block draft generation when only unapproved placeholders exist
- generate drafts when at least one approved candidate exists
- no auto-send
- preserve existing sent/replied/skipped sequences

## Run
- `npm test`
- `npm run typecheck`
