interface AuthErrorLike {
  status?: number;
  code?: string;
  message?: string;
  name?: string;
}

const hasAuthErrorShape = (error: unknown): error is AuthErrorLike =>
  typeof error === "object" && error !== null;

const normalize = (value: string | undefined): string => (value ?? "").toLowerCase();

export const isInvalidAuthSessionError = (error: unknown): boolean => {
  if (!hasAuthErrorShape(error)) {
    return false;
  }

  const status = error.status ?? 0;
  const code = normalize(error.code);
  const message = normalize(error.message);
  const name = normalize(error.name);

  if (code === "bad_jwt" || code === "session_not_found") {
    return true;
  }

  if (status !== 401 && status !== 403) {
    return false;
  }

  return (
    message.includes("jwt") ||
    message.includes("token") ||
    message.includes("session") ||
    name.includes("auth")
  );
};
