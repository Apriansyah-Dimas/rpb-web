"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isInvalidAuthSessionError } from "@/lib/supabase/auth-errors";

const greetings = [
  "Ready to Dive in?",
  "Hello There!",
  "Welcome Back!",
  "Good to See You!",
  "Let's Get Started!",
];

type ScrambleQueueItem = {
  from: string;
  to: string;
  start: number;
  end: number;
  char?: string;
};

class TextScramble {
  private el: HTMLElement;
  private chars = "!<>-_\\/[]{}=+*^?#________";
  private queue: ScrambleQueueItem[] = [];
  private frame = 0;
  private frameRequest: number | null = null;
  private resolver: (() => void) | null = null;

  constructor(el: HTMLElement) {
    this.el = el;
    this.update = this.update.bind(this);
  }

  setText(newText: string) {
    const oldText = this.el.innerText;
    const length = Math.max(oldText.length, newText.length);

    const promise = new Promise<void>((resolve) => {
      this.resolver = resolve;
    });

    this.queue = [];
    for (let i = 0; i < length; i++) {
      const from = oldText[i] || "";
      const to = newText[i] || "";
      const start = Math.floor(Math.random() * 20);
      const end = start + Math.floor(Math.random() * 25);
      this.queue.push({ from, to, start, end });
    }

    if (this.frameRequest !== null) {
      cancelAnimationFrame(this.frameRequest);
    }
    this.frame = 0;
    this.update();
    return promise;
  }

  destroy() {
    if (this.frameRequest !== null) {
      cancelAnimationFrame(this.frameRequest);
    }
  }

  private update() {
    let output = "";
    let complete = 0;

    for (let i = 0; i < this.queue.length; i++) {
      const { from, to, start, end } = this.queue[i];
      let { char } = this.queue[i];

      if (this.frame >= end) {
        complete += 1;
        output += to;
      } else if (this.frame >= start) {
        if (!char || Math.random() < 0.28) {
          char = this.randomChar();
          this.queue[i].char = char;
        }
        output += `<span class="dud">${char}</span>`;
      } else {
        output += from;
      }
    }

    this.el.innerHTML = output;

    if (complete === this.queue.length) {
      this.resolver?.();
      this.resolver = null;
      this.frameRequest = null;
      return;
    }

    this.frameRequest = requestAnimationFrame(this.update);
    this.frame += 1;
  }

  private randomChar() {
    return this.chars[Math.floor(Math.random() * this.chars.length)];
  }
}

