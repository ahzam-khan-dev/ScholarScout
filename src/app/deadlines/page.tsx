"use client";

import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { ScholarshipCard } from "@/components/ScholarshipCard";
import { ScholarshipDetailsModal } from "@/components/ScholarshipDetailsModal";
import { Clock, AlertTriangle, Calendar, CheckCircle, HelpCircle, RefreshCw } from "lucide-react";

export default function DeadlinesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"closingSoon" | "upcoming" | "unknown" | "expired">(
    "closingSoon"
  );
  const [selectedScholarshipId, setSelectedScholarshipId] = useState<string | null>(null);

  const loadDeadlines = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/deadlines");
      const json = await res.json();
      if (json.success) {
        setData(json);
        // If closing soon is empty, default to upcoming or unknown if available
        if (json.counts.closingSoon === 0 && json.counts.upcoming > 0) {
          setActiveTab("upcoming");
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeadlines();
  }, []);

  const counts = data?.counts || {
    closingSoon: 0,
    upcoming: 0,
    unknown: 0,
    expired: 0,
  };

  const currentList = data?.categories?.[activeTab] || [];

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#1d1d1f]">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between pb-6 border-b border-[#e0e0e0]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1d1d1f]">
              Application Deadline Tracker
            </h1>
            <p className="text-sm text-[#7a7a7a] mt-1">
              Timezone-accurate deadline tracking extracted directly from official guidelines
            </p>
          </div>

          <button
            onClick={loadDeadlines}
            className="p-2 rounded-full border border-[#e0e0e0] hover:bg-[#f5f5f7] transition-colors"
            title="Refresh deadlines"
          >
            <RefreshCw className={`w-4 h-4 text-[#7a7a7a] ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Tab Selection Row */}
        <div className="mt-8 flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#e0e0e0]">
          <button
            onClick={() => setActiveTab("closingSoon")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors ${
              activeTab === "closingSoon"
                ? "bg-[#fff8e1] text-[#b78103] border border-[#ffe082]"
                : "text-[#7a7a7a] hover:bg-[#f5f5f7]"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Closing Soon</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/80 text-[10px]">
              {counts.closingSoon}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("upcoming")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors ${
              activeTab === "upcoming"
                ? "bg-[#0066cc] text-white"
                : "text-[#7a7a7a] hover:bg-[#f5f5f7]"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Upcoming</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
              {counts.upcoming}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("unknown")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors ${
              activeTab === "unknown"
                ? "bg-[#1d1d1f] text-white"
                : "text-[#7a7a7a] hover:bg-[#f5f5f7]"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Rolling / Unspecified</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
              {counts.unknown}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("expired")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors ${
              activeTab === "expired"
                ? "bg-[#ffebee] text-[#c62828] border border-[#ffcdd2]"
                : "text-[#7a7a7a] hover:bg-[#f5f5f7]"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Expired</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/80 text-[10px]">
              {counts.expired}
            </span>
          </button>
        </div>

        {/* Content Section */}
        <div className="mt-6">
          {loading ? (
            <div className="py-24 text-center text-[#7a7a7a]">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0066cc]" />
              <p className="text-sm">Calculating deadline schedules...</p>
            </div>
          ) : currentList.length === 0 ? (
            <div className="apple-card p-12 text-center bg-[#fafafc]">
              <Clock className="w-8 h-8 text-[#7a7a7a] mx-auto mb-2 opacity-50" />
              <h3 className="font-semibold text-base text-[#1d1d1f]">No opportunities in this category</h3>
              <p className="text-xs text-[#7a7a7a] mt-1">
                {activeTab === "closingSoon" && "Good news! No active scholarships close within the next 14 days."}
                {activeTab === "upcoming" && "No future scheduled deadlines found yet."}
                {activeTab === "expired" && "No expired records found."}
                {activeTab === "unknown" && "All indexed opportunities have verified explicit deadlines."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {currentList.map((sch: any) => (
                <ScholarshipCard
                  key={sch.id}
                  scholarship={sch}
                  onSelect={(id) => setSelectedScholarshipId(id)}
                  onSaveToggle={loadDeadlines}
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
        onUpdated={loadDeadlines}
      />
    </div>
  );
}
