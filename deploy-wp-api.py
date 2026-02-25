#!/usr/bin/env python3
"""
deploy-wp-api.py - Deploy Kennisbank to WordPress via REST API with scheduling

Deploys 113 kennisbank pages to WordPress, scheduled ~15 per week.
Pages are created with parent-child hierarchy:
  kennisbank (parent)
    └── kennisbank-gevelreclame (category)
         └── kennisbank-gevelreclame-wat-kost-gevelreclame (article)

Usage:
  # Dry run - see what would happen
  python3 deploy-wp-api.py --dry-run

  # Deploy all pages (scheduled ~15/week starting today)
  python3 deploy-wp-api.py

  # Deploy and publish immediately (no scheduling)
  python3 deploy-wp-api.py --publish-now

  # Deploy single category
  python3 deploy-wp-api.py --category gevelreclame

Requirements:
  - Python 3.6+ (no extra packages needed)
  - WordPress with REST API enabled
  - Application Password (WP Admin > Users > Application Passwords)
"""

import argparse
import base64
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime, timedelta
from pathlib import Path

# =============================================================================
# Configuration
# =============================================================================

WP_URL = "https://www.signcompany.nl"
WP_USER = "antonybootsma"
WP_APP_PASSWORD = "wGxA eibK 9Vek Gv7P ighw E4xD"

PAGES_PER_WEEK = 15
START_DATE = datetime(2026, 2, 25, 9, 0, 0)  # Start scheduling from this date

# Mapping of local directory names to their canonical URL slugs
DIR_TO_SLUG = {
    "algemeen": "kennisbank-signing-algemeen",
    "autobelettering": "kennisbank-autobelettering",
    "bootstickers": "kennisbank-bootstickers",
    "event-promotie": "kennisbank-evenementen",
    "gevelreclame": "kennisbank-gevelreclame",
    "interieur": "kennisbank-interieur",
    "raamfolie": "kennisbank-raamfolie",
}

# Publication order: categories in this order, parent page first
CATEGORY_ORDER = [
    "gevelreclame",
    "autobelettering",
    "raamfolie",
    "algemeen",
    "interieur",
    "bootstickers",
    "event-promotie",
]


# =============================================================================
# HTML Extraction (reused from deploy-kennisbank.py)
# =============================================================================

def extract_meta(html):
    """Extract SEO metadata from HTML <head>."""
    meta = {}
    m = re.search(r'<title>([^<]+)</title>', html)
    meta['title'] = m.group(1).strip() if m else ''

    m = re.search(r'rel="canonical"\s+href="https://www\.signcompany\.nl/([^"]+)"', html)
    meta['slug'] = m.group(1) if m else ''

    m = re.search(r'<meta\s+name="description"\s+content="([^"]*)"', html)
    meta['meta_desc'] = m.group(1) if m else ''

    m = re.search(r'og:description"\s+content="([^"]*)"', html)
    meta['og_desc'] = m.group(1) if m else meta['meta_desc']

    m = re.search(r'og:title"\s+content="([^"]*)"', html)
    meta['og_title'] = m.group(1) if m else meta['title']

    m = re.search(r'og:image"\s+content="([^"]*)"', html)
    meta['og_image'] = m.group(1) if m else ''

    m = re.search(r'article:published_time"\s+content="([^"]*)"', html)
    meta['publish_date'] = m.group(1) if m else ''

    m = re.search(r'<meta\s+name="category"\s+content="([^"]*)"', html)
    meta['category'] = m.group(1) if m else ''

    return meta


def extract_body(html):
    """Extract everything between <body> and </body>."""
    m = re.search(r'<body>\s*(.*?)\s*</body>', html, re.DOTALL)
    return m.group(1).strip() if m else ''


def extract_style(html):
    """Extract the inline CSS <style> block."""
    m = re.search(r'<style>(.*?)</style>', html, re.DOTALL)
    return m.group(0) if m else ''


def extract_jsonld(html):
    """Extract all JSON-LD blocks."""
    return re.findall(
        r'<script\s+type="application/ld\+json">\s*(.*?)\s*</script>',
        html, re.DOTALL
    )


def extract_font_link(html):
    """Extract the Satoshi font <link> tag."""
    m = re.search(r'(<link\s+href="https://api\.fontshare\.com[^>]+>)', html)
    return m.group(1) if m else ''


