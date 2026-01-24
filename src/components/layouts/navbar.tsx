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
  { name: "Pricing", href: "/pricing" },
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
                  <DropdownMenu>
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
                      href="/register"
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
        {/* Mobile Menu Overlay */}
        <div
          className={`fixed inset-0 z-40 bg-white/95 backdrop-blur-sm transition-all duration-300 md:hidden ${
            isMobileMenuOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }`}
          style={{ top: "60px" }}
        >
          <div className="space-y-1 border-t border-slate-100 px-4 pt-4 pb-3">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block rounded-lg px-3 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-indigo-600"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}

            {isPending ? null : session ? (
              <div className="mt-6 border-t border-slate-100 pt-6">
                <div className="mb-4 flex items-center px-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={session.user.image || undefined}
                      alt={session.user.name || session.user.email || "User"}
                    />
                    <AvatarFallback className="bg-slate-100 text-slate-600">
                      {getInitials(session.user.name, session.user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-3">
                    {session.user.name && (
                      <div className="text-base font-medium text-slate-900">
                        {session.user.name}
                      </div>
                    )}
                    <div className="text-sm font-medium text-slate-500">
                      {session.user.email}
                    </div>
                  </div>
                </div>
                <Link
                  href="/dashboard"
                  className="flex items-center rounded-lg px-3 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <LayoutDashboard className="mr-3 h-5 w-5 text-slate-400" />
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/account"
                  className="flex items-center rounded-lg px-3 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <User className="mr-3 h-5 w-5 text-slate-400" />
                  Account
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex w-full items-center rounded-lg px-3 py-3 text-base font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut className="mr-3 h-5 w-5" />
                  Sign out
                </button>
              </div>
            ) : (
              <div className="mt-6 space-y-3 border-t border-slate-100 px-3 pt-6">
                <Link
                  href="/login"
                  className="block w-full rounded-lg border border-slate-200 px-3 py-3 text-center text-base font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="block w-full rounded-lg bg-indigo-600 px-3 py-3 text-center text-base font-medium text-white shadow-md transition-colors hover:bg-indigo-700"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
      {/* Spacer to prevent content from going under fixed navbar */}
      <div className="h-16 md:h-20" />
    </>
  );
}
