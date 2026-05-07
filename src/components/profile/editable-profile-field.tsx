"use client";

import { Check, Pencil, X } from "lucide-react";

interface EditableProfileFieldProps {
  label: string;
  icon: React.ReactNode;
  value: string | undefined;
  fieldKey: "fullName" | "phoneNumber";
  inputType?: "text" | "tel";
  placeholder?: string;
  editingField: "fullName" | "phoneNumber" | null;
  editValue: string;
  editError: string | null;
  editBusy: boolean;
  onStartEdit: (field: "fullName" | "phoneNumber") => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  onEditValueChange: (value: string) => void;
}

export function EditableProfileField({
  label,
  icon,
  value,
  fieldKey,
  inputType = "text",
  placeholder,
  editingField,
  editValue,
  editError,
  editBusy,
  onStartEdit,
  onSave,
  onCancel,
  onEditValueChange,
}: EditableProfileFieldProps) {
  const isEditing = editingField === fieldKey;

  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-200 ${
        isEditing
          ? "border-rpb-primary ring-2 ring-[var(--rpb-focus-ring)] bg-white"
          : "border-[var(--rpb-border)] bg-white"
      }`}
    >
      <p className="mb-1 inline-flex items-center gap-2 text-xs font-semibold text-rpb-ink-soft">
        {icon}
        {label}
      </p>
      {isEditing ? (
        <div className="space-y-2">
          <input
            id={`edit-${fieldKey}`}
            type={inputType}
            value={editValue}
            onChange={(e) => {
              onEditValueChange(e.target.value);
            }}
            className="rpb-input text-sm"
            placeholder={placeholder}
            disabled={editBusy}
            autoFocus
            aria-describedby={editError ? `${fieldKey}-edit-error` : undefined}
            onKeyDown={(e) => {
              if (e.key === "Enter") void onSave();
              if (e.key === "Escape") onCancel();
            }}
          />
          {editError ? (
            <p id={`${fieldKey}-edit-error`} className="text-xs text-red-600" role="alert">
              {editError}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void onSave()}
              disabled={editBusy}
              className="rpb-btn-primary flex items-center gap-1 px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed"
            >
              <Check size={12} />
              {editBusy ? "Menyimpan..." : "Simpan"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={editBusy}
              className="rpb-btn-ghost flex items-center gap-1 px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed"
            >
              <X size={12} />
              Batal
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">{value || "-"}</p>
          <button
            type="button"
            onClick={() => onStartEdit(fieldKey)}
            className="rounded-md p-1.5 text-rpb-ink-soft transition-colors hover:bg-rpb-primary-soft hover:text-rpb-primary"
            aria-label={`Edit ${label}`}
          >
            <Pencil size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
