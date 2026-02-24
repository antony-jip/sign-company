#!/usr/bin/env python3
"""
deploy-kennisbank.py - Deploy Sign Company Kennisbank to WordPress via WP-CLI

Extracts content and metadata from standalone HTML files and creates/updates
WordPress pages with proper Yoast SEO fields and structured data.

Usage:
  # Dry run - preview what would happen
  python3 deploy-kennisbank.py --dry-run

  # Deploy all pages as drafts (safe - review before publishing)
  python3 deploy-kennisbank.py --wp-path /var/www/html

  # Deploy a single page
  python3 deploy-kennisbank.py --wp-path /var/www/html --file kennisbank/gevelreclame/wat-kost-gevelreclame.html

  # Update existing pages
  python3 deploy-kennisbank.py --wp-path /var/www/html --update

  # Generate bash script instead of executing directly
  python3 deploy-kennisbank.py --generate-script > deploy-commands.sh

Requirements:
  - Python 3.6+
  - WP-CLI installed and in PATH (unless using --generate-script)
  - Run on the WordPress server, or use WP-CLI's --ssh flag

Notes:
  - Pages are created as DRAFT by default (use --status publish for live)
  - JSON-LD structured data is stored in post_content AND as post meta
  - The WordPress theme should hide the page title (content has its own H1)
  - Satoshi font link is included in post_content; Excon is loaded by the theme
  - Template files (master-template, template-*) are automatically skipped
"""

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path


# =============================================================================
# HTML Extraction
# =============================================================================

def extract_meta(html):
    """Extract SEO metadata from the HTML <head> section."""
    meta = {}

    # Title
    m = re.search(r'<title>([^<]+)</title>', html)
    meta['title'] = m.group(1).strip() if m else ''

    # Slug from canonical URL
    m = re.search(r'rel="canonical"\s+href="https://www\.signcompany\.nl/([^"]+)"', html)
    meta['slug'] = m.group(1) if m else ''

    # Meta description
    m = re.search(r'<meta\s+name="description"\s+content="([^"]*)"', html)
    meta['meta_desc'] = m.group(1) if m else ''

    # OG description (often slightly longer than meta desc)
    m = re.search(r'og:description"\s+content="([^"]*)"', html)
    meta['og_desc'] = m.group(1) if m else meta['meta_desc']

    # OG title
    m = re.search(r'og:title"\s+content="([^"]*)"', html)
    meta['og_title'] = m.group(1) if m else meta['title']

    # OG image
    m = re.search(r'og:image"\s+content="([^"]*)"', html)
    meta['og_image'] = m.group(1) if m else ''

    # Publish date
    m = re.search(r'article:published_time"\s+content="([^"]*)"', html)
    meta['publish_date'] = m.group(1) if m else ''

    # Modified date
    m = re.search(r'article:modified_time"\s+content="([^"]*)"', html)
    meta['modified_date'] = m.group(1) if m else meta['publish_date']

    # Category
    m = re.search(r'<meta\s+name="category"\s+content="([^"]*)"', html)
    meta['category'] = m.group(1) if m else ''

    # Robots
    m = re.search(r'<meta\s+name="robots"\s+content="([^"]*)"', html)
    meta['robots'] = m.group(1) if m else 'index, follow'

    return meta


def extract_jsonld(html):
    """Extract all JSON-LD structured data blocks."""
    blocks = re.findall(
        r'<script\s+type="application/ld\+json">\s*(.*?)\s*</script>',
        html, re.DOTALL
    )
    return blocks


def extract_style(html):
    """Extract the inline CSS <style> block."""
    m = re.search(r'<style>(.*?)</style>', html, re.DOTALL)
    return m.group(0) if m else ''  # Return full <style>...</style> tag


def extract_body(html):
    """Extract everything between <body> and </body>."""
    m = re.search(r'<body>\s*(.*?)\s*</body>', html, re.DOTALL)
    return m.group(1).strip() if m else ''


def extract_font_link(html):
    """Extract the Satoshi font <link> tag."""
    m = re.search(r'(<link\s+href="https://api\.fontshare\.com[^>]+>)', html)
    return m.group(1) if m else ''


