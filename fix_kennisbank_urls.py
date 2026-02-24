#!/usr/bin/env python3
"""
Fix all URLs in Sign Company kennisbank HTML files for production deployment.

Changes applied:
1. Add 'www' to all signcompany.nl URLs
2. Convert /kennisbank#category → /kennisbank-category (hash anchors)
3. Convert /kennisbank/category-dir → /kennisbank-url-category (category pages)
4. Convert /kennisbank/article-slug → /kennisbank-category-slug (articles)
5. Catch-all: remaining /kennisbank/x → /kennisbank-x
6. Make relative href links absolute (https://www.signcompany.nl/...)
7. Remove trailing slashes from all internal links
"""

import os
import re

KENNISBANK_DIR = '/home/user/sign-company/kennisbank'
DOMAIN = 'https://www.signcompany.nl'

# Directory name → URL category slug
DIR_TO_CATEGORY = {
    'gevelreclame': 'gevelreclame',
    'autobelettering': 'autobelettering',
    'raamfolie': 'raamfolie',
    'interieur': 'interieur',
    'bootstickers': 'bootstickers',
    'event-promotie': 'evenementen',
    'algemeen': 'signing-algemeen',
}

# Lookahead: slug ends when followed by a non-slug character or end of string
SLUG_END = r'(?=[^a-z0-9-]|$)'


def build_slug_mapping():
    """Build mapping of article slug → URL category slug from the file system."""
    mapping = {}
    for dir_name, cat_slug in DIR_TO_CATEGORY.items():
        dir_path = os.path.join(KENNISBANK_DIR, dir_name)
        if not os.path.isdir(dir_path):
            print(f"  WARNING: Directory not found: {dir_path}")
            continue
        for fname in os.listdir(dir_path):
            if fname.endswith('.html') and fname != 'index.html':
                slug = fname[:-5]
                mapping[slug] = cat_slug
    return mapping


def fix_content(content, slug_to_cat):
    """Apply all URL fixes to HTML content string."""

    # 1) Add www to all signcompany.nl URLs
    content = content.replace('https://signcompany.nl', DOMAIN)

    # 2) Fix hash anchors: /kennisbank#dir-name → /kennisbank-category
    for dir_name, cat_slug in DIR_TO_CATEGORY.items():
        content = content.replace(
            f'/kennisbank#{dir_name}',
            f'/kennisbank-{cat_slug}'
        )

    # 3) Fix category directory paths: /kennisbank/dir-name → /kennisbank-category
    #    Longest first to avoid partial matches
    for dir_name in sorted(DIR_TO_CATEGORY, key=len, reverse=True):
        cat_slug = DIR_TO_CATEGORY[dir_name]
        content = re.sub(
            rf'/kennisbank/{re.escape(dir_name)}{SLUG_END}',
            f'/kennisbank-{cat_slug}',
            content
        )

    # 4) Fix article slug paths: /kennisbank/slug → /kennisbank-category-slug
    #    Longest first to avoid partial matches
    for slug in sorted(slug_to_cat, key=len, reverse=True):
        cat = slug_to_cat[slug]
        content = re.sub(
            rf'/kennisbank/{re.escape(slug)}{SLUG_END}',
            f'/kennisbank-{cat}-{slug}',
            content
        )

    # 5) Catch-all: any remaining /kennisbank/something → /kennisbank-something
    #    (handles unknown slugs not in our file mapping)
    content = re.sub(
        r'/kennisbank/([a-z0-9][a-z0-9-]*)',
        lambda m: f'/kennisbank-{m.group(1)}',
        content
    )

    # 6) Make relative href links absolute + strip trailing slashes
    def absolutize(m):
        path = m.group(1)
        # Remove trailing slash (but keep bare /)
        if path.endswith('/') and len(path) > 1:
            path = path.rstrip('/')
        return f'href="{DOMAIN}{path}"'

    content = re.sub(r'href="(/[^"]*)"', absolutize, content)

    return content


