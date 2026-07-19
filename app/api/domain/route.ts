import { NextResponse } from "next/server"

const DNS_TYPES = ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA"] as const

function sanitizeDomain(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/[^a-z0-9.-]/g, "")
}

async function resolveDns(name: string, type: string) {
  try {
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`, {
      headers: { accept: "application/dns-json" },
      cache: "no-store",
    })
    if (!res.ok) return []
    const data = await res.json()
    if (!data.Answer) return []
    return data.Answer.filter((a: { type: number }) => a.type !== 5 || type === "CNAME").map(
      (a: { data: string; TTL: number }) => ({ value: a.data, ttl: a.TTL }),
    )
  } catch {
    return []
  }
}

async function getRdap(domain: string) {
  try {
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      cache: "no-store",
    })
    if (!res.ok) return null
    const data = await res.json()
    const events: Record<string, string> = {}
    for (const ev of data.events ?? []) {
      events[ev.eventAction] = ev.eventDate
    }
    const registrar = (data.entities ?? []).find((e: { roles?: string[] }) => e.roles?.includes("registrar"))
    let registrarName: string | null = null
    if (registrar?.vcardArray?.[1]) {
      const fn = registrar.vcardArray[1].find((v: unknown[]) => v[0] === "fn")
      registrarName = fn?.[3] ?? null
    }
    return {
      handle: data.handle ?? null,
      status: data.status ?? [],
      registrar: registrarName,
      registered: events.registration ?? null,
      updated: events.lastChanged ?? null,
      expires: events.expiration ?? null,
      nameservers: (data.nameservers ?? []).map((n: { ldhName: string }) => n.ldhName),
    }
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const raw = searchParams.get("domain") ?? ""
  const domain = sanitizeDomain(raw)

  if (!domain || !domain.includes(".")) {
    return NextResponse.json({ error: "Please provide a valid domain name." }, { status: 400 })
  }

  const dnsEntries = await Promise.all(DNS_TYPES.map((t) => resolveDns(domain, t)))
  const dns: Record<string, { value: string; ttl: number }[]> = {}
  DNS_TYPES.forEach((t, i) => {
    if (dnsEntries[i].length) dns[t] = dnsEntries[i]
  })

  const rdap = await getRdap(domain)

  return NextResponse.json({ domain, dns, rdap })
}
