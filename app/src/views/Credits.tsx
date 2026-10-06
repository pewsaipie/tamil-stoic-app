/**
 * Credits & open source — the attributions the project promises to show in-app:
 * the Tamil recension, Pope's 1886 translation, the self-hosted fonts, and the
 * app's own licence. Links point at the repository and the bundled licence texts.
 */
import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import { GlassCard } from '../components/ui/GlassCard'
import { BillaDivider } from '../components/ambient/ornaments'

const REPO = 'https://github.com/pewsaipie/tamil-stoic-app'
const DATASET = 'https://github.com/tk120404/thirukkural'
const FONTSOURCE = 'https://fontsource.org/'

export function Credits() {
  const t = useT()

  return (
    <main id="main" className="mx-auto max-w-[var(--reader-max)] px-4 pt-[var(--space-5)] pb-[var(--space-7)]">
      <nav aria-label="Breadcrumb" className="mb-[var(--space-3)]">
        <Link to="/" className="text-sm text-muted no-underline hover:text-ink">
          ← Today
        </Link>
      </nav>

      <p className="m-0 text-xs tracking-wide text-muted uppercase">
        {t('credits.eyebrow', 'Open source · Attribution')}
      </p>
      <h1 className="mt-1 mb-2 text-2xl text-ink">
        {t('credits.title', 'Credits & open source')}
      </h1>
      <p className="mt-0 mb-[var(--space-4)] text-sm text-muted">
        Tamil Stoic is built with respect for the people and projects behind it. The source code and
        licensing are open for anyone to read, reuse and improve.
      </p>
      <BillaDivider className="mb-[var(--space-5)]" />

      <div className="space-y-[var(--space-4)]">
        <GlassCard quiet className="p-5">
          <h2 className="m-0 text-base text-ink">The app</h2>
          <p className="mt-2 mb-0 text-sm text-muted">
            Application code, interface and the project-specific visual work are © 2026 pewsaipie,
            released under the <strong>MIT licence</strong>. The repository holds the source, build
            scripts, tests and documentation.
          </p>
          <p className="mt-2 mb-0 flex flex-wrap gap-4 text-sm">
            <a className="text-accent-text" href={REPO}>
              View the source on GitHub →
            </a>
            <a className="text-accent-text" href={`${REPO}/blob/main/LICENSE`}>
              Read the MIT licence
            </a>
          </p>
        </GlassCard>

        <GlassCard quiet className="p-5">
          <h2 className="m-0 text-base text-ink">Tamil text and structure</h2>
          <p className="mt-2 mb-0 text-sm text-muted">
            The Tamil couplets, their transliterations and the 133-chapter structure follow the
            standard Parimelalagar-based recension, taken from the{' '}
            <a className="text-accent-text" href={DATASET}>
              tk120404/thirukkural
            </a>{' '}
            dataset. The upstream dataset is licensed under Apache License 2.0, and the generated
            data credits it in place.
          </p>
          <p className="mt-2 mb-0 flex flex-wrap gap-4 text-sm">
            <a className="text-accent-text" href={DATASET}>
              View the source dataset →
            </a>
            <a className="text-accent-text" href={`${REPO}/blob/main/assets/licenses/Apache-2.0.txt`}>
              Read Apache 2.0
            </a>
          </p>
        </GlassCard>

        <GlassCard quiet className="p-5">
          <h2 className="m-0 text-base text-ink">Historical English source</h2>
          <p className="mt-2 mb-0 text-sm text-muted">
            The English verse translations and prose explanations belong to <strong>G. U. Pope</strong>{' '}
            with W. H. Drew, John Lazarus and F. W. Ellis (1886). That historical work is in the public
            domain and is included through the same dataset. The app’s simple-English meanings are
            written fresh from Pope’s prose — they are not Pope’s own words.
          </p>
        </GlassCard>

        <GlassCard quiet className="p-5">
          <h2 className="m-0 text-base text-ink">Offline fonts</h2>
          <p className="mt-2 mb-0 text-sm text-muted">
            Fonts ship with the app through{' '}
            <a className="text-accent-text" href={FONTSOURCE}>
              Fontsource
            </a>{' '}
            so the reader works offline. The font software is licensed separately under the{' '}
            <strong>SIL Open Font License 1.1</strong>.
          </p>
          <p className="mt-2 mb-0 flex flex-wrap gap-4 text-sm">
            <a className="text-accent-text" href={`${REPO}/blob/main/THIRD_PARTY_NOTICES.md`}>
              Third-party notices →
            </a>
            <a className="text-accent-text" href={`${REPO}/blob/main/assets/licenses/OFL-1.1.txt`}>
              Font licence and copyright notices
            </a>
          </p>
        </GlassCard>

        <GlassCard quiet className="p-5">
          <h2 className="m-0 text-base text-ink">
            <span lang="ta">எழுத்தாக்கம்</span> · Editorial work
          </h2>
          <p className="mt-2 mb-0 text-sm text-muted">
            Corrections to the text are recorded with reasons and sources, and the review notes
            explain what has been verified and what has not. Poetry is never silently rewritten.
          </p>
          <ul className="mt-3 mb-0 list-disc space-y-1 pl-5 text-sm">
            <li>
              <a
                className="text-accent-text"
                href={`${REPO}/blob/main/docs/content-review.md`}
              >
                Content-review notes
              </a>
            </li>
            <li>
              <a
                className="text-accent-text"
                href={`${REPO}/blob/main/docs/couplet-audit.md`}
              >
                Couplet line audit (why some kurals are not four words + three)
              </a>
            </li>
          </ul>
        </GlassCard>

        <GlassCard quiet className="p-5">
          <h2 className="m-0 text-base text-ink">Nothing leaves your device</h2>
          <p className="mt-2 mb-0 text-sm text-muted">
            There is no third-party JavaScript in the published app and no external font or app
            request. “Listen” uses the voices your own device provides. Saved kurals and reflections
            live in this browser’s local storage, and there are no accounts, analytics or tracking.
          </p>
        </GlassCard>
      </div>
    </main>
  )
}
