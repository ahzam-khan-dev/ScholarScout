"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { ScholarshipCard } from "@/components/ScholarshipCard";
import { ScholarshipDetailsModal } from "@/components/ScholarshipDetailsModal";
import { Bookmark, Compass, RefreshCw, CheckCircle2 } from "lucide-react";

export default function SavedScholarshipsPage() {
  const [scholarships, setScholarships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScholarshipId, setSelectedScholarshipId] = useState<string | null>(null);

  const loadSaved = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saved");
      const json = await res.json();
      if (json.success) {
        setScholarships(json.scholarships);
      } else {
        setError(json.error || "Failed to load saved scholarships");
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSaved();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#1d1d1f]">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between pb-6 border-b border-[#e0e0e0]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1d1d1f]">
              Saved Scholarships
            </h1>
            <p className="text-sm text-[#7a7a7a] mt-1">
              Your bookmarked opportunities and document application progress
            </p>
          </div>

          <Link href="/discover" className="btn-primary text-xs sm:text-sm py-2 px-4">
            <Compass className="w-4 h-4" />
            <span>Find More</span>
          </Link>
        </div>

        {error && (
          <div className="mt-6 p-4 rounded-xl bg-[#ffebee] border border-[#ffcdd2] text-xs text-[#c62828]">
            {error}
          </div>
        )}

        <div className="mt-8">
          {loading ? (
            <div className="py-24 text-center text-[#7a7a7a]">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0066cc]" />
              <p className="text-sm">Loading your saved list...</p>
            </div>
          ) : scholarships.length === 0 ? (
            <div className="apple-card p-12 text-center bg-[#fafafc]">
              <div className="w-12 h-12 rounded-full bg-[#f0f4ff] text-[#0066cc] flex items-center justify-center mx-auto mb-3">
                <Bookmark className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-base text-[#1d1d1f]">No saved scholarships</h3>
              <p className="text-xs text-[#7a7a7a] max-w-md mx-auto mt-1 mb-5">
                Bookmark opportunities from the Discover page to track them here and prepare your application checklist.
              </p>
              <Link href="/discover" className="btn-primary text-xs py-2 px-4">
                <span>Browse Opportunities</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {scholarships.map((sch) => (
                <div key={sch.id} className="relative flex flex-col">
                  {/* Document Checklist Counter Pill */}
                  {sch.checklistProgress && sch.checklistProgress.total > 0 && (
                    <div className="mb-1 text-[11px] font-medium text-[#1b5e20] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        Documents: {sch.checklistProgress.completed}/{sch.checklistProgress.total} completed
                      </span>
                    </div>
                  )}

                  <ScholarshipCard
                    scholarship={sch}
                    onSelect={(id) => setSelectedScholarshipId(id)}
                    onSaveToggle={loadSaved}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Details Modal */}
      <ScholarshipDetailsModal
        scholarshipId={selectedScholarshipId}
        onClose={() => setSelectedScholarshipId(null)}
        onUpdated={loadSaved}
      />
    </div>
  );
}
