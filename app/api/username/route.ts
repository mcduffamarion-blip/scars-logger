import { NextResponse } from "next/server"

type Platform = {
  name: string
  url: (u: string) => string
  // status codes that indicate the profile exists
  exists: number[]
}

const PLATFORMS: Platform[] = [
  { name: "GitHub", url: (u) => `https://github.com/${u}`, exists: [200] },
  { name: "GitLab", url: (u) => `https://gitlab.com/${u}`, exists: [200] },
  { name: "Reddit", url: (u) => `https://www.reddit.com/user/${u}/about.json`, exists: [200] },
  { name: "Instagram", url: (u) => `https://www.instagram.com/${u}/`, exists: [200] },
  { name: "X / Twitter", url: (u) => `https://x.com/${u}`, exists: [200] },
  { name: "Medium", url: (u) => `https://medium.com/@${u}`, exists: [200] },
  { name: "Dev.to", url: (u) => `https://dev.to/${u}`, exists: [200] },
  { name: "Pinterest", url: (u) => `https://www.pinterest.com/${u}/`, exists: [200] },
  { name: "TikTok", url: (u) => `https://www.tiktok.com/@${u}`, exists: [200] },
  { name: "Telegram", url: (u) => `https://t.me/${u}`, exists: [200] },
  { name: "Twitch", url: (u) => `https://www.twitch.tv/${u}`, exists: [200] },
  { name: "Steam", url: (u) => `https://steamcommunity.com/id/${u}`, exists: [200] },
]

function sanitize(input: string) {
  return input.trim().replace(/^@/, "").replace(/[^a-zA-Z0-9._-]/g, "")
}

async function check(platform: Platform, username: string) {
  const url = platform.url(username)
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; Recon-OSINT/1.0; public profile check)",
        accept: "text/html,application/json",
      },
      cache: "no-store",
    })
    clearTimeout(timeout)

    let status: "found" | "not-found" | "unknown"
    if (platform.exists.includes(res.status)) status = "found"
    else if (res.status === 404) status = "not-found"
    else if (res.status >= 300 && res.status < 400) status = "unknown"
    else status = "unknown"

    return { name: platform.name, url, status, code: res.status }
  } catch {
    return { name: platform.name, url, status: "unknown" as const, code: 0 }
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const username = sanitize(searchParams.get("username") ?? "")

  if (!username || username.length < 2) {
    return NextResponse.json({ error: "Please provide a username (min 2 characters)." }, { status: 400 })
  }

  const results = await Promise.all(PLATFORMS.map((p) => check(p, username)))
  return NextResponse.json({ username, results })
}
