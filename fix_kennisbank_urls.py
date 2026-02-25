#!/usr/bin/env python3
"""
Fix all kennisbank URLs for WordPress production.

Changes:
1. www.signcompany.nl → signcompany.nl  (remove www)
2. Keep /kennisbank-{slug} format (NOT /kennisbank/{slug})
3. Add trailing slash to all /kennisbank URLs that lack one

URL format: signcompany.nl/kennisbank-gevelreclame-wat-kost-gevelreclame/
Main page:  signcompany.nl/kennisbank/

Applies to: href, canonical, og:url, JSON-LD, and all other occurrences
in every .html file under kennisbank/.
"""

import os
import re

KENNISBANK_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'kennisbank')


def fix_content(content):
    """Apply all URL transformations to file content."""

    # Step A: Remove www from signcompany.nl
    content = content.replace('www.signcompany.nl', 'signcompany.nl')

    # Step B: Revert /kennisbank/ back to /kennisbank- when followed by a slug
    # /kennisbank/gevelreclame-... → /kennisbank-gevelreclame-...
    # But keep /kennisbank/" as-is (that's the main page)
    content = re.sub(r'/kennisbank/([^"/ ])', r'/kennisbank-\1', content)

    # Step C: Add trailing slash to kennisbank URLs missing one.
    # Matches /kennisbank... up to a closing " where the last char is not /
    content = re.sub(
        r'(/kennisbank[^"]*?)(?<!/)"',
        r'\1/"',
        content
    )

    return content


def main():
    modified_count = 0
    total_count = 0

    for root, dirs, files in sorted(os.walk(KENNISBANK_DIR)):
        dirs.sort()
        for fname in sorted(files):
            if not fname.endswith('.html'):
                continue
            total_count += 1
            fpath = os.path.join(root, fname)
            rel = os.path.relpath(fpath, KENNISBANK_DIR)

            with open(fpath, 'r', encoding='utf-8') as f:
                original = f.read()

            fixed = fix_content(original)

            if fixed != original:
                with open(fpath, 'w', encoding='utf-8') as f:
                    f.write(fixed)
                modified_count += 1
                print(f"  MODIFIED  {rel}")
            else:
                print(f"  unchanged {rel}")

    print(f"\n{'='*60}")
    print(f"Processed: {total_count} files | Modified: {modified_count}")
    print(f"{'='*60}")


if __name__ == '__main__':
    main()
