"use client";

import { useEffect, useState } from "react";
import {
  X,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  Calendar,
  DollarSign,
  Building,
  GraduationCap,
  Globe,
  FileText,
  ShieldCheck,
  CheckSquare,
  Square,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";

export interface ScholarshipDetailsModalProps {
  scholarshipId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export function ScholarshipDetailsModal({
  scholarshipId,
  onClose,
  onUpdated,
}: ScholarshipDetailsModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<any[]>([]);

  useEffect(() => {
    if (!scholarshipId) return;

    setLoading(true);
    setError(null);

    fetch(`/api/scholarships/${scholarshipId}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setData(res.scholarship);
          setChecklist(res.scholarship.checklists || []);
        } else {
          setError(res.error || "Failed to load details");
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [scholarshipId]);

  if (!scholarshipId) return null;

  const handleToggleChecklistItem = async (itemId: string, currentState: boolean) => {
    const nextState = !currentState;
    setChecklist((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, isComplete: nextState } : item))
    );

    try {
      await fetch(`/api/checklist/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isComplete: nextState }),
      });
      onUpdated?.();
    } catch {
      // Revert on failure
      setChecklist((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, isComplete: currentState } : item))
      );
    }
  };

  const handleRefresh = async () => {
    if (!scholarshipId || refreshing) return;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/scholarships/${scholarshipId}/refresh`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        setData(json.scholarship);
        onUpdated?.();
      } else {
        alert(json.error || "Failed to refresh source");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const sch = data;
  const eligibility = sch?.eligibility;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-3xl max-h-[92vh] rounded-[22px] shadow-2xl border border-[#e0e0e0] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#f0f0f0] flex items-start justify-between gap-4 bg-[#fafafc]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {sch?.isDemo && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#f5f5f7] text-[#7a7a7a] border border-[#e0e0e0]">
                  Demo Sample
                </span>
              )}
              {sch?.verificationStatus && (
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#e8f5e9] text-[#1b5e20] flex items-center gap-1 border border-[#c8e6c9]">
                  <ShieldCheck className="w-3 h-3" />
                  {sch.verificationStatus}
                </span>
              )}
              {eligibility && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#f0f4ff] text-[#0066cc] border border-[#d0e0fc] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#0066cc]" />
                  {eligibility.matchScore}% Match ({eligibility.overallStatus})
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1d1d1f]">
              {loading ? "Loading scholarship details..." : sch?.name}
            </h2>

            {sch?.provider && (
              <p className="text-xs sm:text-sm text-[#7a7a7a] mt-1 flex items-center gap-1 font-medium">
                <Building className="w-4 h-4 text-[#7a7a7a]" />
                <span>{sch.provider}</span>
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#e5e5e7] transition-colors text-[#1d1d1f]/60 hover:text-[#1d1d1f]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-sm text-[#1d1d1f]">
          {loading && (
            <div className="py-16 text-center text-[#7a7a7a]">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0066cc]" />
              <p>Fetching full opportunity criteria and requirements...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-[#ffebee] border border-[#ffcdd2] rounded-xl text-xs text-[#c62828]">
              {error}
            </div>
          )}

          {sch && !loading && (
            <>
              {/* Quick Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#f5f5f7] p-4 rounded-xl border border-[#e0e0e0]/60">
                <div>
                  <span className="text-[#7a7a7a] block text-xs">Award</span>
                  <span className="font-semibold text-sm flex items-center gap-1 mt-0.5">
                    <DollarSign className="w-3.5 h-3.5 text-[#0066cc]" />
                    {sch.awardAmount
                      ? `${sch.awardCurrency || "$"}${sch.awardAmount.toLocaleString()}`
                      : sch.awardFrequency || "Not specified"}
                  </span>
                </div>

                <div>
                  <span className="text-[#7a7a7a] block text-xs">Deadline</span>
                  <span className="font-semibold text-sm flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-[#7a7a7a]" />
                    {sch.deadline
                      ? format(new Date(sch.deadline), "MMM d, yyyy")
                      : sch.deadlineRaw || "Not specified"}
                  </span>
                </div>

                <div>
                  <span className="text-[#7a7a7a] block text-xs">Education Level</span>
                  <span className="font-semibold text-sm flex items-center gap-1 mt-0.5 capitalize">
                    <GraduationCap className="w-3.5 h-3.5 text-[#7a7a7a]" />
                    {sch.eligibleEducationLevels?.length > 0
                      ? sch.eligibleEducationLevels.join(", ")
                      : "Open"}
                  </span>
                </div>

                <div>
                  <span className="text-[#7a7a7a] block text-xs">Eligibility Region</span>
                  <span className="font-semibold text-sm flex items-center gap-1 mt-0.5">
                    <Globe className="w-3.5 h-3.5 text-[#7a7a7a]" />
                    {sch.eligibleCountries?.length > 0
                      ? sch.eligibleCountries.join(", ")
                      : "International"}
                  </span>
                </div>
              </div>

              {/* Description & Overview */}
              {sch.description && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#7a7a7a] mb-2">
                    Opportunity Description
                  </h4>
                  <p className="text-[#1d1d1f]/90 leading-relaxed text-sm bg-white p-3.5 rounded-xl border border-[#e0e0e0]">
                    {sch.description}
                  </p>
                </div>
              )}

              {/* Inferred Eligibility Engine Breakdown */}
              {eligibility && (
                <div className="border border-[#e0e0e0] rounded-2xl p-4 bg-[#fafafc]">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-sm text-[#1d1d1f] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#0066cc]" />
                      Personalized Eligibility Breakdown
                    </h4>
                    <span className="text-xs text-[#7a7a7a]">
                      Evaluated against your active profile
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {Object.entries(eligibility.criteria || {}).map(([key, crit]: any) => {
                      const icons: any = {
                        met: <CheckCircle2 className="w-4 h-4 text-[#1b5e20] shrink-0" />,
                        not_met: <XCircle className="w-4 h-4 text-[#c62828] shrink-0" />,
                        unknown: <HelpCircle className="w-4 h-4 text-[#b78103] shrink-0" />,
                        not_applicable: <CheckCircle2 className="w-4 h-4 text-[#7a7a7a] shrink-0" />,
                      };

                      return (
                        <div
                          key={key}
                          className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white border border-[#f0f0f0]"
                        >
                          {icons[crit.status] || icons.unknown}
                          <div className="flex-1">
                            <span className="font-medium text-[#1d1d1f] capitalize">
                              {key.replace(/([A-Z])/g, " $1")}:{" "}
                            </span>
                            <span className="text-[#7a7a7a]">{crit.explanation}</span>
                          </div>
                          <span className="font-mono text-[11px] text-[#7a7a7a]">
                            +{crit.scoreContribution}/{crit.weight} pts
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Document Checklist */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#7a7a7a]">
                    Application Document Checklist
                  </h4>
                  <span className="text-[11px] text-[#7a7a7a]">
                    Extracted from published guidelines
                  </span>
                </div>

                {checklist.length === 0 ? (
                  <p className="text-xs text-[#7a7a7a] italic p-3 bg-[#f5f5f7] rounded-xl border border-[#e0e0e0]">
                    No specific documents are explicitly mandated on the source page. Standard
                    transcripts and identification may still be requested.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {checklist.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleToggleChecklistItem(item.id, item.isComplete)}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          item.isComplete
                            ? "bg-[#e8f5e9]/40 border-[#c8e6c9] text-[#1b5e20]"
                            : "bg-white border-[#e0e0e0] text-[#1d1d1f] hover:border-[#b0b0b5]"
                        }`}
                      >
                        {item.isComplete ? (
                          <CheckSquare className="w-4 h-4 text-[#1b5e20] shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-[#7a7a7a] shrink-0" />
                        )}
                        <span
                          className={`text-xs font-medium flex-1 ${
                            item.isComplete ? "line-through opacity-75" : ""
                          }`}
                        >
                          {item.documentName}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f5f5f7] text-[#7a7a7a]">
                          {item.isComplete ? "Completed" : "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Provenance & Source Metadata */}
              <div className="p-3.5 bg-[#f5f5f7] rounded-xl border border-[#e0e0e0] text-xs text-[#7a7a7a] space-y-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span>
                    Last verified:{" "}
                    {sch.lastVerifiedAt
                      ? format(new Date(sch.lastVerifiedAt), "MMMM d, yyyy 'at' h:mm a")
                      : "Recently"}
                  </span>
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-1 text-[#0066cc] font-medium hover:underline"
                  >
                    <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
                    <span>{refreshing ? "Re-fetching..." : "Refresh details from source"}</span>
                  </button>
                </div>

                {sch.sourceExcerpt && (
                  <p className="text-[11px] text-[#1d1d1f]/60 pt-1 border-t border-[#e0e0e0]/50 italic">
                    &ldquo;{sch.sourceExcerpt}&rdquo;
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[#f0f0f0] bg-[#fafafc] flex items-center justify-between gap-3">
          <div className="text-xs text-[#7a7a7a]">
            Always verify requirements on the official website.
          </div>

          <div className="flex items-center gap-2">
            <a
              href={sch?.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs py-2 px-4"
            >
              <span>Source Page</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <a
              href={sch?.applicationUrl || sch?.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-xs py-2 px-4"
            >
              <span>{sch?.applicationUrl ? "Go to Application" : "Visit Portal"}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
