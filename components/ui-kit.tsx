"use client"

import type React from "react"
import { Search, Loader2 } from "lucide-react"

export function SearchForm({
  value,
  onChange,
  onSubmit,
  placeholder,
  loading,
  label,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  placeholder: string
  loading: boolean
  label: string
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="flex flex-col gap-2 sm:flex-row"
    >
      <label className="sr-only" htmlFor="recon-input">
        {label}
      </label>
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id="recon-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="w-full rounded-md border border-border bg-input py-2.5 pl-9 pr-3 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/40"
        />
      </div>
      <button
        type="submit"
        disabled={loading || !value.trim()}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
        Scan
      </button>
    </form>
  )
}

export function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-border bg-card p-4 sm:p-5">{children}</div>
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">{children}</h3>
  )
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
      {message}
    </div>
  )
}

export function KeyVal({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/60 py-2 last:border-0 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="min-w-40 font-mono text-xs uppercase tracking-wide text-muted-foreground">{k}</span>
      <span className="break-all font-mono text-sm text-foreground">{v || "—"}</span>
    </div>
  )
}
