"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Archive, ArchiveRestore, ChevronDown, ChevronRight } from "lucide-react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { t as tByLang, type Language } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, TextInput } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import {
  createCategory,
  renameCategory,
  setCategoryArchived,
  setCategoryBucket,
} from "./categories.actions";

interface Cat {
  id: string;
  name: string;
  bucket: "needs" | "wants" | "savings";
  archived: boolean;
}
type Bucket = "needs" | "wants" | "savings";

export function CategoriesPanel({
  language,
  initial,
}: {
  language: Language;
  initial: Cat[];
}) {
  const strings = tByLang(language);
  const p = strings.settings.cats;

  const [rows, setRows] = useState<Cat[]>(initial);
  const [showArchived, setShowArchived] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftBucket, setDraftBucket] = useState<Bucket>("needs");
  const [, startTransition] = useTransition();

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createBrowserClient();
    let cancelled = false;
    let channelRef: ReturnType<typeof supabase.channel> | null = null;
    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const userId = data.user?.id;
      if (!userId) return;
      const channel = supabase
        .channel(`cats-live-${userId}-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "categories",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            setRows((prev) => {
              if (payload.eventType === "INSERT") {
                const next = payload.new as Cat;
                if (prev.some((r) => r.id === next.id)) return prev;
                return [...prev, next];
              }
              if (payload.eventType === "UPDATE") {
                const next = payload.new as Cat;
                return prev.map((r) => (r.id === next.id ? next : r));
              }
              if (payload.eventType === "DELETE") {
                const old = payload.old as { id: string };
                return prev.filter((r) => r.id !== old.id);
              }
              return prev;
            });
          },
        )
        .subscribe();
      channelRef = channel;
      if (cancelled) supabase.removeChannel(channel);
    });
    return () => {
      cancelled = true;
      if (channelRef) void supabase.removeChannel(channelRef);
    };
  }, []);

  const grouped = useMemo(() => {
    const buckets: Record<Bucket, Cat[]> = { needs: [], wants: [], savings: [] };
    for (const c of rows) {
      if (c.archived && !showArchived) continue;
      buckets[c.bucket]?.push(c);
    }
    for (const k of Object.keys(buckets) as Bucket[]) {
      buckets[k].sort((a, b) => a.name.localeCompare(b.name));
    }
    return buckets;
  }, [rows, showArchived]);

  const addCategory = () => {
    const name = draftName.trim();
    if (!name) return;
    startTransition(async () => {
      try {
        await createCategory({ name, bucket: draftBucket });
        setDraftName("");
      } catch {
        /* Realtime won't add on error */
      }
    });
  };

  const isEmpty = rows.length === 0;

  return (
    <Card elevated>
      <h3 className="mb-1 font-display text-lg">{p.title}</h3>
      <p className="mb-4 text-sm text-muted">{p.sub}</p>

      <div className="mb-2 flex justify-end">
        <label className="inline-flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(ev) => setShowArchived(ev.target.checked)}
            className="accent-brand"
          />
          {p.showArchived}
        </label>
      </div>

      {isEmpty ? (
        <p className="text-muted">{p.empty}</p>
      ) : (
        <div>
          {(["needs", "wants", "savings"] as Bucket[]).map((b) =>
            grouped[b].length === 0 ? null : (
              <BucketGroup
                key={b}
                bucket={b}
                items={grouped[b]}
                label={p.buckets[b]}
                strings={strings}
              />
            ),
          )}
        </div>
      )}

      {/* Add row */}
      <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2 rounded-lg border border-dashed border-divider bg-card p-3">
        <TextInput
          placeholder={p.addPlaceholder}
          value={draftName}
          onChange={(ev) => setDraftName(ev.target.value)}
          onKeyDown={(ev) => {
            if (ev.key === "Enter") {
              ev.preventDefault();
              addCategory();
            }
          }}
        />
        <Select
          value={draftBucket}
          onChange={(ev) => setDraftBucket(ev.target.value as Bucket)}
          aria-label="Bucket"
        >
          <option value="needs">{p.buckets.needs}</option>
          <option value="wants">{p.buckets.wants}</option>
          <option value="savings">{p.buckets.savings}</option>
        </Select>
        <Button type="button" onClick={addCategory} disabled={!draftName.trim()}>
          {p.add}
        </Button>
      </div>
    </Card>
  );
}

function BucketGroup({
  bucket,
  items,
  label,
  strings,
}: {
  bucket: Bucket;
  items: Cat[];
  label: string;
  strings: ReturnType<typeof tByLang>;
}) {
  // Default: collapsed. User expands to see + edit rows.
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-2 flex w-full items-center gap-2 rounded-lg border-b border-divider px-1 pb-1.5 transition-colors hover:bg-card"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted" aria-hidden="true" />
        )}
        <span
          className={cn(
            "inline-block rounded-pill px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider",
            bucket === "needs" && "bg-accent/15 text-accent",
            bucket === "wants" && "bg-warning/20 text-warning",
            bucket === "savings" && "bg-brand/15 text-brand",
          )}
        >
          {label}
        </span>
        <span className="ml-auto text-sm text-muted">{items.length}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-1.5">
          {items.map((c) => (
            <CatRow key={c.id} cat={c} strings={strings} />
          ))}
        </div>
      )}
    </div>
  );
}

function CatRow({
  cat,
  strings,
}: {
  cat: Cat;
  strings: ReturnType<typeof tByLang>;
}) {
  const p = strings.settings.cats;
  const [name, setName] = useState(cat.name);
  useEffect(() => setName(cat.name), [cat.name]);
  const [, startTransition] = useTransition();

  const commitName = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === cat.name) {
      setName(cat.name);
      return;
    }
    startTransition(async () => {
      try {
        await renameCategory(cat.id, trimmed);
      } catch {
        setName(cat.name);
      }
    });
  };

  const commitBucket = (bucket: Cat["bucket"]) => {
    startTransition(async () => {
      try {
        await setCategoryBucket(cat.id, bucket);
      } catch {
        /* Realtime will bounce back */
      }
    });
  };

  const toggleArchived = () => {
    startTransition(async () => {
      try {
        await setCategoryArchived(cat.id, !cat.archived);
      } catch {
        /* Realtime will bounce back */
      }
    });
  };

  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-lg border border-divider bg-surface px-3 py-2",
        cat.archived && "opacity-55",
      )}
    >
      <input
        type="text"
        value={name}
        onChange={(ev) => setName(ev.target.value)}
        onBlur={commitName}
        onKeyDown={(ev) => {
          if (ev.key === "Enter") (ev.currentTarget as HTMLInputElement).blur();
        }}
        className="border-0 bg-transparent px-0 font-medium text-ink focus:rounded focus:bg-bg focus:px-2 focus:outline-none"
        aria-label="Category name"
      />
      <Select
        value={cat.bucket}
        onChange={(ev) => commitBucket(ev.target.value as Cat["bucket"])}
        className="!py-1 !text-xs"
        aria-label="Bucket"
      >
        <option value="needs">{p.buckets.needs}</option>
        <option value="wants">{p.buckets.wants}</option>
        <option value="savings">{p.buckets.savings}</option>
      </Select>
      <button
        onClick={toggleArchived}
        className="rounded p-1.5 text-muted transition-colors hover:bg-card hover:text-ink"
        title={cat.archived ? p.unarchive : p.archive}
        aria-label={cat.archived ? p.unarchive : p.archive}
      >
        {cat.archived ? (
          <ArchiveRestore className="h-4 w-4" />
        ) : (
          <Archive className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
