"use client"

import { useState } from "react"
import { Check, HelpCircle, ExternalLink } from "lucide-react"
import { SearchForm, Panel, SectionTitle, ErrorNote } from "./ui-kit"

type Hit = {
  name: string
  url: string
  status: "found" | "not-found" | "unknown"
  code: number
}

export function UsernameTool() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [results, setResults] = useState<Hit[] | null>(null)

  async function run() {
    setLoading(true)
    setError("")
    setResults(null)
    try {
      const res = await fetch(`/api/username?username=${encodeURIComponent(query)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Lookup failed.")
      setResults(json.results)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  const found = results?.filter((r) => r.status === "found") ?? []
  const other = results?.filter((r) => r.status !== "found") ?? []

  return (
    <div className="flex flex-col gap-5">
      <SearchForm
        value={query}
        onChange={setQuery}
        onSubmit={run}
        loading={loading}
        placeholder="username"
        label="Username"
      />
      {error && <ErrorNote message={error} />}

      {results && (
        <div className="flex flex-col gap-4">
          <Panel>
            <SectionTitle>Likely Matches ({found.length})</SectionTitle>
            {found.length === 0 ? (
              <p className="text-sm text-muted-foreground">No confirmed public profiles found.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {found.map((r) => (
                  <a
                    key={r.name}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between gap-3 rounded-md border border-border/60 bg-secondary/40 px-3 py-2 transition-colors hover:border-primary/50"
                  >
                    <span className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="size-4 text-primary" />
                      {r.name}
                    </span>
                    <ExternalLink className="size-3.5 text-muted-foreground group-hover:text-primary" />
                  </a>
                ))}
              </div>
            )}
          </Panel>

          <Panel>
            <SectionTitle>Inconclusive ({other.length})</SectionTitle>
            <p className="mb-3 text-xs text-muted-foreground">
              These platforms rate-limit or block automated checks, so presence could not be confirmed. Open the link to
              verify manually.
            </p>
            <div className="flex flex-col gap-1.5">
              {other.map((r) => (
                <a
                  key={r.name}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-3 rounded-md px-3 py-1.5"
                >
                  <span className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
                    <HelpCircle className="size-4" />
                    {r.name}
                  </span>
                  <ExternalLink className="size-3.5 text-muted-foreground group-hover:text-foreground" />
                </a>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}
