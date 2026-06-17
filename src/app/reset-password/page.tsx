import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <AuthPageShell mode="resetPassword">
      <ResetPasswordForm />
    </AuthPageShell>
  );
}