const getSafeNextPath = (value: string | null): string => {
  if (!value || !value.startsWith("/")) {
    return "/";
  }

  return value;
};

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const headerRef = useRef<HTMLHeadingElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorEmail, setErrorEmail] = useState("");
  const [errorPassword, setErrorPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [headerText, setHeaderText] = useState("Masuk");

  const nextPath = useMemo(
    () => getSafeNextPath(searchParams.get("next")),
    [searchParams],
  );

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    void (async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (isInvalidAuthSessionError(error)) {
        await supabase.auth.signOut({ scope: "local" });
        return;
      }

      if (user) {
        router.replace(nextPath);
      }
    })();
  }, [nextPath, router]);

  useEffect(() => {
    const next = greetings[Math.floor(Math.random() * greetings.length)];
    setHeaderText(next);
  }, []);

  useEffect(() => {
    if (!headerRef.current) {
      return;
    }

    const fx = new TextScramble(headerRef.current);
    const timer = window.setTimeout(() => {
      void fx.setText(headerText);
    }, 250);

    return () => {
      window.clearTimeout(timer);
      fx.destroy();
    };
  }, [headerText]);

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  const validatePassword = (value: string) => value.length >= 6;

  const handleCancel = () => {
    if (loading) {
      return;
    }

    setEmail("");
    setPassword("");
    setErrorEmail("");
    setErrorPassword("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) {
      return;
    }

    let valid = true;
    setErrorEmail("");
    setErrorPassword("");

    if (!validateEmail(email)) {
      setErrorEmail("Masukkan alamat email yang valid.");
      valid = false;
    }

    if (!validatePassword(password)) {
      setErrorPassword("Kata sandi minimal 6 karakter.");
      valid = false;
    }

    if (!valid) {
      return;
    }

    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        throw signInError;
      }

      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setErrorPassword(err instanceof Error ? err.message : "Email atau kata sandi tidak valid.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <main className="login-page">
        <div className="login-wrapper">
          <section className="card">
            <header className="header">
              <h1 className="scramble-text" ref={headerRef}>
                Masuk
              </h1>
              <p>Masukkan kredensial untuk mengakses akun Anda.</p>
            </header>

            <form onSubmit={handleSubmit} noValidate>
              <div className="input-group">
                <label htmlFor="email">Alamat Email</label>
                <div className="input-wrapper">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@company.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorEmail) {
                        setErrorEmail("");
                      }
                    }}
                    onBlur={() => {
                      if (email && !validateEmail(email)) {
                        setErrorEmail("Masukkan alamat email yang valid.");
                      }
                    }}
                    className={errorEmail ? "input-error" : ""}
                    disabled={loading}
                  />
                </div>
                <span className={`error-message ${errorEmail ? "visible" : ""}`}>{errorEmail}</span>
              </div>

              <div className="input-group">
                <label htmlFor="password">Kata Sandi</label>
                <div className="input-wrapper">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="��������"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorPassword) {
                        setErrorPassword("");
                      }
                    }}
                    onBlur={() => {
                      if (password && !validatePassword(password)) {
                        setErrorPassword("Kata sandi minimal 6 karakter.");
                      }
                    }}
                    className={errorPassword ? "input-error" : ""}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.77 21.77 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A10.93 10.93 0 0 1 12 4c7 0 11 8 11 8a21.73 21.73 0 0 1-3.17 4.36" />
                        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                        <path d="M1 1l22 22" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                <span className={`error-message ${errorPassword ? "visible" : ""}`}>{errorPassword}</span>
              </div>

              <div className="actions">
                <button type="button" className="secondary-action" onClick={handleCancel} disabled={loading}>
                  Batal
                </button>
                <button type="submit" className={loading ? "loading" : ""} disabled={loading}>
                  <span className="spinner" />
                  <span>{loading ? "Sedang masuk..." : "Masuk"}</span>
                </button>
              </div>
            </form>

            <footer className="footer">Hubungi administrator Anda untuk meminta akses.</footer>
          </section>
        </div>
      </main>

      <style jsx>{`
        :global(:root) {
          --login-bg-color: #f5f3ef;
          --login-card-bg: rgba(255, 255, 255, 0.75);
          --login-card-border: rgba(0, 0, 0, 0.07);
          --login-accent-primary: #008fd5;
          --login-accent-hover: #007bb8;
          --login-accent-focus-ring: rgba(0, 143, 213, 0.25);
          --login-text-main: #1a1a2e;
          --login-text-muted: #6b6b80;
          --login-text-error: #dc2626;
          --login-input-bg: #faf9f7;
          --login-input-border: #dddbd6;
          --login-input-border-hover: #b8b5ae;
          --login-radius-card: 16px;
          --login-radius-input: 8px;
          --login-shadow-card: 0 10px 40px -10px rgba(0, 0, 0, 0.12);
        }

        .login-page {
          min-height: 100dvh;
          background-color: var(--login-bg-color);
          color: var(--login-text-main);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          line-height: 1.5;
          -webkit-font-smoothing: antialiased;
          position: relative;
        }

        .login-page *,
        .login-page *::before,
        .login-page *::after {
          box-sizing: border-box;
        }

        .login-wrapper {
          width: 100%;
          display: flex;
          justify-content: center;
        }

        .login-page .card {
          background: var(--login-card-bg);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--login-card-border);
          border-radius: var(--login-radius-card);
          padding: 36px;
          width: 100%;
          max-width: 420px;
          box-shadow: var(--login-shadow-card);
          display: flex;
          flex-direction: column;
          gap: 22px;
          opacity: 0;
          transform: translateY(20px);
          animation: login-fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes login-fadeUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .login-page .header {
          text-align: center;
          margin-bottom: 8px;
        }

        .login-page .header h1 {
          font-size: 24px;
          font-weight: 600;
          color: var(--login-text-main);
          margin: 0 0 8px;
          letter-spacing: -0.02em;
          display: inline-block;
          min-height: 36px;
        }

        :global(.scramble-text .dud) {
          color: var(--login-accent-primary);
          opacity: 0.8;
          display: inline-block;
        }

        .login-page .header p {
          font-size: 14px;
          color: var(--login-text-muted);
          font-weight: 400;
          margin: 0;
        }

        .login-page form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .login-page .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .login-page .input-group label {
          font-size: 13px;
          font-weight: 500;
          color: var(--login-text-muted);
          margin-left: 2px;
        }

        .login-page .input-wrapper {
          position: relative;
        }

        .login-page input {
          width: 100%;
          background-color: var(--login-input-bg);
          border: 1px solid var(--login-input-border);
          border-radius: var(--login-radius-input);
          padding: 12px 44px 12px 14px;
          font-size: 15px;
          color: var(--login-text-main);
          outline: none;
          transition: all 0.2s ease;
        }

        .login-page input::placeholder {
          color: #a8a5a0;
        }

        .login-page input:hover {
          border-color: var(--login-input-border-hover);
        }

        .login-page input:focus {
          border-color: var(--login-accent-primary);
          box-shadow: 0 0 0 3px var(--login-accent-focus-ring);
        }

        .login-page input:disabled {
          opacity: 0.75;
          cursor: not-allowed;
        }

        .login-page .password-toggle {
          position: absolute;
          top: 50%;
          right: 10px;
          transform: translateY(-50%);
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: #8a8898;
          cursor: pointer;
          transition: background-color 0.2s ease, color 0.2s ease;
        }

        .login-page .password-toggle:hover:not(:disabled) {
          background: rgba(0, 0, 0, 0.04);
          color: var(--login-text-main);
        }

        .login-page .password-toggle:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px var(--login-accent-focus-ring);
        }

        .login-page .password-toggle:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-page input.input-error {
          border-color: var(--login-text-error);
        }

        .login-page input.input-error:focus {
          box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.2);
        }

        .login-page .error-message {
          font-size: 12px;
          color: var(--login-text-error);
          min-height: 18px;
          opacity: 0;
          transform: translateY(-5px);
          transition: all 0.2s ease;
          margin-left: 2px;
        }

        .login-page .error-message.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .login-page .actions {
          margin-top: 4px;
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .login-page button[type="submit"] {
          flex: 1;
          background-color: var(--login-accent-primary);
          color: white;
          border: none;
          border-radius: var(--login-radius-input);
          padding: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .login-page button[type="submit"]:hover:not(:disabled) {
          background-color: var(--login-accent-hover);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 143, 213, 0.3);
        }

        .login-page button[type="submit"]:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-page button[type="submit"]:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .login-page .footer {
          text-align: center;
          font-size: 13px;
          color: var(--login-text-muted);
          line-height: 1.6;
        }

        .login-page .spinner {
          display: none;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: #fff;
          animation: login-spin 0.8s linear infinite;
          margin-right: 2px;
          vertical-align: middle;
        }

        @keyframes login-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .login-page button.loading .spinner {
          display: inline-block;
        }

        .login-page .secondary-action {
          flex: 1;
          background: transparent;
          border: 1px solid var(--login-input-border);
          border-radius: var(--login-radius-input);
          color: var(--login-text-main);
          padding: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease;
        }

        .login-page .secondary-action:hover:not(:disabled) {
          border-color: var(--login-input-border-hover);
          background-color: rgba(0, 0, 0, 0.03);
        }

        .login-page .secondary-action:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        @media (max-width: 480px) {
          .login-page .card {
            padding: 28px;
          }

          .login-page button[type="submit"],
          .login-page .secondary-action {
            font-size: 14px;
          }
        }
      `}</style>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center p-4 md:px-10 md:py-8">
          <div className="w-full max-w-xl">
            <h1 className="rpb-h-title mb-4 text-center text-2xl font-semibold text-rpb-ink-soft md:text-3xl">
              RPB Login
            </h1>
            <div className="rpb-section p-6 text-sm text-rpb-ink-soft">Memuat halaman login...</div>
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
