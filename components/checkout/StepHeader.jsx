export default function StepHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h1 style={{
        fontSize: 28,
        fontWeight: 800,
        color: 'var(--text)',
        margin: 0,
        lineHeight: 1.2,
        letterSpacing: '-0.02em',
      }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{
          fontSize: 15,
          color: 'var(--text-2)',
          marginTop: 8,
          fontWeight: 400,
          lineHeight: 1.5,
        }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
