import { NextResponse } from "next/server"

export const runtime = "nodejs"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Access key that unlocks the sensitive breach/private-info lookup.
// Configurable via env; defaults to "teamosint".
const ACCESS_KEY = process.env.BREACH_ACCESS_KEY || "teamosint"

type XonBreachDetail = {
  breach: string
  details: string
  domain: string
  industry: string
  verified: string
  xposed_data: string
  xposed_date: string
  xposed_records: number
}

type XonResponse = {
  ExposedBreaches?: { breaches_details?: XonBreachDetail[] }
  BreachMetrics?: { risk?: { risk_label: string; risk_score: number }[] }
  Error?: string
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const account = (searchParams.get("account") ?? "").trim().toLowerCase()
  const key = (searchParams.get("key") ?? req.headers.get("x-access-key") ?? "").trim()

  // Gate the sensitive lookup behind an access key. Regular searches are open;
  // this private-info tool is not.
  if (key !== ACCESS_KEY) {
    return NextResponse.json(
      { error: "Access key required. Enter the team access key to unlock breach lookups." },
      { status: 401 },
    )
  }

  if (!account) {
    return NextResponse.json({ error: "Provide an email address to check." }, { status: 400 })
  }
  if (!EMAIL_RE.test(account)) {
    return NextResponse.json({ error: "That does not look like a valid email address." }, { status: 400 })
  }

  try {
    const res = await fetch(`https://api.xposedornot.com/v1/breach-analytics?email=${encodeURIComponent(account)}`, {
      headers: { "user-agent": "recon-osint-console" },
      cache: "no-store",
    })

    // XposedOrNot returns 404 with {"Error":"Not found"} when the account is clean.
    if (res.status === 404) {
      return NextResponse.json({ account, breached: false, breaches: [], risk: null })
    }
    if (res.status === 429) {
      return NextResponse.json({ error: "Rate limited by the breach database. Try again shortly." }, { status: 429 })
    }
    if (!res.ok) {
      return NextResponse.json({ error: `Breach database returned status ${res.status}.` }, { status: 502 })
    }

    const data = (await res.json()) as XonResponse

    if (data.Error || !data.ExposedBreaches?.breaches_details) {
      return NextResponse.json({ account, breached: false, breaches: [], risk: null })
    }

    const breaches = data.ExposedBreaches.breaches_details
      .map((b) => ({
        name: b.breach,
        domain: b.domain,
        breachDate: b.xposed_date,
        pwnCount: b.xposed_records,
        industry: b.industry,
        verified: (b.verified ?? "").toLowerCase() === "yes",
        dataClasses: (b.xposed_data ?? "")
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean),
        description: (b.details ?? "").replace(/<[^>]+>/g, ""),
      }))
      .sort((a, b) => (a.breachDate < b.breachDate ? 1 : -1))

    const riskInfo = data.BreachMetrics?.risk?.[0]
    const risk = riskInfo ? { label: riskInfo.risk_label, score: riskInfo.risk_score } : null

    return NextResponse.json({ account, breached: breaches.length > 0, breaches, risk })
  } catch {
    return NextResponse.json({ error: "Could not reach the breach database." }, { status: 502 })
  }
}
