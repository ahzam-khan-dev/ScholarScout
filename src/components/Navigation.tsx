"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, Compass, Bookmark, Clock, User, Sparkles } from "lucide-react";

export function Navigation() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: Sparkles },
    { href: "/discover", label: "Discover", icon: Compass },
    { href: "/saved", label: "Saved", icon: Bookmark },
    { href: "/deadlines", label: "Deadlines", icon: Clock },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <header className="sticky top-0 z-40 w-full frosted-bar">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-[#0066cc] flex items-center justify-center text-white transition-transform group-hover:scale-105">
            <GraduationCap className="w-4 h-4" />
          </div>
          <span className="font-semibold text-lg tracking-tight text-[#1d1d1f]">
            Scholar<span className="text-[#0066cc]">Scout</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[14px] transition-colors ${
                  isActive
                    ? "bg-[#1d1d1f] text-white font-medium"
                    : "text-[#1d1d1f]/75 hover:text-[#1d1d1f] hover:bg-[#f0f0f2]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-2">
          <Link href="/discover" className="btn-primary text-xs sm:text-sm py-1.5 px-4">
            <Compass className="w-3.5 h-3.5" />
            <span>Discover</span>
          </Link>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden border-t border-[#e0e0e0]/60 bg-[#ffffff]/90 px-4 py-2 flex items-center justify-around text-xs">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg ${
                isActive ? "text-[#0066cc] font-medium" : "text-[#7a7a7a]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
