#!/usr/bin/env python3
"""
Scrape color names and hex values from Danawa Auto and update car details JSON.
Handles both Korean brands (한글 이름 + code) and foreign brands (English names).
"""

import json
import re
import time
from typing import Dict, List, Optional, Tuple

try:
    import requests
    from bs4 import BeautifulSoup
    HAS_BS4 = True
except ImportError:
    import requests
    HAS_BS4 = False
    print("BeautifulSoup not available, using regex-based parsing")

JSON_FILE = '/Users/heejunkim/Desktop/danawa/src/constants/generated-car-details.json'
BASE_URL = 'https://auto.danawa.com/auto/?Work=model&Model={}'
USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

# Words to exclude from color name results
EXCLUDE_WORDS = ['펼치기', '접기', '닫기', '더보기', '전체보기']


def fetch_page(model_id: str, session: requests.Session) -> Optional[str]:
    """Fetch HTML content for a car model page."""
    url = BASE_URL.format(model_id)
    try:
        response = session.get(url, headers={'User-Agent': USER_AGENT}, timeout=10)
        response.raise_for_status()
        response.encoding = response.apparent_encoding
        return response.text
    except Exception as e:
        print(f"  Error fetching {model_id}: {e}")
        return None


def extract_colors_bs4(html: str) -> List[dict]:
    """Extract color names and hex values using BeautifulSoup.
    Returns list of {name, hex} dicts.
    """
    soup = BeautifulSoup(html, 'html.parser')
    colors = []

    model_color_div = soup.find('div', class_='modelColor')
    if not model_color_div:
        return []

    # Find all button elements inside modelColor (each represents a color)
    buttons = model_color_div.find_all('button')

    for btn in buttons:
        span = btn.find('span', class_='screen_out')
        if not span:
            continue

        text = span.get_text().strip()

        # Skip non-color items
        if not text or text in EXCLUDE_WORDS:
            continue
        # Skip two-tone colors (contain "+") - these are extra options
        if '+' in text:
            continue
        # Skip if it looks like a car model name (contains parentheses with model codes like G70, NE1)
        if re.match(r'^[A-Za-z가-힣\s]+\([A-Z]+\d+\)$', text):
            continue

        # Extract color name
        # Pattern 1: Korean name with code - "세레니티 화이트 펄 (SAW)"
        match = re.search(r'([가-힣A-Za-z\s\-\.]+?)\s*\([A-Z0-9\-]+\)$', text)
        if match:
            name = match.group(1).strip()
        else:
            # Pattern 2: Plain name (English or Korean without code)
            name = text.strip()

        if not name or len(name) > 60 or len(name) < 2:
            continue

        # Extract hex from button style attribute
        style = btn.get('style', '')
        hex_match = re.search(r'background\s*:\s*#([0-9a-fA-F]{3,6})', style)
        hex_val = '#' + hex_match.group(1) if hex_match else None

        colors.append({'name': name, 'hex': hex_val})

    return colors


def extract_colors_regex(html: str) -> List[dict]:
    """Extract color names and hex values using regex only (fallback)."""
    colors = []

    # Find the modelColor section
    mc_match = re.search(r"<div class=['\"]modelColor['\"]>(.*?)</div>\s*</div>", html, re.DOTALL)
    if not mc_match:
        return []

    mc_html = mc_match.group(1)

    # Find all buttons with style and screen_out spans
    btn_pattern = r"<button[^>]*style=['\"]background\s*:\s*#([0-9a-fA-F]{3,6})['\"][^>]*>\s*<span class=['\"]screen_out['\"]>([^<]+)</span>"
    matches = re.findall(btn_pattern, mc_html)

    for hex_val, text in matches:
        text = text.strip()
        if not text or text in EXCLUDE_WORDS or '+' in text:
            continue

        match = re.search(r'([가-힣A-Za-z\s\-\.]+?)\s*\([A-Z0-9\-]+\)$', text)
        name = match.group(1).strip() if match else text.strip()

        if name and 2 <= len(name) <= 60:
            colors.append({'name': name, 'hex': '#' + hex_val})

    return colors


def find_color_price(color_name: str, selectable_options: List[Dict]) -> int:
    """Find price for a color by matching against selectableOptions."""
    if not color_name or not selectable_options:
        return 0

    clean_name = color_name.replace(' ', '').lower()

    for option in selectable_options:
        option_name = option.get('name', '')
        if '컬러' in option_name or '색상' in option_name or '외장' in option_name:
            clean_option = option_name.replace(' ', '').lower()
            if clean_name in clean_option or any(
                word.lower() in clean_option
                for word in clean_name.split()
                if len(word) > 1
            ):
                return option.get('price', 0)

    return 0


def scrape_and_update_colors(data: Dict) -> Tuple[int, int, int]:
    """Scrape color names/hex and update the data."""
    session = requests.Session()
    cars_processed = 0
    successful_scrapes = 0
    total_colors_updated = 0

    cars_with_colors = [(car_id, car_data) for car_id, car_data in data.items()
                        if 'colorImages' in car_data and len(car_data['colorImages']) > 0]

    print(f"\nProcessing {len(cars_with_colors)} cars with color images...")

    for idx, (car_id, car_data) in enumerate(cars_with_colors):
        cars_processed += 1

        if cars_processed % 10 == 0:
            print(f"Progress: {cars_processed}/{len(cars_with_colors)} cars processed")

        color_images = car_data['colorImages']
        selectable_options = car_data.get('selectableOptions', [])

        html = fetch_page(car_id, session)
        if not html:
            for color_img in color_images:
                if not color_img.get('name'):
                    color_img['name'] = ''
                if 'price' not in color_img:
                    color_img['price'] = 0
            continue

        # Extract colors (name + hex)
        if HAS_BS4:
            scraped_colors = extract_colors_bs4(html)
        else:
            scraped_colors = extract_colors_regex(html)

        if not scraped_colors:
            print(f"  [{car_id}] {car_data.get('brand', '')} {car_data.get('name', '')}: No colors found")
            for color_img in color_images:
                if not color_img.get('name'):
                    color_img['name'] = ''
                if 'price' not in color_img:
                    color_img['price'] = 0
        else:
            successful_scrapes += 1
            for i, color_img in enumerate(color_images):
                if i < len(scraped_colors):
                    sc = scraped_colors[i]
                    color_img['name'] = sc['name']
                    # Update hex from page (more accurate than image extraction)
                    if sc['hex']:
                        color_img['hex'] = sc['hex']
                    color_img['price'] = find_color_price(sc['name'], selectable_options)
                    total_colors_updated += 1
                else:
                    if not color_img.get('name'):
                        color_img['name'] = ''
                    if 'price' not in color_img:
                        color_img['price'] = 0

            print(f"  [{car_id}] {car_data.get('brand', '')} {car_data.get('name', '')}: "
                  f"Found {len(scraped_colors)} colors (images: {len(color_images)})")

        time.sleep(0.15)

    return cars_processed, successful_scrapes, total_colors_updated


def main():
    print("Loading JSON data...")
    with open(JSON_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Loaded {len(data)} cars")

    processed, successful, colors_updated = scrape_and_update_colors(data)

    print("\nWriting updated data to JSON file...")
    with open(JSON_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total cars processed: {processed}")
    print(f"Successful scrapes: {successful}")
    print(f"Failed scrapes: {processed - successful}")
    print(f"Total colors updated: {colors_updated}")
    print(f"Success rate: {successful / processed * 100:.1f}%")
    print("=" * 60)
    print(f"\nUpdated file: {JSON_FILE}")


if __name__ == '__main__':
    main()