def extract_signcompany_urls(content):
    """Extract all unique signcompany.nl URLs from content."""
    urls = set()
    # href, content, src attributes
    urls.update(re.findall(
        r'(?:href|content|src)="(https://www\.signcompany\.nl[^"]*)"', content
    ))
    # JSON-LD url/item/mainEntityOfPage fields
    urls.update(re.findall(
        r'"(?:url|item|mainEntityOfPage)"\s*:\s*"(https://www\.signcompany\.nl[^"]*)"', content
    ))
    return urls


def main():
    slug_to_cat = build_slug_mapping()
    print(f"Slug mapping built: {len(slug_to_cat)} articles across {len(DIR_TO_CATEGORY)} categories")
    print()

    all_urls = set()
    modified = 0
    total = 0

    for root, dirs, files in sorted(os.walk(KENNISBANK_DIR)):
        dirs.sort()
        for fname in sorted(files):
            if not fname.endswith('.html'):
                continue
            total += 1
            fpath = os.path.join(root, fname)
            rel = os.path.relpath(fpath, KENNISBANK_DIR)

            with open(fpath, 'r', encoding='utf-8') as f:
                original = f.read()

            fixed = fix_content(original, slug_to_cat)
            all_urls.update(extract_signcompany_urls(fixed))

            if fixed != original:
                with open(fpath, 'w', encoding='utf-8') as f:
                    f.write(fixed)
                modified += 1
                print(f"  MODIFIED  {rel}")
            else:
                print(f"  unchanged {rel}")

    print(f"\n{'='*70}")
    print(f"Processed: {total} files | Modified: {modified} files")
    print(f"{'='*70}\n")

    # Separate kennisbank URLs from other site URLs
    kb_urls = sorted(u for u in all_urls if '/kennisbank' in u)
    other_urls = sorted(u for u in all_urls if '/kennisbank' not in u)

    print(f"KENNISBANK URLs ({len(kb_urls)}):")
    print('-' * 70)
    for u in kb_urls:
        print(f"  {u}")

    print(f"\nOVERIGE SITE URLs ({len(other_urls)}):")
    print('-' * 70)
    for u in other_urls:
        print(f"  {u}")

    # Check for remaining problems
    print(f"\n{'='*70}")
    print("VERIFICATIE - Zoeken naar overgebleven problemen...")
    print('=' * 70)

    problems = 0
    for root, dirs, files in os.walk(KENNISBANK_DIR):
        for fname in sorted(files):
            if not fname.endswith('.html'):
                continue
            fpath = os.path.join(root, fname)
            rel = os.path.relpath(fpath, KENNISBANK_DIR)
            with open(fpath, 'r', encoding='utf-8') as f:
                content = f.read()

            # Check for signcompany.nl without www
            matches = re.findall(r'https://signcompany\.nl', content)
            if matches:
                print(f"  PROBLEEM [{rel}]: {len(matches)}x signcompany.nl zonder www")
                problems += len(matches)

            # Check for /kennisbank/ (slash after kennisbank)
            matches = re.findall(r'/kennisbank/[a-z]', content)
            if matches:
                print(f"  PROBLEEM [{rel}]: {len(matches)}x /kennisbank/ met slash")
                problems += len(matches)

            # Check for kennisbank# (hash anchors)
            matches = re.findall(r'kennisbank#', content)
            if matches:
                print(f"  PROBLEEM [{rel}]: {len(matches)}x kennisbank# hash anchor")
                problems += len(matches)

            # Check for relative href links
            matches = re.findall(r'href="/[^"]*"', content)
            if matches:
                print(f"  PROBLEEM [{rel}]: {len(matches)}x relatieve link")
                problems += len(matches)

            # Check for trailing slashes on signcompany URLs
            matches = re.findall(r'www\.signcompany\.nl/[^"]*/"', content)
            if matches:
                print(f"  PROBLEEM [{rel}]: {len(matches)}x trailing slash")
                problems += len(matches)

    if problems == 0:
        print("  Geen problemen gevonden! Alle URLs zijn productie-klaar.")
    else:
        print(f"\n  TOTAAL: {problems} problemen gevonden")


if __name__ == '__main__':
    main()
