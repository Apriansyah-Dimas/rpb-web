"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

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
  const headerRef = useRef<HTMLHeadingElement>(null);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorIdentifier, setErrorIdentifier] = useState("");
  const [errorPassword, setErrorPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [headerText, setHeaderText] = useState("Masuk");
  const [nextPath, setNextPath] = useState("/");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    setNextPath(getSafeNextPath(params.get("next")));
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
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

  const validateIdentifier = (value: string) => value.trim().length > 0;
  const validatePassword = (value: string) => value.length >= 6;

  const handleCancel = () => {
    if (loading) {
      return;
    }

    setIdentifier("");
    setPassword("");
    setErrorIdentifier("");
    setErrorPassword("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) {
      return;
    }

    let valid = true;
    setErrorIdentifier("");
    setErrorPassword("");

    if (!validateIdentifier(identifier)) {
      setErrorIdentifier("Masukkan username atau email.");
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
      const normalizedIdentifier = identifier.trim();
      const resolveResponse = await fetch("/api/auth/resolve-login-identifier", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: normalizedIdentifier,
        }),
      });

      if (!resolveResponse.ok) {
        throw new Error("Username/email atau kata sandi tidak valid.");
      }

      const resolveBody = (await resolveResponse.json()) as { email?: string };
      const resolvedEmail = String(resolveBody.email ?? "").trim().toLowerCase();
      if (!resolvedEmail) {
        throw new Error("Username/email atau kata sandi tidak valid.");
      }

      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setErrorPassword(err instanceof Error ? err.message : "Username/email atau kata sandi tidak valid.");
    } finally {
      setLoading(false);
    }
  };

  return (
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
                <label htmlFor="identifier">Username atau Email</label>
                <div className="input-wrapper">
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    placeholder="Masukkan username atau email"
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (errorIdentifier) {
                        setErrorIdentifier("");
                      }
                    }}
                    onBlur={() => {
                      if (!validateIdentifier(identifier)) {
                        setErrorIdentifier("Masukkan username atau email.");
                      }
                    }}
                    className={errorIdentifier ? "input-error" : ""}
                    disabled={loading}
                  />
                </div>
                <span className={`error-message ${errorIdentifier ? "visible" : ""}`}>{errorIdentifier}</span>
              </div>

              <div className="input-group">
                <label htmlFor="password">Kata Sandi</label>
                <div className="input-wrapper">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan kata sandi"
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
  );
}

export default function LoginPage() {
  return <LoginPageContent />;
}

