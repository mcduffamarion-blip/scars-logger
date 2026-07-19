"use client"

import { useState } from "react"
import { Globe, MapPin, ShieldQuestion, UserSearch, Radar } from "lucide-react"
import { DomainTool } from "./domain-tool"
import { IpTool } from "./ip-tool"
import { HeadersTool } from "./headers-tool"
import { UsernameTool } from "./username-tool"

const TABS = [
  { id: "domain", label: "Domain / DNS", icon: Globe, desc: "DNS records + registry data" },
  { id: "ip", label: "IP Geolocation", icon: MapPin, desc: "ASN, ISP & approx. location" },
  { id: "headers", label: "HTTP Headers", icon: ShieldQuestion, desc: "Server & security headers" },
  { id: "username", label: "Username", icon: UserSearch, desc: "Public profile footprint" },
] as const

type TabId = (typeof TABS)[number]["id"]

export function ReconConsole() {
  const [tab, setTab] = useState<TabId>("domain")

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10 sm:py-14">
      <header className="mb-8">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Radar className="size-5" />
          </div>
          <div>
            <h1 className="font-mono text-lg font-semibold tracking-tight text-foreground">recon</h1>
            <p className="font-mono text-xs text-muted-foreground">osint intelligence console</p>
          </div>
        </div>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
          Passive reconnaissance using only public data sources — DNS, RDAP registry records, IP geolocation, and public
          web profiles. No covert tracking, no private data.
        </p>
      </header>

      <nav className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Recon tools">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = t.id === tab
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors ${
                active
                  ? "border-primary/60 bg-primary/10"
                  : "border-border bg-card hover:border-border hover:bg-secondary/50"
              }`}
            >
              <Icon className={`size-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-sm font-medium ${active ? "text-foreground" : "text-foreground"}`}>
                {t.label}
              </span>
              <span className="text-xs text-muted-foreground">{t.desc}</span>
            </button>
          )
        })}
      </nav>

      <section>
        {tab === "domain" && <DomainTool />}
        {tab === "ip" && <IpTool />}
        {tab === "headers" && <HeadersTool />}
        {tab === "username" && <UsernameTool />}
      </section>

      <footer className="mt-12 border-t border-border pt-5">
        <p className="text-xs leading-relaxed text-muted-foreground">
          For authorized research and security assessment only. All lookups query publicly available data. Respect the
          terms of service of the platforms you investigate and applicable laws.
        </p>
      </footer>
    </main>
  )
}
