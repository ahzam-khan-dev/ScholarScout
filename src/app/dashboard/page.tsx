"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { ScholarshipCard } from "@/components/ScholarshipCard";
import { ScholarshipDetailsModal } from "@/components/ScholarshipDetailsModal";
import {
  Compass,
  Sparkles,
  Bookmark,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Search,
} from "lucide-react";
import { format } from "date-fns";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScholarshipId, setSelectedScholarshipId] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.error || "Failed to load dashboard data");
      }
    } catch (err: any) {
      setError(err.message || "Network error loading dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const stats = data?.stats || {
    totalDiscovered: 0,
    strongMatches: 0,
    savedScholarships: 0,
    upcomingDeadlines: 0,
  };

  const lastRun = data?.lastRun;
  const recommendations = data?.recommendations || [];
  const profile = data?.profile;

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#1d1d1f]">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Top greeting and Discover CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#e0e0e0]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1d1d1f]">
              Welcome back{profile?.name ? `, ${profile.name}` : ""}
            </h1>
            <p className="text-sm text-[#7a7a7a] mt-1">
              Active profile: {profile?.educationLevel || "Student"} &bull;{" "}
              {profile?.fieldOfStudy || "General Studies"} &bull;{" "}
              {profile?.country || "International"}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadDashboard}
              disabled={loading}
              className="p-2 rounded-full border border-[#e0e0e0] hover:bg-[#f5f5f7] transition-colors"
              title="Refresh dashboard metrics"
            >
              <RefreshCw className={`w-4 h-4 text-[#7a7a7a] ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link href="/discover" className="btn-primary text-sm py-2 px-5 shadow-sm">
              <Compass className="w-4 h-4" />
              <span>Discover Scholarships</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="mt-6 p-4 rounded-xl bg-[#ffebee] border border-[#ffcdd2] text-sm text-[#c62828]">
            {error}
          </div>
        )}

        {/* Real Data Metrics Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {/* Total Discovered */}
          <div className="apple-card p-5 bg-[#fafafc]">
            <span className="text-xs font-medium text-[#7a7a7a] block uppercase tracking-wider">
              Discovered Opportunities
            </span>
            <div className="text-3xl font-bold tracking-tight text-[#1d1d1f] mt-1">
              {stats.totalDiscovered}
            </div>
            <span className="text-xs text-[#7a7a7a] mt-1 block">Indexed from official sources</span>
          </div>

          {/* Strong Matches */}
          <div className="apple-card p-5 bg-[#fafafc]">
            <span className="text-xs font-medium text-[#0066cc] block uppercase tracking-wider">
              Strong Matches
            </span>
            <div className="text-3xl font-bold tracking-tight text-[#0066cc] mt-1">
              {stats.strongMatches}
            </div>
            <span className="text-xs text-[#7a7a7a] mt-1 block">
              Meeting known requirements (70%+)
            </span>
          </div>

          {/* Saved */}
          <div className="apple-card p-5 bg-[#fafafc]">
            <span className="text-xs font-medium text-[#7a7a7a] block uppercase tracking-wider">
              Saved Scholarships
            </span>
            <div className="text-3xl font-bold tracking-tight text-[#1d1d1f] mt-1">
              {stats.savedScholarships}
            </div>
            <Link href="/saved" className="text-xs text-[#0066cc] hover:underline mt-1 block">
              View saved list &rarr;
            </Link>
          </div>

          {/* Upcoming Deadlines */}
          <div className="apple-card p-5 bg-[#fafafc]">
            <span className="text-xs font-medium text-[#7a7a7a] block uppercase tracking-wider">
              Upcoming Deadlines
            </span>
            <div className="text-3xl font-bold tracking-tight text-[#1d1d1f] mt-1">
              {stats.upcomingDeadlines}
            </div>
            <Link href="/deadlines" className="text-xs text-[#0066cc] hover:underline mt-1 block">
              Track deadlines &rarr;
            </Link>
          </div>
        </div>

        {/* Last Discovery Run Banner */}
        <div className="mt-8 p-4 sm:p-5 rounded-2xl border border-[#e0e0e0] bg-[#f5f5f7] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white border border-[#e0e0e0] flex items-center justify-center text-[#0066cc] shrink-0">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-[#1d1d1f]">
                  Discovery Engine Status
                </span>
                {lastRun ? (
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${
                      lastRun.status === "completed"
                        ? "bg-[#e8f5e9] text-[#1b5e20] border border-[#c8e6c9]"
                        : lastRun.status === "partial_success"
                        ? "bg-[#fff8e1] text-[#b78103] border border-[#ffe082]"
                        : "bg-[#ffebee] text-[#c62828] border border-[#ffcdd2]"
                    }`}
                  >
                    {lastRun.status.replace("_", " ")}
                  </span>
                ) : (
                  <span className="text-[11px] text-[#7a7a7a]">No discovery runs yet</span>
                )}
              </div>

              <p className="text-xs text-[#7a7a7a] mt-0.5">
                {lastRun ? (
                  <>
                    Last run {format(new Date(lastRun.startedAt), "MMM d, yyyy 'at' h:mm a")} &bull;{" "}
                    {lastRun.sourcesFound} official sources scanned &bull;{" "}
                    {lastRun.recordsCreated} created &bull; {lastRun.recordsUpdated} updated
                  </>
                ) : (
                  "Run your first discovery to crawl official scholarships tailored to your profile."
                )}
              </p>
            </div>
          </div>

          <Link href="/discover" className="btn-secondary text-xs py-2 px-4 shrink-0">
            <span>Run New Search</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Top Recommended Scholarships Section */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-[#1d1d1f]">
                Top Recommended Opportunities
              </h2>
              <p className="text-xs text-[#7a7a7a] mt-0.5">
                Ranked by eligibility criteria and academic fit
              </p>
            </div>

            <Link href="/discover" className="text-xs text-[#0066cc] font-medium hover:underline flex items-center gap-1">
              <span>View all ({stats.totalDiscovered})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="py-20 text-center text-[#7a7a7a]">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0066cc]" />
              <p className="text-sm">Evaluating scholarship recommendations...</p>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="apple-card p-12 text-center bg-[#fafafc]">
              <div className="w-12 h-12 rounded-full bg-[#f0f4ff] text-[#0066cc] flex items-center justify-center mx-auto mb-3">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-base text-[#1d1d1f]">No scholarships indexed yet</h3>
              <p className="text-xs text-[#7a7a7a] max-w-md mx-auto mt-1 mb-5">
                Start discovering opportunities using the TinyFish search engine or preview sample
                verified listings.
              </p>
              <Link href="/discover" className="btn-primary text-sm py-2 px-5">
                <span>Start Discovery</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {recommendations.map((sch: any) => (
                <ScholarshipCard
                  key={sch.id}
                  scholarship={sch}
                  onSelect={(id) => setSelectedScholarshipId(id)}
                  onSaveToggle={() => loadDashboard()}
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
        onUpdated={loadDashboard}
      />
    </div>
  );
}
