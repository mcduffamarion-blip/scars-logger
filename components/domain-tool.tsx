"use client"

import { useState } from "react"
import { SearchForm, Panel, SectionTitle, ErrorNote, KeyVal } from "./ui-kit"

type DomainData = {
  domain: string
  dns: Record<string, { value: string; ttl: number }[]>
  rdap: {
    registrar: string | null
    status: string[]
    registered: string | null
    updated: string | null
    expires: string | null
    nameservers: string[]
  } | null
}

function fmtDate(d: string | null) {
  if (!d) return "—"
  const parsed = new Date(d)
  return isNaN(parsed.getTime()) ? d : parsed.toISOString().slice(0, 10)
}

export function DomainTool() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [data, setData] = useState<DomainData | null>(null)

  async function run() {
    setLoading(true)
    setError("")
    setData(null)
    try {
      const res = await fetch(`/api/domain?domain=${encodeURIComponent(query)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Lookup failed.")
      setData(json)
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
        placeholder="example.com"
        label="Domain name"
      />
      {error && <ErrorNote message={error} />}

      {data && (
        <div className="flex flex-col gap-4">
          <Panel>
            <SectionTitle>Registration (RDAP)</SectionTitle>
            {data.rdap ? (
              <div>
                <KeyVal k="Registrar" v={data.rdap.registrar} />
                <KeyVal k="Registered" v={fmtDate(data.rdap.registered)} />
                <KeyVal k="Updated" v={fmtDate(data.rdap.updated)} />
                <KeyVal k="Expires" v={fmtDate(data.rdap.expires)} />
                <KeyVal k="Status" v={data.rdap.status.join(", ")} />
                <KeyVal k="Nameservers" v={data.rdap.nameservers.join(", ").toLowerCase()} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No public registry record available for this TLD.</p>
            )}
          </Panel>

          <Panel>
            <SectionTitle>DNS Records</SectionTitle>
            {Object.keys(data.dns).length === 0 ? (
              <p className="text-sm text-muted-foreground">No DNS records resolved.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {Object.entries(data.dns).map(([type, records]) => (
                  <div key={type}>
                    <div className="mb-1.5 inline-flex rounded bg-secondary px-2 py-0.5 font-mono text-xs font-medium text-secondary-foreground">
                      {type}
                    </div>
                    <div className="flex flex-col gap-1">
                      {records.map((r, i) => (
                        <div
                          key={i}
                          className="flex items-baseline justify-between gap-4 border-b border-border/40 py-1 last:border-0"
                        >
                          <span className="break-all font-mono text-sm text-foreground">{r.value}</span>
                          <span className="shrink-0 font-mono text-xs text-muted-foreground">ttl {r.ttl}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  )
}
