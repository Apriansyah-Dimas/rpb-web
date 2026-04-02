"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { KeyRound, ChevronDown, Eye, EyeOff, CheckCircle } from "lucide-react";
import { useCallback, useState } from "react";

interface ChangePasswordFormProps {
  onSuccess?: () => void;
}

interface FormState {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface FormErrors {
  oldPassword: string | null;
  newPassword: string | null;
  confirmPassword: string | null;
}

interface Notice {
  tone: "success" | "error";
  text: string;
}

const MIN_PASSWORD_LENGTH = 6;

const validateForm = (state: FormState): FormErrors => {
  const errors: FormErrors = {
    oldPassword: null,
    newPassword: null,
    confirmPassword: null,
  };

  if (!state.oldPassword) {
    errors.oldPassword = "Masukkan password lama.";
  }

  if (!state.newPassword) {
    errors.newPassword = "Masukkan password baru.";
  } else if (state.newPassword.length < MIN_PASSWORD_LENGTH) {
    errors.newPassword = `Minimal ${MIN_PASSWORD_LENGTH} karakter.`;
  }

  if (!state.confirmPassword) {
    errors.confirmPassword = "Masukkan konfirmasi password.";
  } else if (state.newPassword && state.confirmPassword !== state.newPassword) {
    errors.confirmPassword = "Konfirmasi tidak cocok.";
  }

  if (
    state.oldPassword &&
    state.newPassword.length >= MIN_PASSWORD_LENGTH &&
    state.confirmPassword &&
    state.newPassword === state.confirmPassword
  ) {
    if (state.oldPassword === state.newPassword) {
      errors.newPassword = "Password baru tidak boleh sama dengan password lama.";
    }
  }

  return errors;
};

const canSubmit = (errors: FormErrors, state: FormState): boolean => {
  return (
    !errors.oldPassword &&
    !errors.newPassword &&
    !errors.confirmPassword &&
    state.oldPassword.length > 0 &&
    state.newPassword.length >= MIN_PASSWORD_LENGTH &&
    state.confirmPassword.length > 0
  );
};

export function ChangePasswordForm({ onSuccess }: ChangePasswordFormProps) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState<FormState>({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({
    oldPassword: null,
    newPassword: null,
    confirmPassword: null,
  });
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const resetForm = useCallback(() => {
    setForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    setErrors({ oldPassword: null, newPassword: null, confirmPassword: null });
    setNotice(null);
    setShowOld(false);
    setShowNew(false);
    setShowConfirm(false);
  }, []);

  const toggleExpanded = useCallback(() => {
    if (expanded) {
      resetForm();
    }
    setExpanded((prev) => !prev);
  }, [expanded, resetForm]);

  const handleChange = useCallback(
    (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: null }));
      }
      setNotice(null);
    },
    [errors]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const validation = validateForm(form);
      const firstError = Object.entries(validation).find(([, v]) => v !== null);
      if (firstError) {
        setErrors(validation);
        return;
      }

      setBusy(true);
      setNotice(null);

      try {
        const supabase = getSupabaseBrowserClient();

        const { data: sessionData } = await supabase.auth.getSession();
        const userEmail = sessionData?.session?.user?.email;
        if (!userEmail) {
          throw new Error("Sesi tidak valid. Silakan login ulang.");
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: form.oldPassword,
        });

        if (signInError) {
          throw new Error("Password lama salah.");
        }

        const { error: updateError } = await supabase.auth.updateUser({
          password: form.newPassword,
        });

        if (updateError) {
          throw new Error(updateError.message || "Gagal memperbarui password.");
        }

        setNotice({ tone: "success", text: "Password berhasil diperbarui." });
        resetForm();
        setExpanded(false);
        onSuccess?.();
      } catch (err) {
        setNotice({
          tone: "error",
          text: err instanceof Error ? err.message : "Terjadi kesalahan.",
        });
      } finally {
        setBusy(false);
      }
    },
    [form, onSuccess, resetForm]
  );

  const handleCancel = useCallback(() => {
    if (busy) return;
    resetForm();
    setExpanded(false);
  }, [busy, resetForm]);

  const currentErrors = validateForm(form);
  const canProceed = canSubmit(currentErrors, form) && !busy;

  return (
    <section className="rpb-section p-4">
      <button
        type="button"
        onClick={toggleExpanded}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={expanded}
      >
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
          <KeyRound size={16} className="text-rpb-ink-soft" />
          Ubah Password
        </span>
        <ChevronDown
          size={18}
          className={`text-rpb-ink-soft transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          expanded ? "mt-4 max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-3">
            <div>
              <label htmlFor="oldPassword" className="mb-1.5 block text-xs font-semibold text-rpb-ink-soft">
                Password Lama
              </label>
              <div className="relative">
                <input
                  id="oldPassword"
                  type={showOld ? "text" : "password"}
                  value={form.oldPassword}
                  onChange={handleChange("oldPassword")}
                  className="rpb-input pr-10"
                  placeholder="Masukkan password lama"
                  autoComplete="current-password"
                  disabled={busy}
                  aria-describedby={errors.oldPassword ? "oldPassword-error" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowOld((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-rpb-ink-soft transition-colors hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showOld ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.oldPassword ? (
                <p id="oldPassword-error" className="mt-1 text-xs text-red-600" role="alert">
                  {errors.oldPassword}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="newPassword" className="mb-1.5 block text-xs font-semibold text-rpb-ink-soft">
                Password Baru
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  value={form.newPassword}
                  onChange={handleChange("newPassword")}
                  className="rpb-input pr-10"
                  placeholder="Minimal 6 karakter"
                  autoComplete="new-password"
                  disabled={busy}
                  aria-describedby={errors.newPassword ? "newPassword-error" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-rpb-ink-soft transition-colors hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showNew ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.newPassword ? (
                <p id="newPassword-error" className="mt-1 text-xs text-red-600" role="alert">
                  {errors.newPassword}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-xs font-semibold text-rpb-ink-soft">
                Konfirmasi Password Baru
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={handleChange("confirmPassword")}
                  className="rpb-input pr-10"
                  placeholder="Masukkan ulang password baru"
                  autoComplete="new-password"
                  disabled={busy}
                  aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-rpb-ink-soft transition-colors hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showConfirm ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword ? (
                <p id="confirmPassword-error" className="mt-1 text-xs text-red-600" role="alert">
                  {errors.confirmPassword}
                </p>
              ) : null}
              {form.confirmPassword &&
              !errors.confirmPassword &&
              form.newPassword === form.confirmPassword &&
              form.newPassword.length >= MIN_PASSWORD_LENGTH ? (
                <p className="mt-1 flex items-center gap-1 text-xs text-green-600" role="status">
                  <CheckCircle size={12} />
                  Konfirmasi cocok
                </p>
              ) : null}
            </div>
          </div>

          {notice ? (
            <div
              className={`mt-3 rounded-lg p-3 text-sm ${
                notice.tone === "error"
                  ? "bg-red-50 text-red-700"
                  : "bg-green-50 text-green-700"
              }`}
              role={notice.tone === "error" ? "alert" : "status"}
            >
              {notice.text}
            </div>
          ) : null}

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={!canProceed}
              className="rpb-btn-primary flex-1 px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed"
            >
              {busy ? "Menyimpan..." : "Simpan Password"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={busy}
              className="rpb-btn-ghost px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
