# ScholarScout — Intelligent Scholarship & Grant Discovery Platform

ScholarScout is a student-focused scholarship and grant discovery platform powered by the **TinyFish API** and designed following clean Apple human-interface principles.

Unlike traditional scholarship search engines that rely on outdated scrape aggregators or fabricated demo data, ScholarScout uses TinyFish's official search and content extraction APIs to find authentic opportunities published directly on official university (`.edu`), government (`.gov`), and foundation websites.

---

## Architecture & System Overview

```
[ Student Profile ]
       │
       ▼
[ Query Formulator ] ──> Generates focused education, degree, and region queries
       │
       ▼
[ TinyFish Search API ] ──> Discovers official .gov, .edu, and .org pages
       │
       ▼
[ SSRF & Safety Filter ] ──> Rejects non-HTTP(S), localhost, and private IP ranges
       │
       ▼
[ TinyFish Fetch API ] ──> Retrieves clean Markdown content in batches of ≤10
       │
       ▼
[ Structured Parser & Zod ] ──> Extracts award amount, deadlines, requirements, and docs
       │
       ▼
[ SQLite + Prisma ORM ] ──> Deduplicates by sourceUrl and persists records
       │
       ▼
[ Deterministic Eligibility ] ──> Compares profile vs criteria (Met/Not Met/Unknown)
       │
       ▼
[ Transparent Scoring & Ranking ] ──> Computes 0-100% score with clear explanations
```

---

## Key Features

1. **Live TinyFish API Web Discovery**
   - **TinyFish Search:** Queries official sources based on degree level, field of study, and country.
   - **TinyFish Fetch:** Extracts clean page markdown without web scraping bloat or bot challenge blockers.
   - **TinyFish Agent (Optional Fallback):** Capable of multi-step navigation when criteria are behind complex dynamic elements.

2. **Deterministic Eligibility Engine**
   - No hallucinations or simulated match decisions.
   - Evaluates country/residency, education level, field of study, academic GPA/percentage scales, and family income limits.
   - Assigns a transparent status: `eligible` (all mandatory criteria met), `potential_match` (no violation, but some unverified), or `not_eligible` (at least one criterion failed).
   - Generates plain-English reasons for matches and lists missing criteria.

3. **Timezone-Accurate Deadline Tracker**
   - Groups opportunities into Closing Soon (within 14 days), Upcoming, Rolling, and Expired.
   - Never infers a deadline when the source does not specify one.

4. **Document Application Checklist**
   - Automatically extracts required documents (transcripts, letters of recommendation, statement of purpose, CV, proof of income).
   - Tracks student completion progress per scholarship in SQLite.

5. **Security & Source Integrity**
   - SSRF protection rejecting RFC 1918 private IPs, AWS/GCP metadata (`169.254.169.254`), and loopback hosts.
   - Server-only API key handling (`TINYFISH_API_KEY` never sent to browsers).
   - Direct links to official source pages (never fabricated application links).

---

## Technology Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (Apple Minimalist Design System, Action Blue `#0066cc`)
- **Icons:** Lucide React
- **Database & ORM:** SQLite with Prisma ORM
- **Validation:** Zod
- **Date Handling:** date-fns
- **Testing:** Vitest
- **API Client:** Native `fetch` with TypeScript contracts

---

## Verified TinyFish API Contracts

### 1. TinyFish Search API
- **Endpoint:** `GET https://api.search.tinyfish.ai`
- **Header:** `X-API-Key: $TINYFISH_API_KEY`
- **Parameters:**
  - `query`: string (required)
  - `purpose`: string (intent statement)
  - `location`: string (e.g. `US`, `IN`, `GB`)
  - `language`: string (e.g. `en`)
  - `domain_type`: `web` | `news` | `research_paper`
- **Response Format:**
  ```json
  {
    "query": "Official university scholarships for computer science undergraduate students",
    "results": [
      {
        "position": 1,
        "site_name": "stanford.edu",
        "title": "Stanford Graduate Merit Fellowship",
        "snippet": "Provides annual funding for graduate students...",
        "url": "https://stanford.edu/academics/merit-fellowship"
      }
    ],
    "total_results": 1,
    "page": 0
  }
  ```

### 2. TinyFish Fetch API
- **Endpoint:** `POST https://api.fetch.tinyfish.ai`
- **Header:** `X-API-Key: $TINYFISH_API_KEY`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "urls": ["https://stanford.edu/academics/merit-fellowship"],
    "format": "markdown",
    "purpose": "Extract scholarship requirements and deadlines",
    "per_url_timeout_ms": 30000
  }
  ```
- **Response Format:**
  ```json
  {
    "results": [
      {
        "url": "https://stanford.edu/academics/merit-fellowship",
        "final_url": "https://stanford.edu/academics/merit-fellowship",
        "title": "Stanford Graduate Merit Fellowship",
        "description": "Full tuition fellowship for doctoral candidates",
        "text": "# Stanford Graduate Merit Fellowship\n\nAward: $45,000 annually..."
      }
    ],
    "errors": []
  }
  ```

---

## Installation & Setup

### Prerequisites
- Node.js 18+ (tested on v26)
- npm or pnpm

### 1. Clone or Open the Project
```bash
cd /Users/amirjameel/.gemini/antigravity/scratch/scholarscout
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` with your TinyFish API key:
```env
DATABASE_URL="file:./dev.db"
TINYFISH_API_KEY="your_tinyfish_api_key_here"
DEMO_MODE="false"
```

> **API Key Note:** Obtain an API key from [TinyFish Dashboard](https://agent.tinyfish.ai/api-keys). If you do not have an API key, you can set `DEMO_MODE="true"` or click the **Sample Demo** button in the UI to explore with authentic verified sample listings.

### 3. Initialize the Database
Generate the Prisma client and sync the SQLite database:
```bash
npm run db:push
npm run db:generate
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Verification & Testing

### 1. Automated Unit & Integration Tests
Run the comprehensive Vitest test suite:
```bash
npm test
```
This tests:
- URL safety and SSRF protections
- Zod Student Profile validation
- Scholarship extraction and date parsing
- Deterministic Eligibility Engine and transparent scoring
- Ranking and expired deadline handling
- TinyFish API client (mocked with retries and rate limit simulation)
- Database deduplication, saved scholarship uniqueness, and checklist progress

### 2. Live TinyFish Integration Test (Optional)
When you have set your `TINYFISH_API_KEY` in `.env`, run a real end-to-end Search & Fetch test:
```bash
npm run test:live
```

### 3. Production Build
Verify the production build:
```bash
npm run build
```

---

## Application Routes

- `/` — Landing page with product overview and transparency notices
- `/dashboard` — Real-time database metrics, last discovery run, and top recommendations
- `/discover` — Filterable discovery studio with live TinyFish crawling and honest staged progress
- `/saved` — Saved scholarships with document application checklist status
- `/deadlines` — Categorized deadline tracker (Closing Soon, Upcoming, Rolling, Expired)
- `/profile` — Student profile editor with grading scale selector and income thresholds

---

## Troubleshooting

- **401 Unauthorized (`MISSING_API_KEY`):**
  Ensure `TINYFISH_API_KEY` is set in your `.env` file without extra whitespace.
- **429 Rate Limit:**
  TinyFish default accounts have a 30 req/min limit for Search and 150 URLs/min for Fetch. ScholarScout includes automatic exponential backoff retries.
- **No Results Found:**
  Try broadening the filters (e.g. choose "All Regions" or "All Fields") or run a custom query.
- **SQLite Database Reset:**
  If you ever wish to start fresh, delete `dev.db` and re-run `npm run db:push`.
