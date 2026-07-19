import { NextResponse } from "next/server"

function sanitize(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/[^a-z0-9.:-]/g, "")
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const raw = searchParams.get("q") ?? ""
  const query = sanitize(raw)

  if (!query) {
    return NextResponse.json({ error: "Please provide an IP address or hostname." }, { status: 400 })
  }

  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(query)}`, {
      cache: "no-store",
    })
    const data = await res.json()

    if (!data.success) {
      return NextResponse.json({ error: data.message ?? "Lookup failed." }, { status: 400 })
    }

    const result = {
      query: data.ip,
      country: data.country,
      countryCode: data.country_code,
      regionName: data.region,
      city: data.city,
      zip: data.postal ?? "",
      lat: data.latitude,
      lon: data.longitude,
      timezone: data.timezone?.id ?? "",
      isp: data.connection?.isp ?? "",
      org: data.connection?.org ?? "",
      as: data.connection?.asn ? `AS${data.connection.asn}` : "",
      asname: data.connection?.domain ?? "",
      reverse: "",
      mobile: false,
      proxy: false,
      hosting: false,
    }

    return NextResponse.json({ result })
  } catch {
    return NextResponse.json({ error: "Unable to reach geolocation service." }, { status: 502 })
  }
}
