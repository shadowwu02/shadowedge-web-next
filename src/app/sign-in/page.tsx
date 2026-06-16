import { Suspense } from "react";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { SignInForm } from "@/components/auth/SignInForm";

export default function SignInPage() {
  return (
    <AuthPageShell mode="signIn">
      <Suspense fallback={<div className="rounded-[28px] border border-white/10 bg-white/[.045] p-8 text-white/62">Loading sign in...</div>}>
        <SignInForm />
      </Suspense>
    </AuthPageShell>
  );
}
