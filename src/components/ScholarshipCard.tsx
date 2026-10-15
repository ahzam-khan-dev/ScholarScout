"use client";

import { useState } from "react";
import {
  Bookmark,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  Calendar,
  DollarSign,
  Building,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";

export interface ScholarshipCardProps {
  scholarship: {
    id: string;
    name: string;
    provider?: string | null;
    description?: string | null;
    sourceUrl: string;
    applicationUrl?: string | null;
    awardAmount?: number | null;
    awardCurrency?: string | null;
    awardFrequency?: string | null;
    deadline?: string | Date | null;
    deadlineRaw?: string | null;
    eligibleCountries?: string[];
    eligibleEducationLevels?: string[];
    eligibleFields?: string[];
    isSaved?: boolean;
    isDemo?: boolean;
    verificationStatus?: string;
    eligibility?: {
      overallStatus: "eligible" | "potential_match" | "not_eligible";
      matchScore: number;
      positiveReasons: string[];
      missingCriteria: string[];
    };
  };
  onSelect?: (id: string) => void;
  onSaveToggle?: (id: string, saved: boolean) => void;
}

export function ScholarshipCard({
  scholarship,
  onSelect,
  onSaveToggle,
}: ScholarshipCardProps) {
  const [isSaved, setIsSaved] = useState(scholarship.isSaved || false);
  const [isSaving, setIsSaving] = useState(false);

  const eligibility = scholarship.eligibility || {
    overallStatus: "potential_match",
    matchScore: 50,
    positiveReasons: [],
    missingCriteria: [],
  };

  const handleSaveToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaving) return;

    const nextState = !isSaved;
    setIsSaved(nextState);
    setIsSaving(true);

    try {
      if (nextState) {
        await fetch(`/api/scholarships/${scholarship.id}/save`, {
          method: "POST",
        });
      } else {
        await fetch(`/api/scholarships/${scholarship.id}/save`, {
          method: "DELETE",
        });
      }
      onSaveToggle?.(scholarship.id, nextState);
    } catch {
      setIsSaved(!nextState); // revert on failure
    } finally {
      setIsSaving(false);
    }
  };

  const formattedAmount = scholarship.awardAmount
    ? `${scholarship.awardCurrency || "$"}${scholarship.awardAmount.toLocaleString()} ${
        scholarship.awardFrequency ? `(${scholarship.awardFrequency})` : ""
      }`
    : scholarship.awardFrequency === "full tuition"
    ? "Full Tuition Coverage"
    : "Not specified";

  let formattedDeadline = "Not specified";
  if (scholarship.deadline) {
    try {
      formattedDeadline = format(new Date(scholarship.deadline), "MMMM d, yyyy");
    } catch {
      formattedDeadline = scholarship.deadlineRaw || "Not specified";
    }
  } else if (scholarship.deadlineRaw) {
    formattedDeadline = scholarship.deadlineRaw;
  }

  // Eligibility status pill color
  const statusConfig = {
    eligible: {
      label: "Eligible Match",
      icon: CheckCircle2,
      badgeClass: "bg-[#e8f5e9] text-[#1b5e20] border-[#c8e6c9]",
    },
    potential_match: {
      label: "Potential Match",
      icon: HelpCircle,
      badgeClass: "bg-[#fff8e1] text-[#b78103] border-[#ffe082]",
    },
    not_eligible: {
      label: "Ineligible",
      icon: XCircle,
      badgeClass: "bg-[#ffebee] text-[#c62828] border-[#ffcdd2]",
    },
  }[eligibility.overallStatus];

  const StatusIcon = statusConfig.icon;

  return (
    <div
      onClick={() => onSelect?.(scholarship.id)}
      className="apple-card p-5 sm:p-6 transition-all hover:shadow-sm cursor-pointer flex flex-col justify-between group"
    >
      <div>
        {/* Header row: Match score, Status Badge, Demo indicator, Save button */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Match Percentage */}
            <span className="inline-flex items-center gap-1 font-semibold text-xs px-2.5 py-1 rounded-full bg-[#f0f4ff] text-[#0066cc] border border-[#d0e0fc]">
              <Sparkles className="w-3 h-3 text-[#0066cc]" />
              {eligibility.matchScore}% Match
            </span>

            {/* Status Badge */}
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${statusConfig.badgeClass}`}
            >
              <StatusIcon className="w-3 h-3" />
              {statusConfig.label}
            </span>

            {/* Demo indicator */}
            {scholarship.isDemo && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#f5f5f7] text-[#7a7a7a] border border-[#e0e0e0]">
                Sample Demo
              </span>
            )}
          </div>

          {/* Bookmark Button */}
          <button
            onClick={handleSaveToggle}
            disabled={isSaving}
            className={`p-2 rounded-full transition-colors ${
              isSaved
                ? "bg-[#0066cc] text-white"
                : "bg-[#f5f5f7] text-[#1d1d1f]/60 hover:text-[#1d1d1f] hover:bg-[#e5e5e7]"
            }`}
            title={isSaved ? "Saved" : "Save scholarship"}
          >
            <Bookmark className="w-4 h-4 fill-current" />
          </button>
        </div>

        {/* Title & Provider */}
        <h3 className="text-lg font-semibold text-[#1d1d1f] tracking-tight group-hover:text-[#0066cc] transition-colors line-clamp-2">
          {scholarship.name}
        </h3>

        {scholarship.provider && (
          <p className="flex items-center gap-1.5 text-xs text-[#7a7a7a] mt-1 font-medium">
            <Building className="w-3.5 h-3.5" />
            <span className="truncate">{scholarship.provider}</span>
          </p>
        )}

        {/* Key Metrics: Amount and Deadline */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-[#f0f0f0] text-xs">
          <div>
            <span className="text-[#7a7a7a] block text-[11px]">Award Amount</span>
            <span className="font-semibold text-[#1d1d1f] flex items-center gap-1 mt-0.5">
              <DollarSign className="w-3 h-3 text-[#0066cc]" />
              <span className="truncate">{formattedAmount}</span>
            </span>
          </div>

          <div>
            <span className="text-[#7a7a7a] block text-[11px]">Application Deadline</span>
            <span className="font-semibold text-[#1d1d1f] flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3 text-[#7a7a7a]" />
              <span className="truncate">{formattedDeadline}</span>
            </span>
          </div>
        </div>

        {/* Match Reasons */}
        {eligibility.positiveReasons.length > 0 && (
          <div className="mt-3.5 space-y-1">
            <span className="text-[11px] font-medium text-[#7a7a7a] uppercase tracking-wider block">
              Why it matches:
            </span>
            {eligibility.positiveReasons.slice(0, 2).map((reason, idx) => (
              <p
                key={idx}
                className="text-xs text-[#1d1d1f]/80 flex items-start gap-1.5 leading-snug"
              >
                <CheckCircle2 className="w-3 h-3 text-[#1b5e20] shrink-0 mt-0.5" />
                <span>{reason}</span>
              </p>
            ))}
          </div>
        )}

        {/* Missing or Unverified Criteria */}
        {eligibility.missingCriteria.length > 0 && (
          <div className="mt-2.5 space-y-1">
            {eligibility.missingCriteria.slice(0, 1).map((miss, idx) => (
              <p
                key={idx}
                className="text-[11px] text-[#b78103] flex items-start gap-1.5 leading-snug"
              >
                <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                <span className="truncate">{miss}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-5 pt-3 border-t border-[#f0f0f0] flex items-center justify-between gap-2">
        <button
          onClick={() => onSelect?.(scholarship.id)}
          className="text-xs font-medium text-[#0066cc] hover:underline flex items-center gap-1"
        >
          View Full Details
        </button>

        <a
          href={scholarship.applicationUrl || scholarship.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="btn-ghost-pill text-xs py-1 px-3 flex items-center gap-1 text-[#1d1d1f]"
        >
          <span>{scholarship.applicationUrl ? "Apply Official" : "Official Source"}</span>
          <ExternalLink className="w-3 h-3 text-[#7a7a7a]" />
        </a>
      </div>
    </div>
  );
}