def build_post_content(html):
    """Build WordPress post_content from standalone HTML file."""
    font_link = extract_font_link(html)
    jsonld_blocks = extract_jsonld(html)
    style = extract_style(html)
    body = extract_body(html)

    parts = []
    if font_link:
        parts.append(font_link)
    for block in jsonld_blocks:
        parts.append(f'<script type="application/ld+json">\n{block}\n</script>')
    if style:
        parts.append(style)
    if body:
        parts.append(body)

    return '\n\n'.join(parts)


# =============================================================================
# WordPress REST API
# =============================================================================

def wp_api(endpoint, method="GET", data=None, retry=3):
    """Make a WordPress REST API request."""
    url = f"{WP_URL}/wp-json/wp/v2/{endpoint}"

    credentials = base64.b64encode(f"{WP_USER}:{WP_APP_PASSWORD}".encode()).decode()

    headers = {
        "Authorization": f"Basic {credentials}",
        "Content-Type": "application/json",
        "User-Agent": "SignCompany-Deploy/1.0",
    }

    body = json.dumps(data).encode('utf-8') if data else None

    for attempt in range(retry):
        try:
            req = urllib.request.Request(url, data=body, headers=headers, method=method)
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8', errors='replace')
            if e.code == 400:
                print(f"    API Error 400: {error_body[:200]}", file=sys.stderr)
                return None
            if attempt < retry - 1:
                wait = 2 ** (attempt + 1)
                print(f"    HTTP {e.code}, retrying in {wait}s...", file=sys.stderr)
                time.sleep(wait)
            else:
                print(f"    FAILED after {retry} attempts: HTTP {e.code}", file=sys.stderr)
                print(f"    Response: {error_body[:300]}", file=sys.stderr)
                raise
        except urllib.error.URLError as e:
            if attempt < retry - 1:
                wait = 2 ** (attempt + 1)
                print(f"    Connection error, retrying in {wait}s...", file=sys.stderr)
                time.sleep(wait)
            else:
                raise


def find_page_by_slug(slug):
    """Find an existing WordPress page by slug."""
    # Search both published and draft
    for status in ['publish', 'draft', 'future', 'pending', 'private']:
        try:
            results = wp_api(f"pages?slug={slug}&status={status}&per_page=1")
            if results:
                return results[0]
        except Exception:
            pass
    return None


def create_page(title, slug, content, parent_id=0, status="draft", date=None,
                meta_desc="", og_title="", og_desc="", og_image="", dry_run=False):
    """Create a WordPress page via REST API."""
    data = {
        "title": title,
        "slug": slug,
        "content": content,
        "status": status,
        "parent": parent_id,
        "template": "",  # Use default template
    }

    if date and status == "future":
        data["date"] = date.strftime("%Y-%m-%dT%H:%M:%S")

    # Yoast SEO fields (if Yoast REST API is enabled)
    yoast_meta = {}
    if meta_desc:
        yoast_meta["yoast_wpseo_metadesc"] = meta_desc
    if og_title:
        yoast_meta["yoast_wpseo_title"] = og_title
    if og_desc:
        yoast_meta["yoast_wpseo_opengraph-description"] = og_desc

    if yoast_meta:
        data["meta"] = yoast_meta

    if dry_run:
        return {"id": 0, "slug": slug, "status": status, "link": f"{WP_URL}/{slug}"}

    result = wp_api("pages", method="POST", data=data)
    return result


def update_page(page_id, **kwargs):
    """Update an existing WordPress page."""
    return wp_api(f"pages/{page_id}", method="POST", data=kwargs)


# =============================================================================
# Scheduling
# =============================================================================

def generate_schedule(total_pages, pages_per_week, start_date):
    """
    Generate publication dates for pages.
    Spreads pages evenly across weekdays (Mon-Fri).
    ~15 pages/week = 3 pages/day on weekdays.
    """
    dates = []
    current_date = start_date
    pages_this_week = 0

    for i in range(total_pages):
        # Skip weekends
        while current_date.weekday() >= 5:  # 5=Sat, 6=Sun
            current_date += timedelta(days=1)

        dates.append(current_date)
        pages_this_week += 1

        # Spread 3 per day: 09:00, 12:00, 15:00
        hour = current_date.hour
        if hour < 12:
            current_date = current_date.replace(hour=12)
        elif hour < 15:
            current_date = current_date.replace(hour=15)
        else:
            # Next day at 09:00
            current_date = (current_date + timedelta(days=1)).replace(hour=9, minute=0)

        # Reset weekly counter
        if pages_this_week >= pages_per_week:
            # Jump to next Monday
            days_until_monday = (7 - current_date.weekday()) % 7
            if days_until_monday == 0:
                days_until_monday = 7
            current_date = (current_date + timedelta(days=days_until_monday)).replace(hour=9, minute=0)
            pages_this_week = 0

    return dates


