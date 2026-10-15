"use client";

import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { User, CheckCircle2, Save, RefreshCw, AlertCircle } from "lucide-react";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>({
    name: "",
    country: "United States",
    region: "",
    educationLevel: "undergraduate",
    degree: "",
    fieldOfStudy: "Computer Science",
    yearOfStudy: 1,
    institution: "",
    academicScore: "",
    gradingScale: "gpa_4_0",
    annualFamilyIncome: "",
    incomeCurrency: "USD",
    residencyStatus: "citizen",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.profile) {
          setProfile({
            ...res.profile,
            academicScore: res.profile.academicScore ?? "",
            annualFamilyIncome: res.profile.annualFamilyIncome ?? "",
            yearOfStudy: res.profile.yearOfStudy ?? 1,
          });
        }
      })
      .catch((err) => {
        setMessage({ type: "error", text: "Failed to load student profile" });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        ...profile,
        yearOfStudy: profile.yearOfStudy ? parseInt(profile.yearOfStudy, 10) : null,
        academicScore: profile.academicScore !== "" ? parseFloat(profile.academicScore) : null,
        annualFamilyIncome:
          profile.annualFamilyIncome !== "" ? parseFloat(profile.annualFamilyIncome) : null,
      };

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setMessage({
          type: "success",
          text: "Profile updated successfully! All scholarship match scores and recommendations have been recalculated.",
        });
      } else {
        setMessage({ type: "error", text: json.error || "Failed to save profile" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Network error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#1d1d1f]">
      <Navigation />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="pb-6 border-b border-[#e0e0e0]">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1d1d1f]">
            Student Academic Profile
          </h1>
          <p className="text-sm text-[#7a7a7a] mt-1">
            Personalize your criteria to evaluate scholarship eligibility and compute transparent
            match scores
          </p>
        </div>

        {message && (
          <div
            className={`mt-6 p-4 rounded-xl flex items-center gap-2.5 text-xs font-medium ${
              message.type === "success"
                ? "bg-[#e8f5e9] text-[#1b5e20] border border-[#c8e6c9]"
                : "bg-[#ffebee] text-[#c62828] border border-[#ffcdd2]"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center text-[#7a7a7a]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0066cc]" />
            <p className="text-sm">Loading your profile...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {/* Basic Info */}
            <div className="apple-card p-6 space-y-4">
              <h3 className="font-semibold text-base text-[#1d1d1f] flex items-center gap-2">
                <User className="w-4 h-4 text-[#0066cc]" />
                Personal Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-medium text-[#7a7a7a] block mb-1">
                    Full Name (Optional)
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={profile.name || ""}
                    onChange={handleChange}
                    placeholder="e.g. Alex Rivera"
                    className="w-full px-3 py-2 bg-white border border-[#e0e0e0] rounded-lg text-[#1d1d1f] focus:outline-none focus:border-[#0066cc]"
                  />
                </div>

                <div>
                  <label className="font-medium text-[#7a7a7a] block mb-1">
                    Country of Residence <span className="text-[#0066cc]">*</span>
                  </label>
                  <input
                    type="text"
                    name="country"
                    required
                    value={profile.country || ""}
                    onChange={handleChange}
                    placeholder="e.g. United States, India, Canada"
                    className="w-full px-3 py-2 bg-white border border-[#e0e0e0] rounded-lg text-[#1d1d1f] focus:outline-none focus:border-[#0066cc]"
                  />
                </div>

                <div>
                  <label className="font-medium text-[#7a7a7a] block mb-1">
                    State / Region (Optional)
                  </label>
                  <input
                    type="text"
                    name="region"
                    value={profile.region || ""}
                    onChange={handleChange}
                    placeholder="e.g. California, Ontario, Maharashtra"
                    className="w-full px-3 py-2 bg-white border border-[#e0e0e0] rounded-lg text-[#1d1d1f] focus:outline-none focus:border-[#0066cc]"
                  />
                </div>

                <div>
                  <label className="font-medium text-[#7a7a7a] block mb-1">
                    Residency / Citizenship Status
                  </label>
                  <select
                    name="residencyStatus"
                    value={profile.residencyStatus || "citizen"}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-[#e0e0e0] rounded-lg text-[#1d1d1f] focus:outline-none focus:border-[#0066cc]"
                  >
                    <option value="citizen">Citizen</option>
                    <option value="permanent_resident">Permanent Resident / Green Card</option>
                    <option value="international_student">International Student (F1 / Study Visa)</option>
                    <option value="other">Other / Undocumented</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="apple-card p-6 space-y-4">
              <h3 className="font-semibold text-base text-[#1d1d1f]">Academic Background</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-medium text-[#7a7a7a] block mb-1">
                    Education Level <span className="text-[#0066cc]">*</span>
                  </label>
                  <select
                    name="educationLevel"
                    required
                    value={profile.educationLevel || "undergraduate"}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-[#e0e0e0] rounded-lg text-[#1d1d1f] focus:outline-none focus:border-[#0066cc]"
                  >
                    <option value="undergraduate">Undergraduate (Bachelor's)</option>
                    <option value="graduate">Graduate (Master's)</option>
                    <option value="doctorate">Doctorate (Ph.D.)</option>
                    <option value="high_school">High School Senior</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-[#7a7a7a] block mb-1">
                    Field of Study <span className="text-[#0066cc]">*</span>
                  </label>
                  <input
                    type="text"
                    name="fieldOfStudy"
                    required
                    value={profile.fieldOfStudy || ""}
                    onChange={handleChange}
                    placeholder="e.g. Computer Science, Mechanical Engineering"
                    className="w-full px-3 py-2 bg-white border border-[#e0e0e0] rounded-lg text-[#1d1d1f] focus:outline-none focus:border-[#0066cc]"
                  />
                </div>

                <div>
                  <label className="font-medium text-[#7a7a7a] block mb-1">
                    Degree or Program Name (Optional)
                  </label>
                  <input
                    type="text"
                    name="degree"
                    value={profile.degree || ""}
                    onChange={handleChange}
                    placeholder="e.g. Bachelor of Science in AI"
                    className="w-full px-3 py-2 bg-white border border-[#e0e0e0] rounded-lg text-[#1d1d1f] focus:outline-none focus:border-[#0066cc]"
                  />
                </div>

                <div>
                  <label className="font-medium text-[#7a7a7a] block mb-1">
                    Current Year of Study
                  </label>
                  <select
                    name="yearOfStudy"
                    value={profile.yearOfStudy || 1}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-[#e0e0e0] rounded-lg text-[#1d1d1f] focus:outline-none focus:border-[#0066cc]"
                  >
                    <option value={1}>1st Year (Freshman)</option>
                    <option value={2}>2nd Year (Sophomore)</option>
                    <option value={3}>3rd Year (Junior)</option>
                    <option value={4}>4th Year (Senior)</option>
                    <option value={5}>5th+ Year / Postgrad</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-[#7a7a7a] block mb-1">
                    Academic Grading Scale
                  </label>
                  <select
                    name="gradingScale"
                    value={profile.gradingScale || "gpa_4_0"}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-[#e0e0e0] rounded-lg text-[#1d1d1f] focus:outline-none focus:border-[#0066cc]"
                  >
                    <option value="gpa_4_0">GPA (4.0 Scale)</option>
                    <option value="gpa_10_0">CGPA (10.0 Scale)</option>
                    <option value="percentage_100">Percentage (0-100%)</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-[#7a7a7a] block mb-1">
                    Academic Score / CGPA (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="academicScore"
                    value={profile.academicScore}
                    onChange={handleChange}
                    placeholder="e.g. 3.8 or 85"
                    className="w-full px-3 py-2 bg-white border border-[#e0e0e0] rounded-lg text-[#1d1d1f] focus:outline-none focus:border-[#0066cc]"
                  />
                </div>
              </div>
            </div>

            {/* Financial & Need-Based Criteria */}
            <div className="apple-card p-6 space-y-4">
              <h3 className="font-semibold text-base text-[#1d1d1f]">
                Need-Based &amp; Financial Information (Optional)
              </h3>
              <p className="text-xs text-[#7a7a7a]">
                Used exclusively to verify eligibility for need-based grants with published income
                thresholds. Never shared with external parties.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-medium text-[#7a7a7a] block mb-1">
                    Annual Family Income (Optional)
                  </label>
                  <input
                    type="number"
                    name="annualFamilyIncome"
                    value={profile.annualFamilyIncome}
                    onChange={handleChange}
                    placeholder="e.g. 50000"
                    className="w-full px-3 py-2 bg-white border border-[#e0e0e0] rounded-lg text-[#1d1d1f] focus:outline-none focus:border-[#0066cc]"
                  />
                </div>

                <div>
                  <label className="font-medium text-[#7a7a7a] block mb-1">Income Currency</label>
                  <select
                    name="incomeCurrency"
                    value={profile.incomeCurrency || "USD"}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-[#e0e0e0] rounded-lg text-[#1d1d1f] focus:outline-none focus:border-[#0066cc]"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary text-sm py-2 px-6 shadow-sm flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Profile &amp; Recalculate Matches</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
