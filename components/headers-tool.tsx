"use client"

import { useState } from "react"
import { Check, X } from "lucide-react"
import { SearchForm, Panel, SectionTitle, ErrorNote, KeyVal } from "./ui-kit"

type HeadersData = {
  url: string
  status: number
  statusText: string
  server: string | null
  poweredBy: string | null
  headers: Record<string, string>
  security: { present: string[]; missing: string[] }
}

export function HeadersTool() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [data, setData] = useState<HeadersData | null>(null)

  async function run() {
    setLoading(true)
    setError("")
    setData(null)
    try {
      const res = await fetch(`/api/headers?url=${encodeURIComponent(query)}`)
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
        placeholder="https://example.com"
        label="Website URL"
      />
      {error && <ErrorNote message={error} />}

      {data && (
        <div className="flex flex-col gap-4">
          <Panel>
            <SectionTitle>Response</SectionTitle>
            <KeyVal k="URL" v={data.url} />
            <KeyVal k="Status" v={`${data.status} ${data.statusText}`} />
            <KeyVal k="Server" v={data.server} />
            <KeyVal k="Powered By" v={data.poweredBy} />
          </Panel>

          <Panel>
            <SectionTitle>Security Headers</SectionTitle>
            <div className="flex flex-col gap-1.5">
              {data.security.present.map((h) => (
                <div key={h} className="flex items-center gap-2 font-mono text-sm text-foreground">
                  <Check className="size-4 text-primary" /> {h}
                </div>
              ))}
              {data.security.missing.map((h) => (
                <div key={h} className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
                  <X className="size-4 text-destructive" /> {h}
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionTitle>All Response Headers</SectionTitle>
            <div className="flex flex-col">
              {Object.entries(data.headers).map(([k, v]) => (
                <KeyVal key={k} k={k} v={v} />
              ))}
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}
