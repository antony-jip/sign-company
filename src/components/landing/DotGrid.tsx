export default function DotGrid() {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-0"
      style={{
        opacity: 0.05,
        backgroundImage: 'radial-gradient(circle, #1A1A1A 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }}
    />
  );
}
