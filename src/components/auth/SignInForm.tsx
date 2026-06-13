"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithPassword } from "@/lib/auth-api";

function getSafeNext(value: string | null) {
  if (!value) return "/workspace/video";

  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("/") && !decoded.startsWith("//")) return decoded;
  } catch {
    if (value.startsWith("/") && !value.startsWith("//")) return value;
  }

  return "/workspace/video";
}

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => getSafeNext(searchParams.get("next")), [searchParams]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setStatus("Enter your email and password to continue.");
      return;
    }

    setIsLoading(true);

    try {
      await signInWithPassword(cleanEmail, password);
      setStatus("Signed in. Opening workspace...");
      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Sign in failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/[.045] p-6 shadow-2xl shadow-black/35 md:p-8">
      <div className="mb-7">
        <p className="text-xs font-black uppercase tracking-[.22em] text-[#ffcf83]">ShadowEdge account</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Sign in</h1>
        <p className="mt-3 text-sm leading-6 text-white/58">
          Use your ShadowEdge account to unlock uploads, video generation, credits, and history.
        </p>
      </div>

      <form className="grid gap-4" onSubmit={handleSubmit}>
        <label className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-[.16em] text-white/42">Email</span>
          <input
            autoComplete="email"
            className="h-12 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-semibold text-white outline-none transition placeholder:text-white/25 focus:border-[#ffb44d]/65 focus:ring-4 focus:ring-[#ffb44d]/10"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            type="email"
            value={email}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-[.16em] text-white/42">Password</span>
          <input
            autoComplete="current-password"
            className="h-12 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-semibold text-white outline-none transition placeholder:text-white/25 focus:border-[#ffb44d]/65 focus:ring-4 focus:ring-[#ffb44d]/10"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Your password"
            type="password"
            value={password}
          />
        </label>

        <button
          className="se-button-primary mt-2 h-12 rounded-2xl px-5 text-sm font-black focus:outline-none focus:ring-4 focus:ring-[#f6a935]/20"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {status ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/24 p-3 text-sm leading-6 text-white/72">
          {status}
        </div>
      ) : null}

      <div className="mt-6 flex items-center justify-between text-sm text-white/48">
        <Link className="font-bold text-[#ffcf83] hover:text-[#ffc766]" href="/">
          ShadowEdge
        </Link>
        <span>Next: {nextPath}</span>
      </div>
    </div>
  );
}
