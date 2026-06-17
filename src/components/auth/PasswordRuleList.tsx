"use client";

import { evaluatePasswordRules, type AuthPasswordRuleKey } from "@/lib/auth-password";
import { useI18n, type DictionaryKey } from "@/i18n/useI18n";

const ruleLabelKeys: Record<AuthPasswordRuleKey, DictionaryKey> = {
  minLength: "auth.passwordRuleMinLength",
  uppercase: "auth.passwordRuleUppercase",
  lowercase: "auth.passwordRuleLowercase",
  number: "auth.passwordRuleNumber",
  symbol: "auth.passwordRuleSymbol",
};

export function PasswordRuleList({ password }: { password: string }) {
  const { t } = useI18n();
  const rules = evaluatePasswordRules(password);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/24 p-3">
      <p className="text-xs font-bold uppercase tracking-[.14em] text-white/42">
        {t("auth.passwordRequirements")}
      </p>
      <ul className="mt-2 grid gap-1.5 text-xs leading-5">
        {rules.map((rule) => (
          <li
            className={`flex items-center gap-2 ${rule.passed ? "text-[#9be7e7]" : "text-white/45"}`}
            key={rule.key}
          >
            <span
              aria-hidden="true"
              className={`grid h-4 w-4 place-items-center rounded-full text-[10px] font-black ${
                rule.passed ? "bg-[#9be7e7]/16 text-[#9be7e7]" : "bg-white/[.08] text-white/40"
              }`}
            >
              {rule.passed ? "OK" : "-"}
            </span>
            <span>{t(ruleLabelKeys[rule.key])}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
