"use client";

import { useState, useTransition } from "react";
import { Download, RefreshCw, Trash2, UserX } from "lucide-react";
import { t as tByLang, type Language } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import {
  closeAccount,
  deleteAllData,
  exportAllData,
  replayOnboarding,
} from "./data.actions";

type ConfirmMode = null | "wipe" | "close";

export function DataPanel({
  language,
  userEmail,
}: {
  language: Language;
  userEmail: string;
}) {
  const strings = tByLang(language);
  const d = strings.settings.data;

  const [exportState, setExportState] = useState<"idle" | "working" | "done">("idle");
  const [confirmMode, setConfirmMode] = useState<ConfirmMode>(null);
  const [wordInput, setWordInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onExport = () => {
    setExportState("working");
    startTransition(async () => {
      try {
        const json = await exportAllData();
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `fasa-duit-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setExportState("done");
        setTimeout(() => setExportState("idle"), 2500);
      } catch (e) {
        setExportState("idle");
        setError(e instanceof Error ? e.message : "Export failed");
      }
    });
  };

  const onReplay = () => {
    startTransition(async () => {
      try {
        await replayOnboarding();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  const openConfirm = (mode: Exclude<ConfirmMode, null>) => {
    setConfirmMode(mode);
    setWordInput("");
    setEmailInput("");
    setError(null);
  };
  const closeConfirm = () => {
    setConfirmMode(null);
    setWordInput("");
    setEmailInput("");
    setError(null);
  };

  const canConfirm =
    wordInput === "DELETE" &&
    emailInput.trim().toLowerCase() === userEmail.trim().toLowerCase();

  const submitConfirm = () => {
    if (!confirmMode || !canConfirm) return;
    setError(null);
    startTransition(async () => {
      try {
        if (confirmMode === "wipe") {
          await deleteAllData({ confirmWord: wordInput, confirmEmail: emailInput });
        } else {
          await closeAccount({ confirmWord: wordInput, confirmEmail: emailInput });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  return (
    <Card elevated>
      <h3 className="mb-1 font-display text-lg">{d.title}</h3>
      <p className="mb-4 text-sm text-muted">{d.sub}</p>

      {/* Export */}
      <DataRow
        icon={<Download className="h-5 w-5 text-accent" />}
        title={d.export.label}
        hint={d.export.hint}
        action={
          <Button variant="ghost" onClick={onExport} disabled={isPending || exportState === "working"}>
            {exportState === "working"
              ? d.export.working
              : exportState === "done"
                ? "✓ " + d.export.done
                : d.export.button}
          </Button>
        }
      />

      {/* Replay */}
      <DataRow
        icon={<RefreshCw className="h-5 w-5 text-accent" />}
        title={d.replay.label}
        hint={d.replay.hint}
        action={
          <Button variant="ghost" onClick={onReplay} disabled={isPending}>
            {d.replay.button}
          </Button>
        }
      />

      {/* Delete all data */}
      <DataRow
        icon={<Trash2 className="h-5 w-5 text-warning" />}
        title={d.wipe.label}
        hint={d.wipe.hint}
        action={
          <Button
            variant="ghost"
            onClick={() => openConfirm("wipe")}
            className="!border-warning/40 !text-warning hover:!bg-warning/10"
            disabled={isPending}
          >
            {d.wipe.button}
          </Button>
        }
      />
      {confirmMode === "wipe" && (
        <ConfirmForm
          strings={strings}
          copy={d.wipe}
          confirmLabel={d.wipe.confirm}
          userEmail={userEmail}
          wordInput={wordInput}
          setWordInput={setWordInput}
          emailInput={emailInput}
          setEmailInput={setEmailInput}
          canConfirm={canConfirm}
          onCancel={closeConfirm}
          onConfirm={submitConfirm}
          working={isPending}
          error={error}
          variant="warning"
        />
      )}

      {/* Close account */}
      <DataRow
        icon={<UserX className="h-5 w-5 text-danger" />}
        title={d.close.label}
        hint={d.close.hint}
        action={
          <Button
            variant="ghost"
            onClick={() => openConfirm("close")}
            className="!border-danger/40 !text-danger hover:!bg-danger/10"
            disabled={isPending}
          >
            {d.close.button}
          </Button>
        }
        last
      />
      {confirmMode === "close" && (
        <ConfirmForm
          strings={strings}
          copy={{
            confirmTitle: d.close.confirmTitle,
            confirmSub: d.close.confirmSub,
            typeWord: d.wipe.typeWord,
            typeEmail: d.wipe.typeEmail,
            cancel: d.wipe.cancel,
            working: d.wipe.working,
          }}
          confirmLabel={d.close.confirm}
          userEmail={userEmail}
          wordInput={wordInput}
          setWordInput={setWordInput}
          emailInput={emailInput}
          setEmailInput={setEmailInput}
          canConfirm={canConfirm}
          onCancel={closeConfirm}
          onConfirm={submitConfirm}
          working={isPending}
          error={error}
          variant="danger"
        />
      )}
    </Card>
  );
}

function DataRow({
  icon,
  title,
  hint,
  action,
  last,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  action: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        // Mobile (<sm): icon + title on top row, hint below full-width, action
        // pinned right — no more narrow squished text column. Desktop keeps
        // the original three-column layout.
        "flex flex-col gap-3 py-4 sm:grid sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-4",
        !last && "border-b border-divider",
      )}
    >
      <div className="flex items-center gap-3 sm:contents">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card">
          {icon}
        </div>
        <div className="min-w-0 flex-1 sm:min-w-0">
          <div className="font-semibold text-ink">{title}</div>
          <div className="mt-0.5 text-sm text-muted">{hint}</div>
        </div>
      </div>
      <div className="flex justify-end sm:justify-start [&>*]:w-full sm:[&>*]:w-auto">
        {action}
      </div>
    </div>
  );
}

function ConfirmForm({
  strings: _strings,
  copy,
  confirmLabel,
  userEmail,
  wordInput,
  setWordInput,
  emailInput,
  setEmailInput,
  canConfirm,
  onCancel,
  onConfirm,
  working,
  error,
  variant,
}: {
  strings: ReturnType<typeof tByLang>;
  copy: {
    confirmTitle: string;
    confirmSub: string;
    typeWord: string;
    typeEmail: string;
    cancel: string;
    working: string;
  };
  confirmLabel: string;
  userEmail: string;
  wordInput: string;
  setWordInput: (v: string) => void;
  emailInput: string;
  setEmailInput: (v: string) => void;
  canConfirm: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  working: boolean;
  error: string | null;
  variant: "warning" | "danger";
}) {
  return (
    <div
      className={cn(
        "mb-4 mt-2 rounded-card border p-5",
        variant === "warning" ? "border-warning/40 bg-warning/5" : "border-danger/40 bg-danger/5",
      )}
    >
      <div className="mb-2 font-semibold text-ink">{copy.confirmTitle}</div>
      <p className="mb-4 text-sm text-muted">{copy.confirmSub}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={copy.typeWord}>
          <TextInput
            value={wordInput}
            onChange={(ev) => setWordInput(ev.target.value)}
            placeholder="DELETE"
            autoFocus
          />
        </Field>
        <Field
          label={copy.typeEmail}
          hint={userEmail /* show the target email as a hint */}
        >
          <TextInput
            value={emailInput}
            onChange={(ev) => setEmailInput(ev.target.value)}
            placeholder={userEmail}
            type="email"
          />
        </Field>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={working}>
          {copy.cancel}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={!canConfirm || working}
          className={cn(
            variant === "danger" && "!bg-danger !text-[color:#FFF6EC] hover:!brightness-105",
          )}
        >
          {working ? copy.working : confirmLabel}
        </Button>
      </div>
    </div>
  );
}
