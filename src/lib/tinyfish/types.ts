/**
 * TinyFish API TypeScript Definitions
 * Based directly on official documentation at https://docs.tinyfish.ai/
 */

export interface TinyFishSearchParams {
  query: string;
  purpose?: string;
  location?: string;
  language?: string;
  include_domains?: string;
  exclude_domains?: string;
  domain_type?: "web" | "news" | "research_paper";
  page?: number;
}

export interface TinyFishSearchResultItem {
  position: number;
  site_name?: string;
  title: string;
  snippet?: string;
  url: string;
  date?: string;
}

export interface TinyFishSearchResponse {
  query: string;
  results: TinyFishSearchResultItem[];
  total_results: number;
  page: number;
}

export interface TinyFishFetchParams {
  urls: string[];
  format?: "markdown" | "html" | "json";
  purpose?: string;
  per_url_timeout_ms?: number;
}

export interface TinyFishFetchResultItem {
  url: string;
  final_url?: string;
  title?: string | null;
  description?: string | null;
  language?: string | null;
  author?: string | null;
  published_date?: string | null;
  text?: string | null;
  latency_ms?: number | null;
  format?: string;
}

export interface TinyFishFetchErrorItem {
  url: string;
  error: string;
  status?: number;
}

export interface TinyFishFetchResponse {
  results: TinyFishFetchResultItem[];
  errors: TinyFishFetchErrorItem[];
}

export interface TinyFishAgentParams {
  url: string;
  goal: string;
  browser_profile?: "lite" | "stealth";
  output_schema?: Record<string, unknown>;
}

export interface TinyFishAgentError {
  code: string;
  message: string;
  category?: string;
  retry_after?: number;
}

export interface TinyFishAgentResponse {
  run_id?: string | null;
  status: "COMPLETED" | "FAILED";
  started_at?: string | null;
  finished_at?: string | null;
  num_of_steps?: number | null;
  result?: Record<string, unknown> | null;
  error?: TinyFishAgentError | null;
}
