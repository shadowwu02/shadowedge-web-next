export const authPasswordRuleKeys = [
  "minLength",
  "uppercase",
  "lowercase",
  "number",
  "symbol",
] as const;

export type AuthPasswordRuleKey = (typeof authPasswordRuleKeys)[number];

export function evaluatePasswordRules(password: string) {
  return [
    { key: "minLength" as const, passed: password.length >= 8 },
    { key: "uppercase" as const, passed: /[A-Z]/.test(password) },
    { key: "lowercase" as const, passed: /[a-z]/.test(password) },
    { key: "number" as const, passed: /[0-9]/.test(password) },
    { key: "symbol" as const, passed: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function isStrongAuthPassword(password: string) {
  return evaluatePasswordRules(password).every((rule) => rule.passed);
}
