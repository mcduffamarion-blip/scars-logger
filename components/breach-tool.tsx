"use client"

import { useState } from "react"
import { ShieldCheck, ShieldAlert, AlertTriangle, Users, Calendar, Lock, KeyRound } from "lucide-react"
import { SearchForm, Panel, SectionTitle, ErrorNote } from "./ui-kit"

type Breach = {
  name: string
  domain: string
  breachDate: string
  pwnCount: number
  industry: string
  verified: boolean
  dataClasses: string[]
  description: string
}

type Result = {
  account: string
  breached: boolean
  breaches: Breach[]
  risk: { label: string; score: number } | null
}

function fmtCount(n: number) {
  return n?.toLocaleString() ?? "—"
}

export function BreachTool() {
  const [unlocked, setUnlocked] = useState(false)
  const [keyInput, setKeyInput] = useState("")
  const [keyError, setKeyError] = useState("")

  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<Result | null>(null)

  function unlock(e: React.FormEvent) {
    e.preventDefault()
    if (!keyInput.trim()) return
    setUnlocked(true)
    setKeyError("")
  }

  async function run() {
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const res = await fetch(`/api/breach?account=${encodeURIComponent(query)}&key=${encodeURIComponent(keyInput)}`)
      const json = await res.json()
      if (res.status === 401) {
        // Bad key: kick back to the gate.
        setUnlocked(false)
        setKeyError(json.error ?? "Invalid access key.")
        return
      }
      if (!res.ok) throw new Error(json.error ?? "Lookup failed.")
      setResult(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  if (!unlocked) {
    return (
      <div className="flex flex-col gap-5">
        <Panel>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Lock className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Restricted tool</p>
              <p className="text-xs text-muted-foreground">Breach / private-info lookups require an access key.</p>
            </div>
          </div>

          <form onSubmit={unlock} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="breach-key">
              Access key
            </label>
            <div className="relative flex-1">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="breach-key"
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Enter access key"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="w-full rounded-md border border-border bg-input py-2.5 pl-9 pr-3 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <button
              type="submit"
              disabled={!keyInput.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Lock className="size-4" /> Unlock
            </button>
          </form>

          {keyError && <p className="mt-3 text-sm text-destructive-foreground">{keyError}</p>}
        </Panel>

        <p className="text-xs leading-relaxed text-muted-foreground">
          This tool is gated because it surfaces exposure data about a specific person. Only use it for addresses you own
          or are authorized to assess.
        </p>
      </div>
    )
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
        Checks whether an email appears in known public data breaches. Results reveal only{" "}
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
              {result.risk && (
                <span className="ml-auto rounded bg-destructive/15 px-2 py-1 font-mono text-xs text-destructive-foreground">
                  Risk: {result.risk.label} ({result.risk.score})
                </span>
              )}
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
                  <Calendar className="size-3.5" /> {b.breachDate || "unknown"}
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                  <Users className="size-3.5" /> {fmtCount(b.pwnCount)} accounts
                </span>
                {b.industry && (
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                    <AlertTriangle className="size-3.5" /> {b.industry}
                  </span>
                )}
              </div>

              {b.description && <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{b.description}</p>}

              {b.dataClasses.length > 0 && (
                <>
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
                </>
              )}
            </Panel>
          ))}
        </div>
      )}
    </div>
  )
}
