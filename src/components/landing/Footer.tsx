export default function Footer() {
  return (
    <footer className="border-t border-gray-100 py-8">
      <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
        <span>&copy; 2026 FORGEdesk</span>
        <div className="flex items-center gap-4">
          <a href="/privacy" className="hover:text-gray-600 transition-colors">
            Privacy
          </a>
          <span className="text-gray-200">&middot;</span>
          <a href="/voorwaarden" className="hover:text-gray-600 transition-colors">
            Voorwaarden
          </a>
          <span className="text-gray-200">&middot;</span>
          <a href="mailto:support@forgedesk.io" className="hover:text-gray-600 transition-colors">
            support@forgedesk.io
          </a>
        </div>
      </div>
    </footer>
  );
}
