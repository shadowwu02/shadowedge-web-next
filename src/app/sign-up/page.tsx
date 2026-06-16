import { Suspense } from "react";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { SignUpForm } from "@/components/auth/SignUpForm";

export default function SignUpPage() {
  return (
    <AuthPageShell mode="signUp">
      <Suspense fallback={<div className="rounded-[28px] border border-white/10 bg-white/[.045] p-8 text-white/62">Loading sign up...</div>}>
        <SignUpForm />
      </Suspense>
    </AuthPageShell>
  );
}
