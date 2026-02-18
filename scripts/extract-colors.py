#!/usr/bin/env python3
"""
Extract dominant colors from car color images and update the JSON data file.
"""

import json
import requests
from PIL import Image
from io import BytesIO
from collections import Counter
import time
import sys

def rgb_to_hex(r, g, b):
    """Convert RGB values to hex color string."""
    return f"#{r:02x}{g:02x}{b:02x}"

def is_background_color(r, g, b):
    """Check if color is likely background (white or light gray)."""
    # Skip very light colors (close to white)
    if r > 240 and g > 240 and b > 240:
        return True
    # Skip very light grays
    if abs(r - g) < 10 and abs(g - b) < 10 and r > 230:
        return True
    return False

def extract_dominant_color(image_url, session):
    """
    Extract the dominant color from a car image.
    Returns hex color string like "#1f2937".
    """
    try:
        # Download image with timeout and User-Agent
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = session.get(image_url, headers=headers, timeout=10)
        response.raise_for_status()

        # Open and process image
        img = Image.open(BytesIO(response.content))

        # Convert to RGB if needed
        if img.mode != 'RGB':
            img = img.convert('RGB')

        # Resize to small size for faster processing
        img = img.resize((50, 50), Image.Resampling.LANCZOS)

        # Get center region (40% of image) where car body is likely to be
        width, height = img.size
        left = int(width * 0.3)
        top = int(height * 0.3)
        right = int(width * 0.7)
        bottom = int(height * 0.7)
        center_region = img.crop((left, top, right, bottom))

        # Get all pixels from center region
        pixels = list(center_region.getdata())

        # Filter out background colors
        filtered_pixels = [
            pixel for pixel in pixels
            if not is_background_color(pixel[0], pixel[1], pixel[2])
        ]

        # If we filtered out too many pixels, use all pixels
        if len(filtered_pixels) < len(pixels) * 0.1:
            filtered_pixels = pixels

        # Count color frequencies
        color_counts = Counter(filtered_pixels)

        # Get most common color
        if color_counts:
            dominant_color = color_counts.most_common(1)[0][0]
            return rgb_to_hex(dominant_color[0], dominant_color[1], dominant_color[2])
        else:
            # Fallback to default gray
            return "#808080"

    except Exception as e:
        print(f"  Error processing {image_url}: {e}")
        return "#808080"  # Default gray on error

def main():
    json_path = '/Users/heejunkim/Desktop/danawa/src/constants/generated-car-details.json'

    print("Loading car details JSON...")
    with open(json_path, 'r', encoding='utf-8') as f:
        car_data = json.load(f)

    # Create session for connection pooling
    session = requests.Session()

    total_cars = len(car_data)
    total_images = 0
    processed_images = 0

    # Count total images
    for car_id, car_info in car_data.items():
        if 'colorImages' in car_info and car_info['colorImages']:
            total_images += len(car_info['colorImages'])

    print(f"Found {total_cars} cars with {total_images} total color images")
    print("Starting color extraction...\n")

    car_count = 0
    for car_id, car_info in car_data.items():
        car_count += 1

        if 'colorImages' not in car_info or not car_info['colorImages']:
            continue

        car_name = car_info.get('name', car_id)
        color_images = car_info['colorImages']

        if car_count % 10 == 1 or car_count == 1:
            print(f"[{car_count}/{total_cars}] Processing: {car_name} ({len(color_images)} colors)")

        # Process each color image
        for color_img in color_images:
            image_url = color_img['imageUrl']

            # Extract dominant color
            hex_color = extract_dominant_color(image_url, session)

            # Add hex field
            color_img['hex'] = hex_color

            processed_images += 1

            # Small delay to be respectful to the server
            time.sleep(0.1)

        # Progress update every 10 cars
        if car_count % 10 == 0:
            print(f"  Progress: {processed_images}/{total_images} images processed")

    print(f"\n✓ Processed all {processed_images} images")
    print("Writing updated data to JSON file...")

    # Write updated data back to file
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(car_data, f, ensure_ascii=False, indent=2)

    print(f"✓ Successfully updated {json_path}")
    print(f"  Total cars: {total_cars}")
    print(f"  Total images: {total_images}")
    print(f"  All color images now have hex values!")

if __name__ == '__main__':
    main()