def build_post_content(html):
    """
    Build the WordPress post_content from a standalone HTML file.

    Structure:
      1. Font <link> tag (Satoshi - Excon is loaded by theme)
      2. JSON-LD <script> blocks (structured data)
      3. <style> block (all CSS)
      4. Body HTML (hero, article, CTA, FAQ, services strip, etc.)
    """
    font_link = extract_font_link(html)
    jsonld_blocks = extract_jsonld(html)
    style = extract_style(html)
    body = extract_body(html)

    parts = []

    # Font link
    if font_link:
        parts.append(font_link)

    # JSON-LD structured data
    for block in jsonld_blocks:
        parts.append(f'<script type="application/ld+json">\n{block}\n</script>')

    # CSS style block
    if style:
        parts.append(style)

    # Body content
    if body:
        parts.append(body)

    return '\n\n'.join(parts)


def build_jsonld_combined(html):
    """Combine all JSON-LD blocks into a single JSON array for post meta."""
    blocks = extract_jsonld(html)
    parsed = []
    for block in blocks:
        try:
            parsed.append(json.loads(block))
        except json.JSONDecodeError:
            parsed.append(block)  # Keep as string if not valid JSON
    return json.dumps(parsed, ensure_ascii=False) if parsed else ''


# =============================================================================
# WP-CLI Execution
# =============================================================================