# =============================================================================
# File Discovery & Ordering
# =============================================================================

def build_deploy_list(source_dir, category_filter=None):
    """
    Build ordered list of pages to deploy.

    Order:
      1. kennisbank/index.html (parent page)
      2. For each category (in CATEGORY_ORDER):
         a. Category index page
         b. Article pages (alphabetical)
    """
    source = Path(source_dir)
    deploy_list = []

    # 1. Parent page: kennisbank/index.html
    parent_index = source / "index.html"
    if parent_index.exists():
        deploy_list.append({
            "file": parent_index,
            "type": "parent",
            "category": None,
        })

    # 2. Category pages + articles
    for cat_dir_name in CATEGORY_ORDER:
        if category_filter and cat_dir_name != category_filter:
            continue

        cat_dir = source / cat_dir_name
        if not cat_dir.exists():
            print(f"  Warning: directory not found: {cat_dir}", file=sys.stderr)
            continue

        # Category index
        cat_index = cat_dir / "index.html"
        if cat_index.exists():
            deploy_list.append({
                "file": cat_index,
                "type": "category",
                "category": cat_dir_name,
            })

        # Article pages (skip index, skip templates)
        articles = sorted(
            f for f in cat_dir.glob("*.html")
            if f.name != "index.html" and "template" not in f.name.lower()
        )
        for article in articles:
            deploy_list.append({
                "file": article,
                "type": "article",
                "category": cat_dir_name,
            })

    return deploy_list


# =============================================================================
# Main Deploy
# =============================================================================

