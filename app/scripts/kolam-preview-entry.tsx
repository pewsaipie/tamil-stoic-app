/** Dev-only: render the vāsal kolam components to static SVG markup. */
import { renderToStaticMarkup } from 'react-dom/server'
import { KolamFrame, KolamMotif, KolamRing } from '../src/components/vasal/kolam'

const out = {
  frame: renderToStaticMarkup(<KolamFrame />),
  ring: renderToStaticMarkup(<KolamRing />),
  motif: renderToStaticMarkup(<KolamMotif />),
}
console.log(JSON.stringify(out))
