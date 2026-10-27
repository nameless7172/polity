export function Flag({ colors, size }: { colors: string[]; size: 'small' | 'large' }) {
  return (
    <span className={`flag flag-${size}`} aria-hidden>
      {colors.map((c, i) => (
        <i key={i} style={{ background: c }} />
      ))}
    </span>
  )
}
