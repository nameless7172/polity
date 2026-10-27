import type { ReactNode } from 'react'

interface Props {
  kicker: string
  title: ReactNode
  foot?: ReactNode
  span: 3 | 4 | 5 | 6 | 7 | 12
  children: ReactNode
}

export function Card({ kicker, title, foot, span, children }: Props) {
  return (
    <section className={`module span-${span}`}>
      <header className="module-head">
        <p className="label">{kicker}</p>
        <h3 className="module-title">{title}</h3>
      </header>
      <div className="module-body">{children}</div>
      {foot && <footer className="module-foot">{foot}</footer>}
    </section>
  )
}

export function Section({ id, title, intro, children }: { id: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section className="section" aria-labelledby={id}>
      <header className="section-head">
        <h2 id={id}>{title}</h2>
        {intro && <p className="section-intro">{intro}</p>}
      </header>
      <div className="section-grid">{children}</div>
    </section>
  )
}
