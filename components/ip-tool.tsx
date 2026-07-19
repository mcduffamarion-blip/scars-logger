"use client"

import { useState } from "react"
import { SearchForm, Panel, SectionTitle, ErrorNote, KeyVal } from "./ui-kit"

type IpResult = {
  query: string
  country: string
  countryCode: string
  regionName: string
  city: string
  zip: string
  lat: number
  lon: number
  timezone: string
  isp: string
  org: string
  as: string
  asname: string
}

export function IpTool() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [data, setData] = useState<IpResult | null>(null)

  async function run() {
    setLoading(true)
    setError("")
    setData(null)
    try {
      const res = await fetch(`/api/ip?q=${encodeURIComponent(query)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Lookup failed.")
      setData(json.result)
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
        placeholder="8.8.8.8 or example.com"
        label="IP address or hostname"
      />
      {error && <ErrorNote message={error} />}

      {data && (
        <div className="flex flex-col gap-4">
          <Panel>
            <SectionTitle>Network</SectionTitle>
            <KeyVal k="IP" v={data.query} />
            <KeyVal k="ISP" v={data.isp} />
            <KeyVal k="Organization" v={data.org} />
            <KeyVal k="ASN" v={`${data.as}${data.asname ? ` (${data.asname})` : ""}`} />
          </Panel>

          <Panel>
            <SectionTitle>Approximate Location</SectionTitle>
            <KeyVal k="Country" v={`${data.country} (${data.countryCode})`} />
            <KeyVal k="Region" v={data.regionName} />
            <KeyVal k="City" v={`${data.city}${data.zip ? `, ${data.zip}` : ""}`} />
            <KeyVal k="Coordinates" v={`${data.lat}, ${data.lon}`} />
            <KeyVal k="Timezone" v={data.timezone} />
            <div className="mt-3">
              <a
                href={`https://www.openstreetmap.org/?mlat=${data.lat}&mlon=${data.lon}#map=10/${data.lat}/${data.lon}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-primary underline underline-offset-4 hover:opacity-80"
              >
                View on OpenStreetMap
              </a>
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}
