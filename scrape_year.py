#!/usr/bin/env python3
"""
Web scraper to extract year from webpage content and add z-values to new entries.
Searches for years (like 2024, 2025, 2026, etc.) in webpage text.
"""

import requests
from bs4 import BeautifulSoup
import re
import json
from typing import Optional

def extract_year_from_url(url: str) -> Optional[int]:
    """
    Fetch a webpage and extract the first year found (2000-2099).
    
    Args:
        url: The URL to scrape
        
    Returns:
        The first year found (int), or None if no year found
    """
    try:
        # Fetch the webpage with timeout
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Parse HTML
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Get all text from the page
        text = soup.get_text()
        
        # Look for years between 2000 and 2099 (4-digit numbers starting with 20)
        years = re.findall(r'\b(20\d{2})\b', text)
        
        if years:
            # Return the first year found as integer
            return int(years[0])
        
        return None
        
    except requests.exceptions.RequestException as e:
        print(f"Error fetching {url}: {e}")
        return None
    except Exception as e:
        print(f"Error processing {url}: {e}")
        return None


def add_z_values_to_entries(json_file: str) -> None:
    """
    Read position_3dmap.json, find entries with source='new' that have null z,
    scrape their URLs for years, and update z-values.
    
    Args:
        json_file: Path to position_3dmap.json
    """
    # Load the JSON file
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    updated_count = 0
    
    # Process each entry
    for entry in data:
        # Only process new entries with null z-value
        if entry.get('source') == 'new' and entry.get('z') is None and entry.get('url'):
            url = entry['url']
            year = extract_year_from_url(url)
            
            if year:
                entry['z'] = year
                updated_count += 1
                print(f"✓ {url[:60]}... → z: {year}")
            else:
                print(f"✗ {url[:60]}... → no year found")
    
    # Save the updated JSON file
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"\n{updated_count} entries updated with z-values")


if __name__ == "__main__":
    json_path = "landscape/json/landscape/position_3dmap.json"
    print(f"Processing {json_path}...\n")
    add_z_values_to_entries(json_path)
