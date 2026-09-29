/**
 * Pure derivation of the AI-Shell session search: local title/label substring
 * matches (newest first) merged with the Host's ranked message-content page, so
 * one query answers "which conversation was this in" for both titles and
 * content. Archived, blank and subagent rows never match.
 */

/** Debounce between the latest keystroke and the Host content search. */
export const SESSION_SEARCH_DEBOUNCE_MS = 250

/** `session.search` wire bound, measured in JavaScript UTF-16 code units. */
export const SESSION_SEARCH_QUERY_MAX_CODE_UNITS = 500

/** One AI session row the search can match. */
export interface SessionSearchSession {
  readonly id: string
  readonly title: string
  /** Host name, or the localized local label, shown under the title. */
  readonly label: string
  readonly updatedAt: number
  readonly blank: boolean
  readonly origin?: 'subagent'
}

/** One ranked content hit as the Host session index returns it. */
export interface SessionSearchHit {
  readonly sessionId: string
  readonly snippet?: string
}

/** One search row: local metadata match, content match, or both. */
export interface SessionSearchResult {
  readonly id: string
  readonly title: string
  readonly label: string
  /** Content excerpt when the Host index matched this session's messages. */
  readonly snippet?: string
}

/** Bounded search page handed to the panel. */
export interface SessionSearchPage {
  readonly items: readonly SessionSearchResult[]
  readonly hasMore: boolean
}

/** Inputs of {@link deriveSessionSearch}. */
export interface SessionSearchInput {
  /** Session metadata authority (the list snapshot, flattened). */
  readonly sessions: readonly SessionSearchSession[]
  /** Caller text; surrounding whitespace is ignored. */
  readonly query: string
  /** Registry-global archive set; its members never match. */
  readonly archivedSessionIds?: readonly string[]
  /** Ranked content page from the Host, when the current query already loaded one. */
  readonly hits?: readonly SessionSearchHit[]
  /** Whether the Host reported more content matches beyond the page. */
  readonly hasMore?: boolean
  /** Maximum merged row count (protocol-owned). */
  readonly limit: number
}

/**
 * Keep a controlled input and the RPC payload inside the `session.search`
 * contract: no NUL characters, at most {@link SESSION_SEARCH_QUERY_MAX_CODE_UNITS}
 * code units, and never a lone trailing surrogate.
 * @param value - raw input text.
 * @returns the sanitized query text.
 */
export function sanitizeSearchQuery(value: string): string {
  const withoutNul = value.replaceAll('\u0000', '')
  if (withoutNul.length <= SESSION_SEARCH_QUERY_MAX_CODE_UNITS) return withoutNul
  let end = SESSION_SEARCH_QUERY_MAX_CODE_UNITS
  const code = withoutNul.charCodeAt(end - 1)
  if (code >= 0xD800 && code <= 0xDBFF) end -= 1
  return withoutNul.slice(0, end)
}

/** Collapse a content excerpt to one display line. */
function normalizeSnippet(value: string | undefined): string {
  return (value ?? '').replace(/\s+/gu, ' ').trim()
}

/**
 * Merge immediate title/label substring matches with ranked Host content
 * matches. Local rows lead newest-first, content-only rows retain backend
 * order, and a session matched both ways keeps one row with the snippet.
 * @param input - sessions, query, archive set, content page, limit.
 * @returns bounded deduplicated rows and a refine-query hint bit.
 */
export function deriveSessionSearch(input: SessionSearchInput): SessionSearchPage {
  const query = input.query.trim().toLowerCase()
  if (query === '') return { items: [], hasMore: false }
  const archived = new Set(input.archivedSessionIds ?? [])
  const visible = input.sessions.filter(session =>
    !archived.has(session.id) && !session.blank && session.origin !== 'subagent')
  const local = visible
    .filter(session => session.title.toLowerCase().includes(query) || session.label.toLowerCase().includes(query))
    .sort((left, right) => right.updatedAt - left.updatedAt)
  const byId = new Map(visible.map(session => [session.id, session]))
  const snippetById = new Map<string, string>()
  for (const hit of input.hits ?? []) {
    if (snippetById.has(hit.sessionId)) continue
    const snippet = normalizeSnippet(hit.snippet)
    if (snippet !== '') snippetById.set(hit.sessionId, snippet)
  }
  const ordered: SessionSearchSession[] = []
  const included = new Set<string>()
  const include = (session: SessionSearchSession): void => {
    if (included.has(session.id)) return
    included.add(session.id)
    ordered.push(session)
  }
  for (const session of local) include(session)
  for (const hit of input.hits ?? []) {
    const session = byId.get(hit.sessionId)
    if (session !== undefined) include(session)
  }
  const limit = Math.max(0, Math.trunc(input.limit))
  return {
    items: ordered.slice(0, limit).map(session => {
      const snippet = snippetById.get(session.id)
      return {
        id: session.id,
        title: session.title,
        label: session.label,
        ...(snippet === undefined ? {} : { snippet }),
      }
    }),
    hasMore: input.hasMore === true || ordered.length > limit,
  }
}
