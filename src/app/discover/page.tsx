"use client";

import { useEffect, useState, useTransition } from "react";
import { Navigation } from "@/components/Navigation";
import { ScholarshipCard } from "@/components/ScholarshipCard";
import { ScholarshipDetailsModal } from "@/components/ScholarshipDetailsModal";
import {
  Compass,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ExternalLink,
} from "lucide-react";

export default function DiscoverPage() {
  const [scholarships, setScholarships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [discoveryStage, setDiscoveryStage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [discoverySummary, setDiscoverySummary] = useState<any>(null);
  const [selectedScholarshipId, setSelectedScholarshipId] = useState<string | null>(null);

  // Filter states
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("all");
  const [educationLevel, setEducationLevel] = useState("all");
  const [field, setField] = useState("all");
  const [deadlineStatus, setDeadlineStatus] = useState("all");

  const loadScholarships = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (country !== "all") params.set("country", country);
      if (educationLevel !== "all") params.set("educationLevel", educationLevel);
      if (field !== "all") params.set("field", field);
      if (deadlineStatus !== "all") params.set("deadlineStatus", deadlineStatus);

      const res = await fetch(`/api/scholarships?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setScholarships(json.scholarships);
      } else {
        setError(json.error || "Failed to load scholarships");
      }
    } catch (err: any) {
      setError(err.message || "Network error loading scholarships");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScholarships();
  }, [country, educationLevel, field, deadlineStatus]);

  // Handle Search input with slight debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadScholarships();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Trigger TinyFish Discovery
  const handleTriggerDiscovery = async (forceDemo: boolean = false) => {
    if (discovering) return;

    setDiscovering(true);
    setError(null);
    setDiscoverySummary(null);

    // Honest staged progress reporting
    setDiscoveryStage("1. Formulating targeted search queries based on your profile...");

    try {
      const stageTimer1 = setTimeout(() => {
        setDiscoveryStage("2. Querying TinyFish Search API for official government & university domains...");
      }, 1200);

      const stageTimer2 = setTimeout(() => {
        setDiscoveryStage("3. Fetching and extracting clean structured content with TinyFish Fetch...");
      }, 3500);

      const stageTimer3 = setTimeout(() => {
        setDiscoveryStage("4. Validating extracted criteria, deduplicating, and scoring student matches...");
      }, 6000);

      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: country !== "all" ? country : undefined,
          educationLevel: educationLevel !== "all" ? educationLevel : undefined,
          fieldOfStudy: field !== "all" ? field : undefined,
          isDemo: forceDemo,
        }),
      });

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);

      const json = await res.json();

      if (json.success) {
        setDiscoverySummary(json.data);
        await loadScholarships();
      } else {
        setError(json.error || "Discovery request failed");
      }
    } catch (err: any) {
      setError(err.message || "Failed to execute discovery");
    } finally {
      setDiscovering(false);
      setDiscoveryStage("");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#1d1d1f]">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#e0e0e0]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1d1d1f]">
              Discover Scholarships &amp; Grants
            </h1>
            <p className="text-sm text-[#7a7a7a] mt-1">
              Real web discovery powered by TinyFish Search &amp; Fetch
            </p>
          </div>

          {/* Trigger Discovery Button */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handleTriggerDiscovery(false)}
              disabled={discovering}
              className={`btn-primary text-sm py-2 px-5 shadow-sm flex items-center gap-2 ${
                discovering ? "opacity-75 cursor-not-allowed" : ""
              }`}
            >
              {discovering ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Discovering...</span>
                </>
              ) : (
                <>
                  <Compass className="w-4 h-4" />
                  <span>Run Live Discovery</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleTriggerDiscovery(true)}
              disabled={discovering}
              className="btn-secondary text-xs py-2 px-3 text-[#7a7a7a] hover:text-[#0066cc]"
              title="Load verified sample opportunities without consuming API credits"
            >
              <span>Sample Demo</span>
            </button>
          </div>
        </div>

        {/* Live Discovery Progress Banner */}
        {discovering && (
          <div className="mt-6 p-5 rounded-2xl bg-[#f0f4ff] border border-[#d0e0fc] animate-in fade-in flex items-center gap-4">
            <RefreshCw className="w-6 h-6 text-[#0066cc] animate-spin shrink-0" />
            <div>
              <h4 className="font-semibold text-sm text-[#0066cc]">Discovery in Progress</h4>
              <p className="text-xs text-[#1d1d1f]/80 mt-0.5 font-medium">{discoveryStage}</p>
            </div>
          </div>
        )}

        {/* Discovery Summary Banner */}
        {discoverySummary && !discovering && (
          <div className="mt-6 p-4 rounded-2xl bg-[#e8f5e9] border border-[#c8e6c9] text-xs text-[#1b5e20] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#1b5e20] shrink-0" />
              <span>
                Discovery completed! {discoverySummary.sourcesFound} sources scanned &bull;{" "}
                {discoverySummary.recordsCreated} new scholarships added &bull;{" "}
                {discoverySummary.recordsUpdated} updated.
              </span>
            </div>
            <button
              onClick={() => setDiscoverySummary(null)}
              className="text-[#1b5e20] font-semibold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Error / API Key Missing Notification */}
        {error && (
          <div className="mt-6 p-5 rounded-2xl bg-[#fff8e1] border border-[#ffe082] text-xs text-[#b78103] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#b78103] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-sm text-[#1d1d1f] block">Notice</span>
                <p className="mt-0.5 text-[#1d1d1f]/80 leading-relaxed">{error}</p>
                {error.includes("TINYFISH_API_KEY") && (
                  <p className="mt-1 text-[#7a7a7a]">
                    You can set your API key in <code>.env</code> on the server or click &ldquo;Sample Demo&rdquo; to test with verified authentic listings.
                  </p>
                )}
              </div>
            </div>

            {error.includes("TINYFISH_API_KEY") && (
              <button
                onClick={() => handleTriggerDiscovery(true)}
                className="btn-primary text-xs py-1.5 px-4 shrink-0 bg-[#0066cc]"
              >
                Load Sample Demo
              </button>
            )}
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="mt-8 p-4 rounded-2xl bg-[#f5f5f7] border border-[#e0e0e0] flex flex-col gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#7a7a7a] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by scholarship title, provider, or keyword..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-[#e0e0e0] rounded-full focus:outline-none focus:border-[#0066cc] text-[#1d1d1f]"
            />
          </div>

          {/* Dropdown Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
            {/* Country */}
            <div>
              <label className="text-[11px] font-medium text-[#7a7a7a] block mb-1">
                Region / Country
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-[#e0e0e0] rounded-lg text-[#1d1d1f] focus:outline-none focus:border-[#0066cc]"
              >
                <option value="all">All Regions</option>
                <option value="international">International / Worldwide</option>
                <option value="united states">United States</option>
                <option value="india">India</option>
                <option value="united kingdom">United Kingdom</option>
                <option value="germany">Germany</option>
                <option value="canada">Canada</option>
              </select>
            </div>

            {/* Degree Level */}
            <div>
              <label className="text-[11px] font-medium text-[#7a7a7a] block mb-1">
                Education Level
              </label>
              <select
                value={educationLevel}
                onChange={(e) => setEducationLevel(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-[#e0e0e0] rounded-lg text-[#1d1d1f] focus:outline-none focus:border-[#0066cc]"
              >
                <option value="all">All Levels</option>
                <option value="undergraduate">Undergraduate (Bachelor)</option>
                <option value="graduate">Graduate (Master)</option>
                <option value="doctorate">Doctorate (Ph.D.)</option>
                <option value="high_school">High School</option>
              </select>
            </div>

            {/* Field */}
            <div>
              <label className="text-[11px] font-medium text-[#7a7a7a] block mb-1">
                Field of Study
              </label>
              <select
                value={field}
                onChange={(e) => setField(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-[#e0e0e0] rounded-lg text-[#1d1d1f] focus:outline-none focus:border-[#0066cc]"
              >
                <option value="all">All Fields</option>
                <option value="computer science">Computer Science &amp; IT</option>
                <option value="engineering">Engineering</option>
                <option value="stem">STEM Disciplines</option>
                <option value="business">Business &amp; Finance</option>
                <option value="medicine">Medicine &amp; Health</option>
                <option value="humanities">Humanities &amp; Arts</option>
              </select>
            </div>

            {/* Deadline Status */}
            <div>
              <label className="text-[11px] font-medium text-[#7a7a7a] block mb-1">
                Deadline Status
              </label>
              <select
                value={deadlineStatus}
                onChange={(e) => setDeadlineStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-[#e0e0e0] rounded-lg text-[#1d1d1f] focus:outline-none focus:border-[#0066cc]"
              >
                <option value="all">All Deadlines</option>
                <option value="open">Active / Upcoming</option>
                <option value="closing_soon">Closing Soon (within 14 days)</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Count and Grid */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#7a7a7a]">
              Results ({scholarships.length})
            </span>
            <span className="text-xs text-[#7a7a7a]">
              Sorted deterministically by eligibility match and relevance
            </span>
          </div>

          {loading ? (
            <div className="py-24 text-center text-[#7a7a7a]">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0066cc]" />
              <p className="text-sm">Retrieving verified opportunities...</p>
            </div>
          ) : scholarships.length === 0 ? (
            <div className="apple-card p-12 text-center bg-[#fafafc]">
              <div className="w-12 h-12 rounded-full bg-[#f0f4ff] text-[#0066cc] flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-base text-[#1d1d1f]">No matching scholarships found</h3>
              <p className="text-xs text-[#7a7a7a] max-w-md mx-auto mt-1 mb-5">
                Try widening your filters or click &ldquo;Run Live Discovery&rdquo; to crawl official portals for new listings.
              </p>
              <button
                onClick={() => handleTriggerDiscovery(true)}
                className="btn-primary text-xs py-2 px-4"
              >
                Load Sample Opportunities
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {scholarships.map((sch) => (
                <ScholarshipCard
                  key={sch.id}
                  scholarship={sch}
                  onSelect={(id) => setSelectedScholarshipId(id)}
                  onSaveToggle={loadScholarships}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Details Modal */}
      <ScholarshipDetailsModal
        scholarshipId={selectedScholarshipId}
        onClose={() => setSelectedScholarshipId(null)}
        onUpdated={loadScholarships}
      />
    </div>
  );
}
