/**
 * Ask Valluvar — /ask
 *
 * The reader describes what they are going through, in Tamil or in Tanglish, and
 * an on-device classifier (lexicon + Naive Bayes, see `lib/intentClassifier.ts`)
 * decides what it is about. The answer is one of the couplets of the matching
 * chapter, with the chapter named, the couplet read aloud if wanted, and a link
 * into the reader.
 *
 * Nothing is sent anywhere: the model ships in the app, the corpus ships in the
 * app, and the conversation lives in this component's state.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Bookmark, BookmarkCheck, LifeBuoy, RefreshCw, Send, Sparkles } from 'lucide-react'
import { useClassifier, useCorpus } from '../hooks/useReader'
import { selectIsSaved, useReaderStore } from '../store/appStore'
import { ASK_INTENTS } from '../lib/intents'
import {
  askValluvar,
  openingPrompts,
  reroll,
  SUPPORT_LINES,
  type AskReply,
  type PromptSuggestion,
} from '../lib/askValluvar'
import { KuralVerse } from '../components/kural/KuralVerse'
import { ListenButton } from '../components/kural/ListenButton'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { SkeletonKuralCard } from '../components/ui/Skeleton'
import { useT } from '../i18n'
import { cn } from '../lib/cn'

interface Turn {
  id: number
  query: string
  reply: AskReply
}

/** The intent labels a reader can browse when they would rather be shown. */
const BROWSABLE = ASK_INTENTS.filter((intent) => intent.chapters.length > 0)

export function AskValluvar() {
  const { status: corpusStatus, corpus } = useCorpus()
  const { status: modelStatus, classifier, error: modelError } = useClassifier()
  const t = useT()
  const pushToast = useReaderStore((state) => state.pushToast)

  const [draft, setDraft] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [prompts, setPrompts] = useState<PromptSuggestion[]>([])
  const [thinking, setThinking] = useState(false)
  const nextId = useRef(1)
  const listEnd = useRef<HTMLDivElement>(null)

  // Random opening prompts, reshuffled on request.
  const shufflePrompts = useCallback(() => setPrompts(openingPrompts(4)), [])
  useEffect(() => {
    shufflePrompts()
  }, [shufflePrompts])

  const seen = useMemo(() => turns.flatMap((turn) => (turn.reply.kind === 'kural' ? [turn.reply.kural.n] : [])), [turns])

  const ask = useCallback(
    (text: string) => {
      const query = text.trim()
      if (!query || !corpus || !classifier) return
      setThinking(true)
      const reply = askValluvar({ text: query, classifier, corpus, seen })
      setTurns((current) => [...current, { id: nextId.current++, query, reply }])
      setDraft('')
      setThinking(false)
    },
    [classifier, corpus, seen],
  )

  useEffect(() => {
    if (turns.length === 0) return
    // `?.()` because scrollIntoView is absent in some embedded and test DOMs.
    listEnd.current?.scrollIntoView?.({ block: 'end', behavior: 'smooth' })
  }, [turns])

  const another = useCallback(
    (id: number) => {
      if (!corpus) return
      setTurns((current) =>
        current.map((turn) =>
          turn.id === id && turn.reply.kind === 'kural' ? { ...turn, reply: reroll(turn.reply, corpus) } : turn,
        ),
      )
    },
    [corpus],
  )

  const ready = corpusStatus === 'ready' && modelStatus === 'ready'

  return (
    <main
      id="main"
      className="mx-auto flex w-full max-w-[var(--content-max)] flex-col gap-[var(--space-5)] px-4 py-6"
    >
      <header className="flex flex-col gap-2">
        <p className="m-0 flex items-center gap-2 text-xs font-semibold tracking-wide text-accent-text uppercase">
          <Sparkles size={15} strokeWidth={1.6} aria-hidden="true" />
          {t('ask.kicker', 'On this device')}
        </p>
        <h1 className="m-0 font-serif text-3xl text-ink">{t('ask.title', 'வள்ளுவரைக் கேள்')}</h1>
        <p className="m-0 max-w-[52ch] text-sm text-muted">
          {t(
            'ask.intro',
            'Tell Valluvar what you are going through — in Tamil or in Tanglish. He answers with a couplet from the chapter that speaks to it.',
          )}
        </p>
      </header>

      {modelError !== null && modelStatus === 'error' && (
        <GlassCard>
          <p className="m-0 text-sm text-muted">
            {t('ask.modelError', 'The intent model could not be loaded. Reload the page to try again.')}
          </p>
        </GlassCard>
      )}

      {!ready && modelError === null && <SkeletonKuralCard />}

      {ready && corpus && (
        <>
          <div
            className="flex flex-col gap-[var(--space-4)]"
            role="log"
            aria-live="polite"
            aria-label={t('ask.conversation', 'Conversation with Valluvar')}
          >
            {turns.length === 0 && (
              <div className="flex flex-col gap-3">
                <p className="m-0 text-sm text-muted">{t('ask.tryOne', 'Try one of these:')}</p>
                <PromptChips prompts={prompts} onPick={ask} />
                <button
                  type="button"
                  onClick={shufflePrompts}
                  className="flex w-fit items-center gap-2 rounded-[var(--radius-pill)] border border-line bg-transparent px-3 py-2 text-xs text-muted hover:text-ink"
                >
                  <RefreshCw size={14} strokeWidth={1.6} aria-hidden="true" />
                  {t('ask.morePrompts', 'Show other examples')}
                </button>
              </div>
            )}

            {turns.map((turn) => (
              <article key={turn.id} className="flex flex-col gap-3">
                <p className="m-0 self-end rounded-[var(--radius-lg)] bg-accent px-4 py-2 text-sm text-on-accent" lang="auto">
                  {turn.query}
                </p>
                <ReplyBody
                  reply={turn.reply}
                  onAnother={() => another(turn.id)}
                  onAsk={ask}
                  pushToast={pushToast}
                  t={t}
                />
              </article>
            ))}
            <div ref={listEnd} />
          </div>

          <form
            className="sticky bottom-[calc(56px+var(--space-3))] flex items-end gap-2 rounded-[var(--radius-lg)] border border-line bg-glass p-2 backdrop-blur-xl"
            onSubmit={(event) => {
              event.preventDefault()
              ask(draft)
            }}
          >
            <label className="sr-only" htmlFor="ask-input">
              {t('ask.inputLabel', 'Describe your situation')}
            </label>
            <textarea
              id="ask-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  ask(draft)
                }
              }}
              rows={1}
              placeholder={t('ask.placeholder', 'எனக்கு கோபம் வருகிறது…')}
              className="max-h-32 min-h-[44px] flex-1 resize-y rounded-[var(--radius-md)] border-0 bg-transparent px-3 py-2 text-sm text-ink outline-none placeholder:text-muted"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!draft.trim() || thinking}
              icon={<Send size={17} strokeWidth={1.6} />}
              aria-label={t('ask.send', 'Ask Valluvar')}
            >
              {t('ask.sendShort', 'Ask')}
            </Button>
          </form>

          <details className="rounded-[var(--radius-md)] border border-line bg-card p-4">
            <summary className="cursor-pointer text-sm font-semibold text-ink">
              {t('ask.browse', 'Or choose what you are going through')}
            </summary>
            <ul className="mt-3 flex list-none flex-wrap gap-2 p-0">
              {BROWSABLE.map((intent) => (
                <li key={intent.id}>
                  <button
                    type="button"
                    onClick={() => ask(intent.examples[0] ?? intent.ta)}
                    className="rounded-[var(--radius-pill)] border border-line bg-transparent px-3 py-1.5 text-xs text-muted hover:border-accent hover:text-ink"
                  >
                    <span lang="ta">{intent.ta}</span> · {intent.en}
                  </button>
                </li>
              ))}
            </ul>
          </details>

          <p className="m-0 text-xs text-muted">
            {t(
              'ask.privacy',
              'Your words stay on this device. Valluvar answers from a classifier that ships with the app — no account, no server, no API key.',
            )}
          </p>
        </>
      )}
    </main>
  )
}