def deploy(args):
    source_dir = args.source_dir
    dry_run = args.dry_run
    publish_now = args.publish_now

    deploy_list = build_deploy_list(source_dir, args.category)

    if not deploy_list:
        print("No files found to deploy.", file=sys.stderr)
        sys.exit(1)

    print(f"{'='*60}")
    print(f"KENNISBANK DEPLOY - Sign Company")
    print(f"{'='*60}")
    print(f"Pages to deploy: {len(deploy_list)}")
    print(f"Mode: {'DRY RUN' if dry_run else 'LIVE'}")
    print(f"Schedule: {'Immediately' if publish_now else f'~{PAGES_PER_WEEK}/week from {START_DATE.strftime(\"%d-%m-%Y\")}'}")
    print(f"{'='*60}\n")

    # Generate schedule
    if publish_now:
        dates = [None] * len(deploy_list)
    else:
        dates = generate_schedule(len(deploy_list), PAGES_PER_WEEK, START_DATE)

    # Track parent/category page IDs for hierarchy
    parent_page_id = 0
    category_page_ids = {}

    # Check if kennisbank parent already exists
    if not dry_run:
        existing_parent = find_page_by_slug("kennisbank")
        if existing_parent:
            parent_page_id = existing_parent["id"]
            print(f"Found existing parent page 'kennisbank' (ID: {parent_page_id})")

        # Check existing category pages
        for cat_dir_name, cat_slug in DIR_TO_SLUG.items():
            existing_cat = find_page_by_slug(cat_slug)
            if existing_cat:
                category_page_ids[cat_dir_name] = existing_cat["id"]
                print(f"Found existing category page '{cat_slug}' (ID: {existing_cat['id']})")

    results = {"created": [], "skipped": [], "errors": []}

    for i, item in enumerate(deploy_list):
        filepath = item["file"]
        page_type = item["type"]
        category = item["category"]
        schedule_date = dates[i]

        # Read and parse HTML
        with open(filepath, "r", encoding="utf-8") as f:
            html = f.read()

        meta = extract_meta(html)
        post_content = build_post_content(html)

        if not meta["slug"]:
            results["errors"].append((str(filepath), "No slug found"))
            continue

        slug = meta["slug"]
        title = meta["title"]

        # Determine parent ID
        if page_type == "parent":
            pid = 0
        elif page_type == "category":
            pid = parent_page_id
        else:  # article
            pid = category_page_ids.get(category, parent_page_id)

        # Determine status
        if publish_now:
            status = "publish"
        elif schedule_date and schedule_date > datetime.now():
            status = "future"
        else:
            status = "publish"  # Past dates get published immediately

        # Format schedule info
        if schedule_date:
            date_str = schedule_date.strftime("%d-%m-%Y %H:%M")
            week_num = ((schedule_date - START_DATE).days // 7) + 1
        else:
            date_str = "nu"
            week_num = 0

        prefix = "[DRY RUN] " if dry_run else ""
        type_label = {"parent": "PARENT", "category": "CATEGORIE", "article": "ARTIKEL"}[page_type]

        print(f"{prefix}[{i+1:3d}/{len(deploy_list)}] {type_label:10s} | {slug}")
        print(f"  Titel:    {title[:70]}")
        print(f"  Parent:   ID {pid}")
        if schedule_date:
            print(f"  Planning: {date_str} (week {week_num})")
        print(f"  Status:   {status}")

        if dry_run:
            results["created"].append((str(filepath), slug, 0, date_str))
            print()
            continue

        # Check if page already exists
        if not args.update:
            existing = find_page_by_slug(slug)
            if existing:
                eid = existing["id"]
                print(f"  BESTAAT AL (ID: {eid}) - skip (gebruik --update om te overschrijven)")
                results["skipped"].append((str(filepath), slug, eid))

                # Still track IDs for hierarchy
                if page_type == "parent":
                    parent_page_id = eid
                elif page_type == "category":
                    category_page_ids[category] = eid
                print()
                continue

        try:
            result = create_page(
                title=title,
                slug=slug,
                content=post_content,
                parent_id=pid,
                status=status,
                date=schedule_date,
                meta_desc=meta["meta_desc"],
                og_title=meta["og_title"],
                og_desc=meta["og_desc"],
                og_image=meta["og_image"],
                dry_run=dry_run,
            )

            if result:
                post_id = result.get("id", 0)
                results["created"].append((str(filepath), slug, post_id, date_str))
                print(f"  AANGEMAAKT: ID {post_id}")

                # Track IDs for hierarchy
                if page_type == "parent":
                    parent_page_id = post_id
                elif page_type == "category":
                    category_page_ids[category] = post_id
            else:
                results["errors"].append((str(filepath), "API returned None"))
                print(f"  FOUT: API gaf geen resultaat terug")

        except Exception as e:
            results["errors"].append((str(filepath), str(e)))
            print(f"  FOUT: {e}")

        # Rate limiting: wait between API calls
        if not dry_run:
            time.sleep(1)

        print()

    # Summary
    print(f"\n{'='*60}")
    print(f"SAMENVATTING")
    print(f"{'='*60}")
    print(f"  Aangemaakt:  {len(results['created'])}")
    print(f"  Overgeslagen: {len(results['skipped'])}")
    print(f"  Fouten:      {len(results['errors'])}")

    if results["errors"]:
        print(f"\nFouten:")
        for filepath, error in results["errors"]:
            print(f"  {filepath}: {error}")

    if not publish_now and dates and dates[-1]:
        print(f"\nPlanning: {dates[0].strftime('%d-%m-%Y')} t/m {dates[-1].strftime('%d-%m-%Y')}")
        total_weeks = ((dates[-1] - dates[0]).days // 7) + 1
        print(f"Totaal: {total_weeks} weken")

    print(f"{'='*60}")


# =============================================================================
# Entry Point
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Deploy Kennisbank naar WordPress via REST API met weekplanning",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--dry-run", action="store_true", help="Preview zonder te deployen")
    parser.add_argument("--publish-now", action="store_true", help="Direct publiceren (geen inplanning)")
    parser.add_argument("--source-dir", default="kennisbank", help="Map met HTML bestanden")
    parser.add_argument("--category", default=None, choices=CATEGORY_ORDER, help="Alleen deze categorie deployen")
    parser.add_argument("--update", action="store_true", help="Bestaande pagina's overschrijven")
    parser.add_argument("--pages-per-week", type=int, default=PAGES_PER_WEEK, help=f"Pagina's per week (default: {PAGES_PER_WEEK})")

    args = parser.parse_args()

    global PAGES_PER_WEEK
    PAGES_PER_WEEK = args.pages_per_week

    deploy(args)


if __name__ == "__main__":
    main()
