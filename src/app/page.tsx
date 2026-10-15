import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import {
  Compass,
  Search,
  CheckCircle2,
  Calendar,
  FileCheck,
  Shield,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-[#1d1d1f]">
      <Navigation />

      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 pt-20 pb-24 text-center max-w-4xl mx-auto flex flex-col items-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f0f4ff] text-[#0066cc] text-xs font-semibold mb-6 border border-[#d0e0fc]">
          <Sparkles className="w-3.5 h-3.5 text-[#0066cc]" />
          <span>Real Web Discovery Powered by TinyFish API</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-semibold tracking-[-0.03em] leading-[1.08] text-[#1d1d1f] max-w-3xl">
          Find scholarships that fit your future.
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-[#7a7a7a] max-w-2xl leading-relaxed font-normal">
          ScholarScout crawls official government, university, and foundation websites to discover
          authentic grants and scholarships matched to your exact academic profile.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/discover" className="btn-primary text-base py-3 px-7 shadow-sm">
            <span>Find My Scholarships</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/dashboard" className="btn-secondary text-base py-3 px-7">
            <span>Open Dashboard</span>
          </Link>
        </div>

        {/* Disclaimer Note */}
        <p className="mt-8 text-xs text-[#7a7a7a] max-w-lg mx-auto bg-[#f5f5f7] p-3 rounded-xl border border-[#e0e0e0]">
          <strong>Notice:</strong> Eligibility matches are computational estimates based on
          published criteria. Always verify exact deadlines and guidelines directly with official
          sponsors.
        </p>
      </section>

      {/* Feature Grid Section (Parchment background) */}
      <section className="bg-[#f5f5f7] py-20 px-4 sm:px-6 border-y border-[#e0e0e0]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-semibold tracking-tight text-[#1d1d1f]">
              Designed for student clarity and authenticity.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#7a7a7a]">
              No fabricated listings. No opaque AI guessing. Just clean extraction from official
              portals and deterministic eligibility rules.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-white p-7 rounded-[18px] border border-[#e0e0e0] flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-full bg-[#f0f4ff] text-[#0066cc] flex items-center justify-center mb-5">
                  <Search className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-[#1d1d1f] tracking-tight">
                  Official Web Discovery
                </h3>
                <p className="text-sm text-[#7a7a7a] mt-2 leading-relaxed">
                  Queries the TinyFish Search API for targeted government portals, university
                  faculties, and established foundations.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#f0f0f0] text-xs text-[#0066cc] font-medium flex items-center gap-1">
                <span>Verified .gov &amp; .edu sources</span>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-7 rounded-[18px] border border-[#e0e0e0] flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-full bg-[#f0f4ff] text-[#0066cc] flex items-center justify-center mb-5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-[#1d1d1f] tracking-tight">
                  Transparent Match Scoring
                </h3>
                <p className="text-sm text-[#7a7a7a] mt-2 leading-relaxed">
                  Deterministic eligibility rules compare your education level, discipline, CGPA,
                  and residency against published standards.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#f0f0f0] text-xs text-[#0066cc] font-medium flex items-center gap-1">
                <span>Zero hallucinations</span>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-7 rounded-[18px] border border-[#e0e0e0] flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-full bg-[#f0f4ff] text-[#0066cc] flex items-center justify-center mb-5">
                  <FileCheck className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-[#1d1d1f] tracking-tight">
                  Deadlines &amp; Checklists
                </h3>
                <p className="text-sm text-[#7a7a7a] mt-2 leading-relaxed">
                  Track upcoming closing dates and generate actionable document checklists directly
                  from requirements extracted by TinyFish Fetch.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#f0f0f0] text-xs text-[#0066cc] font-medium flex items-center gap-1">
                <span>Persisted in local database</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works / Workflow Walkthrough */}
      <section className="py-20 px-4 sm:px-6 max-w-5xl mx-auto">
        <h2 className="text-3xl font-semibold tracking-tight text-center text-[#1d1d1f] mb-12">
          How ScholarScout works
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 text-center">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-[#f5f5f7] border border-[#e0e0e0] flex items-center justify-center font-bold text-base mb-3 text-[#1d1d1f]">
              1
            </div>
            <h4 className="font-semibold text-sm">Build Profile</h4>
            <p className="text-xs text-[#7a7a7a] mt-1">Specify your degree, CGPA, field, and region.</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-[#f5f5f7] border border-[#e0e0e0] flex items-center justify-center font-bold text-base mb-3 text-[#1d1d1f]">
              2
            </div>
            <h4 className="font-semibold text-sm">TinyFish Search</h4>
            <p className="text-xs text-[#7a7a7a] mt-1">
              Discovers official pages and filters out commercial noise.
            </p>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-[#f5f5f7] border border-[#e0e0e0] flex items-center justify-center font-bold text-base mb-3 text-[#1d1d1f]">
              3
            </div>
            <h4 className="font-semibold text-sm">Clean Extraction</h4>
            <p className="text-xs text-[#7a7a7a] mt-1">
              TinyFish Fetch parses awards, deadlines, and criteria.
            </p>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-[#f5f5f7] border border-[#e0e0e0] flex items-center justify-center font-bold text-base mb-3 text-[#1d1d1f]">
              4
            </div>
            <h4 className="font-semibold text-sm">Apply with Confidence</h4>
            <p className="text-xs text-[#7a7a7a] mt-1">
              Track deadlines, check off documents, and apply officially.
            </p>
          </div>
        </div>

        <div className="mt-14 text-center">
          <Link href="/discover" className="btn-primary text-sm py-2.5 px-6">
            <span>Explore Opportunities</span>
            <Compass className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-[#f5f5f7] border-t border-[#e0e0e0] py-8 px-4 sm:px-6 text-center text-xs text-[#7a7a7a]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#1d1d1f]">ScholarScout</span>
            <span>&bull;</span>
            <span>Powered by TinyFish Search &amp; Fetch</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/profile" className="hover:underline">
              Student Profile
            </Link>
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            <Link href="/discover" className="hover:underline">
              Discovery Engine
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
