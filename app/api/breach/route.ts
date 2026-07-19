import { NextResponse } from "next/server"

export const runtime = "nodejs"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type HibpBreach = {
  Name: string
  Title: string
  Domain: string
  BreachDate: string
  AddedDate: string
  PwnCount: number
  Description: string
  DataClasses: string[]
  IsVerified: boolean
  IsSensitive: boolean
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const account = (searchParams.get("account") ?? "").trim().toLowerCase()

  if (!account) {
    return NextResponse.json({ error: "Provide an email address to check." }, { status: 400 })
  }
  if (!EMAIL_RE.test(account)) {
    return NextResponse.json({ error: "That does not look like a valid email address." }, { status: 400 })
  }

  const apiKey = process.env.HIBP_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "Breach lookups require an HIBP_API_KEY. Add it in project settings to enable this tool." },
      { status: 503 },
    )
  }

  try {
    const res = await fetch(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(account)}?truncateResponse=false`,
      {
        headers: {
          "hibp-api-key": apiKey,
          "user-agent": "recon-osint-console",
        },
        // HIBP asks clients not to hammer the endpoint
        cache: "no-store",
      },
    )

    // 404 = account not found in any breach (this is a clean, good result)
    if (res.status === 404) {
      return NextResponse.json({ account, breached: false, breaches: [] })
    }

    if (res.status === 401) {
      return NextResponse.json({ error: "The HIBP API key is invalid or unauthorized." }, { status: 502 })
    }
    if (res.status === 429) {
      return NextResponse.json({ error: "Rate limited by HIBP. Wait a moment and try again." }, { status: 429 })
    }
    if (!res.ok) {
      return NextResponse.json({ error: `HIBP returned an unexpected status (${res.status}).` }, { status: 502 })
    }

    const data = (await res.json()) as HibpBreach[]

    const breaches = data
      .map((b) => ({
        name: b.Title || b.Name,
        domain: b.Domain,
        breachDate: b.BreachDate,
        addedDate: b.AddedDate,
        pwnCount: b.PwnCount,
        dataClasses: b.DataClasses ?? [],
        verified: b.IsVerified,
        sensitive: b.IsSensitive,
        description: (b.Description ?? "").replace(/<[^>]+>/g, ""),
      }))
      .sort((a, b) => (a.breachDate < b.breachDate ? 1 : -1))

    return NextResponse.json({ account, breached: breaches.length > 0, breaches })
  } catch {
    return NextResponse.json({ error: "Could not reach the breach database." }, { status: 502 })
  }
}
