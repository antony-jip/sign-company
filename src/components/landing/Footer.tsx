export default function Footer() {
  return (
    <footer className="border-t border-ink-10" style={{ padding: '40px 48px' }}>
      <div className="max-w-[1100px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-ink-40">
        <span>&copy; 2026 FORGEdesk</span>
        <div className="flex items-center gap-3">
          <a href="/privacy" className="hover:text-ink-60 transition-colors">
            Privacy
          </a>
          <span className="text-ink-20">&middot;</span>
          <a href="/voorwaarden" className="hover:text-ink-60 transition-colors">
            Voorwaarden
          </a>
          <span className="text-ink-20">&middot;</span>
          <a href="mailto:support@forgedesk.io" className="hover:text-ink-60 transition-colors">
            support@forgedesk.io
          </a>
        </div>
      </div>
    </footer>
  );
}
