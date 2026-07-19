import { NextResponse } from "next/server"

const SECURITY_HEADERS = [
  "strict-transport-security",
  "content-security-policy",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  let raw = (searchParams.get("url") ?? "").trim()

  if (!raw) {
    return NextResponse.json({ error: "Please provide a URL or hostname." }, { status: 400 })
  }
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`

  let target: URL
  try {
    target = new URL(raw)
  } catch {
    return NextResponse.json({ error: "Invalid URL." }, { status: 400 })
  }

  if (!["http:", "https:"].includes(target.protocol)) {
    return NextResponse.json({ error: "Only http and https are supported." }, { status: 400 })
  }

  try {
    const res = await fetch(target.toString(), {
      method: "GET",
      redirect: "manual",
      headers: { "user-agent": "Recon-OSINT/1.0 (public header inspection)" },
      cache: "no-store",
    })

    const headers: Record<string, string> = {}
    res.headers.forEach((value, key) => {
      headers[key] = value
    })

    const present = SECURITY_HEADERS.filter((h) => headers[h])
    const missing = SECURITY_HEADERS.filter((h) => !headers[h])

    return NextResponse.json({
      url: target.toString(),
      status: res.status,
      statusText: res.statusText,
      server: headers["server"] ?? null,
      poweredBy: headers["x-powered-by"] ?? null,
      headers,
      security: { present, missing },
    })
  } catch {
    return NextResponse.json({ error: "Unable to reach the target host." }, { status: 502 })
  }
}