function PromptChips({ prompts, onPick }: { prompts: PromptSuggestion[]; onPick: (text: string) => void }) {
  return (
    <ul className="flex list-none flex-wrap gap-2 p-0">
      {prompts.map((prompt) => (
        <li key={prompt.text}>
          <button
            type="button"
            onClick={() => onPick(prompt.text)}
            className="rounded-[var(--radius-pill)] border border-line bg-card px-3 py-2 text-left text-xs text-ink hover:border-accent"
          >
            {prompt.text}
          </button>
        </li>
      ))}
    </ul>
  )
}

interface ReplyProps {
  reply: AskReply
  onAnother: () => void
  onAsk: (text: string) => void
  pushToast: (message: string, tone?: 'info' | 'success' | 'danger') => void
  t: ReturnType<typeof useT>
}

function ReplyBody({ reply, onAnother, onAsk, pushToast, t }: ReplyProps) {
  if (reply.kind === 'support') {
    return (
      <GlassCard className="flex flex-col gap-3 border-l-4 border-l-danger">
        <p className="m-0 flex items-center gap-2 text-sm font-semibold text-ink">
          <LifeBuoy size={18} strokeWidth={1.6} aria-hidden="true" />
          {t('ask.supportTitle', 'உதவி இப்போதே கிடைக்கும்')} · {reply.label.en}
        </p>
        <p className="m-0 text-sm text-ink" lang="ta">
          {reply.note.ta}
        </p>
        <p className="m-0 text-sm text-muted">{reply.note.en}</p>
        <ul className="flex list-none flex-col gap-2 p-0">
          {SUPPORT_LINES.map((line) => (
            <li key={line.number} className="rounded-[var(--radius-md)] border border-line bg-card p-3">
              <p className="m-0 text-sm font-semibold text-ink">
                <span lang="ta">{line.nameTa}</span> · {line.name}
              </p>
              {line.href ? (
                <a
                  className="text-sm text-accent-text"
                  href={line.href}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {line.number}
                </a>
              ) : (
                <a className="text-sm text-accent-text" href={`tel:${line.number.replace(/[^0-9+]/g, '')}`}>
                  {line.number}
                </a>
              )}
              <p className="m-0 text-xs text-muted" lang="ta">
                {line.detail.ta}
              </p>
              <p className="m-0 text-xs text-muted">{line.detail.en}</p>
            </li>
          ))}
        </ul>
      </GlassCard>
    )
  }

  if (reply.kind === 'fallback') {
    return (
      <GlassCard className="flex flex-col gap-3">
        <p className="m-0 text-sm text-ink">
          {t('ask.unsure', 'இதை என்னால் உறுதியாகப் புரிந்துகொள்ள முடியவில்லை — இப்படிச் சொல்லிப் பாருங்கள்:')}
        </p>
        <PromptChips prompts={reply.suggestions} onPick={onAsk} />
        {reply.near.length > 0 && (
          <p className="m-0 flex flex-wrap items-center gap-2 text-xs text-muted">
            {t('ask.didYouMean', 'இவை பற்றியா?')}
            {reply.near.map((near) => (
              <button
                key={near.en}
                type="button"
                onClick={() => onAsk(near.prompt)}
                className="rounded-[var(--radius-pill)] border border-line bg-transparent px-3 py-1 text-xs text-ink hover:border-accent"
              >
                <span lang="ta">{near.ta}</span> · {near.en}
              </button>
            ))}
          </p>
        )}
      </GlassCard>
    )
  }

  const { kural, chapter, framing, label, keyword } = reply
  return (
    <GlassCard className="flex flex-col gap-3">
      <p className="m-0 text-xs font-semibold tracking-wide text-accent-text uppercase">
        <span lang="ta">{label.ta}</span> · {label.en}
        {keyword ? <span className="ml-2 normal-case">— “{keyword}”</span> : null}
      </p>
      <p className="m-0 text-sm text-muted" lang="ta">
        {framing.ta}
      </p>
      <p className="m-0 text-xs text-muted">{framing.en}</p>
      <Link
        to={`/kural/${kural.n}`}
        className="m-0 text-xs text-accent-text no-underline hover:underline"
      >
        {`${t('ask.kural', 'குறள்')} ${kural.n}${chapter ? ` · ${chapter.ta}` : ''}`}
      </Link>
      <KuralVerse kural={kural} />
      <p className="m-0 text-sm text-ink">{kural.s}</p>
      <div className="flex flex-wrap items-center gap-2">
        <ListenButton kural={kural} />
        <AnotherButton onAnother={onAnother} t={t} />
        <SaveReplyButton n={kural.n} pushToast={pushToast} t={t} />
        <Link
          to={`/kural/${kural.n}`}
          className="flex min-h-[40px] items-center gap-2 rounded-[var(--radius-pill)] border border-line px-4 text-sm text-ink no-underline hover:border-accent"
        >
          <BookOpen size={17} strokeWidth={1.5} aria-hidden="true" />
          {t('ask.open', 'Open in the reader')}
        </Link>
      </div>
    </GlassCard>
  )
}

