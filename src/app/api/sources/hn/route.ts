import { NextResponse } from 'next/server'

/**
 * GET /api/sources/hn — Hacker News "Ask HN: Who is hiring?" aggregator (Layer 2 free source proof)
 *
 * Hits the public HN Algolia API (free, ToS-compliant) to fetch recent
 * posts from the monthly "Who is hiring?" thread. Returns a curated list
 * with intent signals.
 *
 * In production, this would be filtered by AI for relevance to creator
 * vaults. For v1 demo, we return raw posts for the user to scan.
 */

interface HNHit {
  objectID: string
  title?: string
  story_title?: string
  comment_text?: string
  author?: string
  created_at?: string
  url?: string
  story_url?: string
  points?: number
  num_comments?: number
}

export async function GET() {
  try {
    // Search HN for "Who is hiring" — returns recent monthly threads' comments
    // The HN Algolia API is free and ToS-compliant.
    const url = new URL('https://hn.algolia.com/api/v1/search')
    url.searchParams.set('query', 'who is hiring')
    url.searchParams.set('tags', 'comment')
    url.searchParams.set('hitsPerPage', '20')

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'Habibi-AI-Rep/1.0 (lead discovery; contact operator)' },
      next: { revalidate: 300 }, // cache 5 min
    })
    if (!res.ok) {
      return NextResponse.json(
        { error: 'HN API error', status: res.status },
        { status: 502 },
      )
    }
    const data = await res.json()
    const hits: HNHit[] = data.hits || []

    // Map to a simpler shape
    const leads = hits
      .filter((h) => h.comment_text || h.story_title)
      .map((h) => ({
        source: 'hn',
        externalId: h.objectID,
        title: (h.story_title || h.title || 'HN comment').slice(0, 200),
        body: (h.comment_text || '').slice(0, 500),
        url: h.story_url || `https://news.ycombinator.com/item?id=${h.objectID}`,
        author: h.author,
        postedAt: h.created_at,
      }))

    return NextResponse.json({
      source: 'hn',
      count: leads.length,
      leads,
      cached: true,
    })
  } catch (e) {
    console.error('[sources/hn] error', e)
    return NextResponse.json(
      { error: 'Failed to fetch HN leads.' },
      { status: 500 },
    )
  }
}
