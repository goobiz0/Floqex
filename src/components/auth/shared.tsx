import type { ReactNode } from "react";

/** Labelled divider between social buttons and the email form. */
export function Divider({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-line" aria-hidden />
      <span className="text-xs text-fg-faint">{children}</span>
      <span className="h-px flex-1 bg-line" aria-hidden />
    </div>
  );
}

type MaybeClerkError = {
  code?: string;
  message?: string;
  longMessage?: string;
  errors?: Array<{ code?: string; message?: string; longMessage?: string }>;
};

/**
 * Map a Clerk error to a short, friendly, human message for inline display.
 * Accepts both a returned `ClerkError` (future hooks) and a thrown
 * `APIResponseError` (which nests details under `errors[]`).
 */
export function clerkErrorMessage(err: unknown): string {
  const e = (err ?? {}) as MaybeClerkError;
  const detail = e.errors?.[0] ?? e;
  switch (detail.code) {
    case "form_identifier_not_found":
      return "No account found with that email.";
    case "form_password_incorrect":
      return "That password is incorrect.";
    case "form_identifier_exists":
      return "An account with that email already exists.";
    case "form_password_pwned":
      return "That password has been found in a data breach. Please choose another.";
    case "form_password_length_too_short":
      return "Password is too short. Use at least 8 characters.";
    case "form_param_format_invalid":
      return "Please check the format and try again.";
    case "form_code_incorrect":
    case "verification_failed":
      return "That code is incorrect or has expired.";
    case "strategy_for_user_invalid":
    case "form_conditional_match_not_found":
      return "No account found with that email, or this account uses social login.";
    default:
      return detail.longMessage || detail.message || "Something went wrong. Please try again.";
  }
}