function AnotherButton({ onAnother, t }: { onAnother: () => void; t: ReturnType<typeof useT> }) {
  return (
    <Button
      variant="secondary"
      size="sm"
      icon={<RefreshCw size={17} strokeWidth={1.5} />}
      onClick={onAnother}
      aria-label={t('ask.another', 'Another couplet')}
    >
      {t('ask.anotherShort', 'Another')}
    </Button>
  )
}

function SaveReplyButton({
  n,
  pushToast,
  t,
}: {
  n: number
  pushToast: (message: string, tone?: 'info' | 'success' | 'danger') => void
  t: ReturnType<typeof useT>
}) {
  const saved = useReaderStore(selectIsSaved(n))
  const toggleSaved = useReaderStore((state) => state.toggleSaved)
  return (
    <Button
      variant="secondary"
      size="sm"
      icon={saved ? <BookmarkCheck size={17} strokeWidth={1.5} /> : <Bookmark size={17} strokeWidth={1.5} />}
      aria-pressed={saved}
      onClick={() => {
        toggleSaved(n)
        pushToast(saved ? t('ask.unsaved', 'Removed from your collection') : t('ask.saved', 'Saved to your collection'), 'success')
      }}
      className={cn(saved && 'border-accent text-accent-text')}
    >
      {saved ? t('ask.savedShort', 'Saved') : t('ask.save', 'Save')}
    </Button>
  )
}
