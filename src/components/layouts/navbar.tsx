"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { PlauderaLogo } from "@/components/plaudera-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { appConfig } from "@/lib/config";
import { useSession, signOut } from "@/lib/auth-client";

const navigation = [
  { name: "Features", href: "/#features" },
  { name: "Pricing", href: "/#pricing" },
  { name: "Blog", href: "/blog" },
];

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return "U";
}

export function Navbar() {
  const { data: session, isPending } = useSession();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ease-in-out ${
          isScrolled || isMobileMenuOpen
            ? "border-b border-slate-200/60 bg-white/90 py-3 shadow-sm backdrop-blur-md"
            : "bg-transparent py-5"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex shrink-0 items-center">
              <Link href="/" className="group flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md transition-transform group-hover:scale-105">
                  <PlauderaLogo />
                </div>
                <span className="text-lg font-bold tracking-tight text-slate-900 transition-colors">
                  {appConfig.name}
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden items-center space-x-8 md:flex">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-indigo-600"
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Right Side - Auth & Mobile Menu Button */}
            <div className="flex items-center gap-4">
              {/* Desktop Auth */}
              <div className="hidden items-center gap-4 md:flex">
                {isPending ? null : session ? (
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pr-3 pl-1 transition-all hover:border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={session.user.image || undefined}
                            alt={
                              session.user.name || session.user.email || "User"
                            }
                          />
                          <AvatarFallback className="bg-slate-100 text-slate-600">
                            {getInitials(session.user.name, session.user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-slate-700">
                          Account
                        </span>
                        <ChevronDown className="h-3 w-3 text-slate-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-56 rounded-xl"
                      align="end"
                      forceMount
                    >
                      <DropdownMenuLabel className="border-b border-slate-100 px-3 py-2 font-normal">
                        <div className="flex flex-col space-y-1">
                          {session.user.name && (
                            <p className="text-sm font-medium text-slate-900">
                              {session.user.name}
                            </p>
                          )}
                          <p className="truncate text-xs text-slate-500">
                            {session.user.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50"
                        >
                          <LayoutDashboard className="h-4 w-4 text-slate-400" />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/dashboard/account"
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50"
                        >
                          <User className="h-4 w-4 text-slate-400" />
                          Account
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-slate-100" />
                      <DropdownMenuItem
                        onClick={() => signOut()}
                        className="cursor-pointer rounded-lg px-3 py-2 text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/signup"
                      className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-slate-800 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:outline-none"
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>

              {/* Mobile menu button */}
              <div className="flex md:hidden">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="inline-flex items-center justify-center rounded-md p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none"
                  aria-expanded={isMobileMenuOpen}
                >
                  <span className="sr-only">Open main menu</span>
                  {isMobileMenuOpen ? (
                    <X className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Menu className="block h-6 w-6" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay - Outside nav to avoid stacking context issues */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-x-0 top-[60px] bottom-0 z-[100] bg-slate-50 md:hidden"
          style={{ backgroundColor: "#f8fafc" }}
        >
          <div className="h-full overflow-y-auto border-t border-slate-200/60 p-4">
            {/* Navigation Card */}
            <div className="animate-in fade-in slide-in-from-top-2 rounded-2xl border border-slate-100 bg-white shadow-sm duration-200">
              {navigation.map((item, index) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center justify-between px-4 py-3.5 text-base font-medium text-slate-700 transition-all duration-150 hover:bg-indigo-50 hover:text-indigo-600 ${
                    index === 0 ? "rounded-t-2xl" : ""
                  } ${index === navigation.length - 1 ? "rounded-b-2xl" : "border-b border-slate-100"}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <span>{item.name}</span>
                  <ChevronRight className="h-4 w-4 text-slate-400 transition-colors group-hover:text-indigo-500" />
                </Link>
              ))}
            </div>

            {isPending ? null : session ? (
              <>
                {/* User Card */}
                <div
                  className="animate-in fade-in slide-in-from-top-2 mt-4 rounded-2xl border border-slate-100 bg-white shadow-sm duration-200"
                  style={{ animationDelay: "150ms" }}
                >
                  {/* User Info */}
                  <div className="flex items-center gap-4 border-b border-slate-100 px-4 py-4">
                    <Avatar className="h-14 w-14 ring-2 ring-slate-100">
                      <AvatarImage
                        src={session.user.image || undefined}
                        alt={session.user.name || session.user.email || "User"}
                      />
                      <AvatarFallback className="bg-indigo-50 text-lg font-semibold text-indigo-600">
                        {getInitials(session.user.name, session.user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      {session.user.name && (
                        <div className="truncate text-base font-semibold text-slate-900">
                          {session.user.name}
                        </div>
                      )}
                      <div className="truncate text-sm text-slate-500">
                        {session.user.email}
                      </div>
                    </div>
                  </div>
                  {/* Dashboard Link */}
                  <Link
                    href="/dashboard"
                    className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 text-base font-medium text-slate-700 transition-all duration-150 hover:bg-indigo-50 hover:text-indigo-600"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 transition-colors group-hover:bg-indigo-100">
                        <LayoutDashboard className="h-5 w-5 text-slate-500" />
                      </div>
                      <span>Dashboard</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </Link>
                  {/* Account Link */}
                  <Link
                    href="/dashboard/account"
                    className="flex items-center justify-between rounded-b-2xl px-4 py-3.5 text-base font-medium text-slate-700 transition-all duration-150 hover:bg-indigo-50 hover:text-indigo-600"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 transition-colors group-hover:bg-indigo-100">
                        <User className="h-5 w-5 text-slate-500" />
                      </div>
                      <span>Account</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </Link>
                </div>

                {/* Sign Out Card */}
                <div
                  className="animate-in fade-in slide-in-from-top-2 mt-4 rounded-2xl border border-slate-100 bg-white shadow-sm duration-200"
                  style={{ animationDelay: "200ms" }}
                >
                  <button
                    onClick={() => {
                      signOut();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-base font-medium text-slate-500 transition-all duration-150 hover:bg-red-50 hover:text-red-600"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 transition-colors">
                        <LogOut className="h-5 w-5 text-slate-400" />
                      </div>
                      <span>Sign out</span>
                    </div>
                  </button>
                </div>
              </>
            ) : (
              /* Logged Out State */
              <div
                className="animate-in fade-in slide-in-from-top-2 mt-6 duration-200"
                style={{ animationDelay: "150ms" }}
              >
                <div className="mb-3 text-center">
                  <Link
                    href="/login"
                    className="text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Already have an account?{" "}
                    <span className="text-indigo-600">Sign in</span>
                  </Link>
                </div>
                <Link
                  href="/signup"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all duration-200 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/30 active:scale-[0.98]"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span>Get Started</span>
                  <ChevronRight className="h-5 w-5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Spacer to prevent content from going under fixed navbar */}
      <div className="h-16 md:h-20" />
    </>
  );
}
