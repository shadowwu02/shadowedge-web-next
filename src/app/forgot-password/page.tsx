import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell mode="forgotPassword">
      <ForgotPasswordForm />
    </AuthPageShell>
  );
}