def wp_cli(cmd, wp_path=None, input_data=None, dry_run=False, verbose=False):
    """Execute a WP-CLI command and return stdout."""
    full_cmd = ['wp'] + cmd
    if wp_path:
        full_cmd.append(f'--path={wp_path}')

    if verbose:
        # Mask long content in display
        display = ' '.join(
            c if len(c) < 200 else c[:50] + '...[truncated]'
            for c in full_cmd
        )
        print(f"    $ {display}", file=sys.stderr)

    if dry_run:
        return '0'

    try:
        result = subprocess.run(
            full_cmd,
            input=input_data,
            capture_output=True,
            text=True,
            timeout=120
        )
        if result.returncode != 0:
            raise RuntimeError(f"WP-CLI error: {result.stderr.strip()}")
        return result.stdout.strip()
    except FileNotFoundError:
        raise RuntimeError(
            "WP-CLI ('wp') not found. Install it or use --generate-script mode."
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError("WP-CLI command timed out after 120s")


def find_existing_post(slug, post_type, wp_path, dry_run=False, verbose=False):
    """Find an existing WordPress post/page by slug."""
    try:
        result = wp_cli(
            ['post', 'list',
             f'--post_type={post_type}',
             f'--name={slug}',
             '--field=ID',
             '--post_status=any'],
            wp_path=wp_path, dry_run=False, verbose=verbose  # Always query, even in dry run
        )
        return result.strip() if result.strip() else None
    except RuntimeError:
        return None


# =============================================================================
# Deployment
# =============================================================================

def deploy_file(filepath, args, results):
    """Deploy a single HTML file to WordPress."""
    with open(filepath, 'r', encoding='utf-8') as f:
        html = f.read()

    meta = extract_meta(html)
    post_content = build_post_content(html)
    jsonld_meta = build_jsonld_combined(html)

    if not meta['slug']:
        results['errors'].append((str(filepath), 'No canonical URL/slug found'))
        print(f"  ERROR: No slug found in {filepath}", file=sys.stderr)
        return

    prefix = '[DRY RUN] ' if args.dry_run else ''
    print(f"\n{prefix}Deploying: {meta['slug']}")
    print(f"  Title:    {meta['title']}")
    print(f"  Desc:     {meta['meta_desc'][:80]}...")
    print(f"  Category: {meta['category']}")

    # Check for existing post
    existing_id = None
    if not args.dry_run:
        existing_id = find_existing_post(
            meta['slug'], args.post_type, args.wp_path, verbose=args.verbose
        )

    if existing_id and not args.update:
        print(f"  SKIP: Already exists (ID: {existing_id}). Use --update to overwrite.")
        results['skipped'].append((str(filepath), meta['slug'], existing_id))
        return

    # Write content to temp file (avoids shell escaping issues entirely)
    tmp = tempfile.NamedTemporaryFile(
        mode='w', suffix='.html', delete=False, encoding='utf-8'
    )
    try:
        tmp.write(post_content)
        tmp.close()

        # Build date args
        date_args = []
        if meta['publish_date']:
            date_args.append(f"--post_date={meta['publish_date']} 09:00:00")

        if existing_id and args.update:
            # --- UPDATE existing post ---
            wp_cli(
                ['post', 'update', existing_id, tmp.name,
                 f"--post_title={meta['title']}",
                 f"--post_name={meta['slug']}",
                 f"--post_status={args.status}"]
                + date_args,
                wp_path=args.wp_path, dry_run=args.dry_run, verbose=args.verbose
            )
            post_id = existing_id
            results['updated'].append((str(filepath), meta['slug'], post_id))
            print(f"  UPDATED: Post ID {post_id}")
        else:
            # --- CREATE new post ---
            post_id = wp_cli(
                ['post', 'create', tmp.name,
                 f'--post_type={args.post_type}',
                 f"--post_title={meta['title']}",
                 f"--post_name={meta['slug']}",
                 f'--post_status={args.status}',
                 f'--post_author={args.author}',
                 '--porcelain']
                + date_args,
                wp_path=args.wp_path, dry_run=args.dry_run, verbose=args.verbose
            )
            results['created'].append((str(filepath), meta['slug'], post_id))
            print(f"  CREATED: Post ID {post_id}")

        # --- Set Yoast SEO meta fields ---
        if not args.dry_run and post_id:
            yoast_fields = {
                '_yoast_wpseo_title': meta['og_title'],
                '_yoast_wpseo_metadesc': meta['meta_desc'],
                '_yoast_wpseo_opengraph-title': meta['og_title'],
                '_yoast_wpseo_opengraph-description': meta['og_desc'],
                '_yoast_wpseo_opengraph-image': meta['og_image'],
                '_yoast_wpseo_twitter-title': meta['og_title'],
                '_yoast_wpseo_twitter-description': meta['og_desc'],
            }
            # Disable Yoast's own schema to avoid duplicates with our JSON-LD
            yoast_fields['_yoast_wpseo_schema_page_type'] = 'None'
            yoast_fields['_yoast_wpseo_schema_article_type'] = 'None'

            for key, value in yoast_fields.items():
                if value:
                    wp_cli(
                        ['post', 'meta', 'update', str(post_id), key, value],
                        wp_path=args.wp_path, verbose=args.verbose
                    )

            # Store JSON-LD as custom field (backup, can be output via theme)
            if jsonld_meta:
                wp_cli(
                    ['post', 'meta', 'update', str(post_id),
                     '_kennisbank_jsonld', jsonld_meta],
                    wp_path=args.wp_path, verbose=args.verbose
                )

            print(f"  SEO meta fields set ({len([v for v in yoast_fields.values() if v])} fields)")

    finally:
        os.unlink(tmp.name)


def generate_script(filepath, args):
    """Generate bash commands for deploying a single file (--generate-script mode)."""
    with open(filepath, 'r', encoding='utf-8') as f:
        html = f.read()

    meta = extract_meta(html)
    post_content = build_post_content(html)
    jsonld_meta = build_jsonld_combined(html)

    if not meta['slug']:
        return

    # Sanitize for shell - write content to a file
    safe_slug = meta['slug'].replace('/', '-')
    content_file = f"/tmp/kb-deploy/{safe_slug}.html"

    lines = []
    lines.append(f'\n# --- {meta["slug"]} ---')
    lines.append(f'echo "Deploying: {meta["slug"]}"')

    # Create content file using heredoc with unique delimiter
    lines.append(f"mkdir -p /tmp/kb-deploy")
    # Use base64 encoding to avoid ANY shell escaping issues
    import base64
    encoded = base64.b64encode(post_content.encode('utf-8')).decode('ascii')
    lines.append(f"echo '{encoded}' | base64 -d > '{content_file}'")

    # WP path arg
    wp = f'wp --path={args.wp_path}' if args.wp_path else 'wp'

    # Date arg
    date_arg = f" --post_date='{meta['publish_date']} 09:00:00'" if meta['publish_date'] else ''

    if args.update:
        lines.append(f"EXISTING_ID=$({wp} post list --post_type={args.post_type} --name='{meta['slug']}' --field=ID --post_status=any 2>/dev/null)")
        lines.append('if [ -n "$EXISTING_ID" ]; then')
        lines.append(f"  {wp} post update $EXISTING_ID '{content_file}'"
                     f" --post_title='{_shell_escape(meta['title'])}'"
                     f" --post_name='{meta['slug']}'"
                     f" --post_status={args.status}{date_arg}")
        lines.append('  POST_ID=$EXISTING_ID')
        lines.append('  echo "  UPDATED: Post ID $POST_ID"')
        lines.append('else')
        lines.append(f"  POST_ID=$({wp} post create '{content_file}'"
                     f" --post_type={args.post_type}"
                     f" --post_title='{_shell_escape(meta['title'])}'"
                     f" --post_name='{meta['slug']}'"
                     f" --post_status={args.status}"
                     f" --post_author={args.author}"
                     f" --porcelain{date_arg})")
        lines.append('  echo "  CREATED: Post ID $POST_ID"')
        lines.append('fi')
    else:
        lines.append(f"POST_ID=$({wp} post create '{content_file}'"
                     f" --post_type={args.post_type}"
                     f" --post_title='{_shell_escape(meta['title'])}'"
                     f" --post_name='{meta['slug']}'"
                     f" --post_status={args.status}"
                     f" --post_author={args.author}"
                     f" --porcelain{date_arg})")
        lines.append('echo "  CREATED: Post ID $POST_ID"')

    # Yoast SEO fields
    yoast = {
        '_yoast_wpseo_title': meta['og_title'],
        '_yoast_wpseo_metadesc': meta['meta_desc'],
        '_yoast_wpseo_opengraph-title': meta['og_title'],
        '_yoast_wpseo_opengraph-description': meta['og_desc'],
        '_yoast_wpseo_opengraph-image': meta['og_image'],
        '_yoast_wpseo_twitter-title': meta['og_title'],
        '_yoast_wpseo_twitter-description': meta['og_desc'],
        '_yoast_wpseo_schema_page_type': 'None',
        '_yoast_wpseo_schema_article_type': 'None',
    }
    for key, value in yoast.items():
        if value:
            lines.append(f"{wp} post meta update $POST_ID '{key}' '{_shell_escape(value)}'")

    return '\n'.join(lines)


def _shell_escape(s):
    """Escape single quotes for shell strings."""
    return s.replace("'", "'\\''")


# =============================================================================
# File Discovery
# =============================================================================

def find_html_files(source_dir):
    """Find all deployable HTML files, sorted by category then name."""
    source = Path(source_dir)
    files = []

    for html_file in sorted(source.rglob('*.html')):
        name = html_file.name.lower()

        # Skip template files
        if 'template' in name:
            continue

        files.append(html_file)

    return files


# =============================================================================
# Main
# =============================================================================

def print_summary(results):
    """Print deployment summary."""
    print("\n" + "=" * 60)
    print("DEPLOYMENT SUMMARY")
    print("=" * 60)

    if results['created']:
        print(f"\n  Created: {len(results['created'])} pages")
        for filepath, slug, post_id in results['created']:
            print(f"    ID {post_id}: {slug}")

    if results['updated']:
        print(f"\n  Updated: {len(results['updated'])} pages")
        for filepath, slug, post_id in results['updated']:
            print(f"    ID {post_id}: {slug}")

    if results['skipped']:
        print(f"\n  Skipped: {len(results['skipped'])} pages (already exist)")
        for filepath, slug, post_id in results['skipped']:
            print(f"    ID {post_id}: {slug}")

    if results['errors']:
        print(f"\n  Errors: {len(results['errors'])}")
        for filepath, error in results['errors']:
            print(f"    {filepath}: {error}")

    total = len(results['created']) + len(results['updated'])
    print(f"\n  Total deployed: {total}")
    print("=" * 60)

    # Post-deployment notes
    if total > 0:
        print("""
POST-DEPLOYMENT CHECKLIST:
  1. Check a few pages in WordPress admin to verify content
  2. Verify Yoast SEO fields are populated correctly
  3. Check that the theme hides the page title (content has its own H1)
  4. Ensure the Excon font is loaded by your WordPress theme
  5. Test structured data: https://search.google.com/test/rich-results
  6. If pages are drafts, publish them when ready
  7. Clear any caching (page cache, CDN, etc.)

OPTIONAL - Add to theme's functions.php for JSON-LD from custom field:

  add_action('wp_head', function() {
      if (is_singular('page')) {
          $jsonld = get_post_meta(get_the_ID(), '_kennisbank_jsonld', true);
          if ($jsonld) {
              $blocks = json_decode($jsonld, true);
              if (is_array($blocks)) {
                  foreach ($blocks as $block) {
                      echo '<script type="application/ld+json">'
                           . json_encode($block, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
                           . '</script>' . "\\n";
                  }
              }
          }
      }
  });
""")


def main():
    parser = argparse.ArgumentParser(
        description='Deploy Sign Company Kennisbank HTML pages to WordPress via WP-CLI',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --dry-run                          Preview deployment
  %(prog)s --wp-path /var/www/html            Deploy all as drafts
  %(prog)s --wp-path /var/www/html --update   Update existing pages
  %(prog)s --file kennisbank/gevelreclame/wat-kost-gevelreclame.html --dry-run
  %(prog)s --generate-script > deploy.sh      Generate bash script
        """
    )

    parser.add_argument(
        '--source-dir', default='kennisbank',
        help='Directory containing HTML files (default: kennisbank)'
    )
    parser.add_argument(
        '--wp-path', default=None,
        help='Path to WordPress installation (for wp --path=...)'
    )
    parser.add_argument(
        '--dry-run', action='store_true',
        help='Preview changes without deploying'
    )
    parser.add_argument(
        '--file', default=None,
        help='Deploy a single file instead of all'
    )
    parser.add_argument(
        '--post-type', default='page', choices=['page', 'post'],
        help='WordPress post type (default: page)'
    )
    parser.add_argument(
        '--status', default='draft', choices=['draft', 'publish', 'pending', 'private'],
        help='Post status (default: draft)'
    )
    parser.add_argument(
        '--update', action='store_true',
        help='Update existing pages matched by slug'
    )
    parser.add_argument(
        '--author', default='1',
        help='WordPress author ID (default: 1)'
    )
    parser.add_argument(
        '--generate-script', action='store_true',
        help='Output a bash script instead of executing WP-CLI directly'
    )
    parser.add_argument(
        '--verbose', action='store_true',
        help='Show WP-CLI commands being executed'
    )

    args = parser.parse_args()

    # Determine files to process
    if args.file:
        files = [Path(args.file)]
        if not files[0].exists():
            print(f"Error: File not found: {args.file}", file=sys.stderr)
            sys.exit(1)
    else:
        files = find_html_files(args.source_dir)

    if not files:
        print("No HTML files found to deploy.", file=sys.stderr)
        sys.exit(1)

    print(f"Found {len(files)} HTML files to deploy")
    print(f"Post type: {args.post_type} | Status: {args.status} | Update: {args.update}")

    if args.generate_script:
        # --- Generate bash script mode ---
        print("#!/bin/bash", file=sys.stdout)
        print("# Auto-generated WordPress deployment script", file=sys.stdout)
        print(f"# Generated for {len(files)} kennisbank pages", file=sys.stdout)
        print("set -euo pipefail\n", file=sys.stdout)
        print('echo "Starting deployment of kennisbank pages..."', file=sys.stdout)
        print("mkdir -p /tmp/kb-deploy\n", file=sys.stdout)

        for filepath in files:
            script_block = generate_script(filepath, args)
            if script_block:
                print(script_block, file=sys.stdout)

        print('\necho ""', file=sys.stdout)
        print('echo "Deployment complete!"', file=sys.stdout)
        print("rm -rf /tmp/kb-deploy", file=sys.stdout)
        # Summary info goes to stderr so it doesn't pollute the script
        print(f"\n# Script generated for {len(files)} pages", file=sys.stderr)
        return

    # --- Direct execution mode ---
    if not args.dry_run and not args.wp_path:
        print("Error: --wp-path is required (or use --dry-run / --generate-script)", file=sys.stderr)
        sys.exit(1)

    results = {'created': [], 'updated': [], 'skipped': [], 'errors': []}

    for filepath in files:
        try:
            deploy_file(filepath, args, results)
        except RuntimeError as e:
            results['errors'].append((str(filepath), str(e)))
            print(f"  ERROR: {e}", file=sys.stderr)
        except Exception as e:
            results['errors'].append((str(filepath), str(e)))
            print(f"  UNEXPECTED ERROR: {e}", file=sys.stderr)

    print_summary(results)


if __name__ == '__main__':
    main()
