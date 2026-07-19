"use client"

import { useState } from "react"
import { ShieldCheck, ShieldAlert, AlertTriangle, Users, Calendar } from "lucide-react"
import { SearchForm, Panel, SectionTitle, ErrorNote } from "./ui-kit"

type Breach = {
  name: string
  domain: string
  breachDate: string
  addedDate: string
  pwnCount: number
  dataClasses: string[]
  verified: boolean
  sensitive: boolean
  description: string
}

type Result = {
  account: string
  breached: boolean
  breaches: Breach[]
}

function fmtDate(d: string) {
  if (!d) return "unknown"
  const parsed = new Date(d)
  return Number.isNaN(parsed.getTime()) ? d : parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function fmtCount(n: number) {
  return n?.toLocaleString() ?? "—"
}

export function BreachTool() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<Result | null>(null)

  async function run() {
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const res = await fetch(`/api/breach?account=${encodeURIComponent(query)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Lookup failed.")
      setResult(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <SearchForm
        value={query}
        onChange={setQuery}
        onSubmit={run}
        loading={loading}
        placeholder="name@example.com"
        label="Email address"
      />

      <p className="text-xs leading-relaxed text-muted-foreground">
        Checks whether an email appears in known public data breaches (via Have I Been Pwned). Results reveal only{" "}
        <span className="text-foreground">which breaches</span> and{" "}
        <span className="text-foreground">what categories of data</span> were exposed — never the leaked passwords or
        records themselves. Search only addresses you own or are authorized to assess.
      </p>

      {error && <ErrorNote message={error} />}

      {result && !result.breached && (
        <Panel>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No breaches found</p>
              <p className="font-mono text-xs text-muted-foreground">{result.account}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            This address was not found in any breach tracked by the database. Absence is not a guarantee of safety.
          </p>
        </Panel>
      )}

      {result && result.breached && (
        <div className="flex flex-col gap-4">
          <Panel>
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-destructive/15 text-destructive-foreground">
                <ShieldAlert className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Found in {result.breaches.length} breach{result.breaches.length === 1 ? "" : "es"}
                </p>
                <p className="font-mono text-xs text-muted-foreground">{result.account}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Recommended actions: change the password for these services, enable two-factor authentication, and never
              reuse this password elsewhere.
            </p>
          </Panel>

          {result.breaches.map((b) => (
            <Panel key={b.name}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{b.name}</span>
                  {b.sensitive && (
                    <span className="inline-flex items-center gap-1 rounded bg-destructive/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-destructive-foreground">
                      <AlertTriangle className="size-3" /> sensitive
                    </span>
                  )}
                  {!b.verified && (
                    <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      unverified
                    </span>
                  )}
                </div>
                <span className="font-mono text-xs text-muted-foreground">{b.domain}</span>
              </div>

              <div className="mb-3 flex flex-wrap gap-4">
                <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                  <Calendar className="size-3.5" /> {fmtDate(b.breachDate)}
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                  <Users className="size-3.5" /> {fmtCount(b.pwnCount)} accounts
                </span>
              </div>

              {b.description && <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{b.description}</p>}

              <SectionTitle>Exposed data</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {b.dataClasses.map((dc) => (
                  <span
                    key={dc}
                    className="rounded border border-border/60 bg-secondary/50 px-2 py-0.5 font-mono text-xs text-foreground"
                  >
                    {dc}
                  </span>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  )
}
