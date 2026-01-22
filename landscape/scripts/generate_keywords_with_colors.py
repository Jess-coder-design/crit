#!/usr/bin/env python
"""
Generate keywords_with_colors.json with ALL keywords and lemmatizations from keywords_precomputed.json
mapped to colors from colorsnew.json
"""

import json
from pathlib import Path

# Get the base directory
base_dir = Path(__file__).parent.parent

# Load the main keyword -> color mapping from 3D landscape
colors_path = base_dir / '3d-landscape' / 'data' / 'colorsnew.json'
with open(colors_path, 'r', encoding='utf-8') as f:
    main_colors = json.load(f)

# Load keywords_precomputed.json structure
keywords_path = base_dir / 'chrome-extension' / 'keywords_precomputed.json'
with open(keywords_path, 'r', encoding='utf-8') as f:
    keywords_data = json.load(f)

# Function to normalize keyword name (remove spaces, underscores, hyphens variations)
def normalize_keyword(kw):
    """Normalize keyword by converting to lowercase and removing extra spaces"""
    return kw.strip().lower()

# Function to find the main keyword in colorsnew
def find_main_keyword_color(keyword):
    """Find the color for a keyword by checking exact match first, then variations"""
    # Direct match
    if keyword in main_colors:
        return main_colors[keyword]
    
    # Try lowercase
    kw_lower = keyword.lower()
    if kw_lower in main_colors:
        return main_colors[kw_lower]
    
    # Try with underscores instead of hyphens/spaces
    kw_normalized = kw_lower.replace(' ', '_').replace('-', '_')
    if kw_normalized in main_colors:
        return main_colors[kw_normalized]
    
    # Try with hyphens instead of underscores
    kw_hyphen = kw_lower.replace('_', '-')
    if kw_hyphen in main_colors:
        return main_colors[kw_hyphen]
    
    # Try with spaces instead of underscores
    kw_space = kw_lower.replace('_', ' ')
    if kw_space in main_colors:
        return main_colors[kw_space]
    
    return None

# Build keywords_with_colors mapping
keywords_with_colors = {}

# First, build a mapping of data keywords to their category
data_keyword_categories = keywords_data.get('data_keyword_categories', {})
print(f"\ndata_keyword_categories has {len(data_keyword_categories)} items")

# Process each category
for category, items in keywords_data.items():
    if category == 'data_keyword_categories':
        continue  # Skip this, we'll process it differently
        
    print(f"\nProcessing category: {category}")
    
    if isinstance(items, dict):
        # Category like embedded_keywords with main keywords and their lemmatizations
        for main_keyword, lemmatizations in items.items():
            # Find the color for this main keyword
            color_rgb = find_main_keyword_color(main_keyword)
            
            if color_rgb:
                # Convert RGB to hex
                hex_color = '#{:02x}{:02x}{:02x}'.format(color_rgb[0], color_rgb[1], color_rgb[2])
                
                # Add the main keyword
                kw_lower = main_keyword.lower().strip()
                keywords_with_colors[kw_lower] = hex_color
                print(f"  {main_keyword} -> {hex_color}")
                
                # Add all lemmatizations with the same color
                if isinstance(lemmatizations, list):
                    for lem in lemmatizations:
                        lem_lower = lem.lower().strip()
                        keywords_with_colors[lem_lower] = hex_color
                        if lem != main_keyword:
                            print(f"    - {lem}")
            else:
                print(f"  [NO COLOR] {main_keyword}")

# Now handle data_keyword_categories - map these keywords to their category color
print(f"\nProcessing data_keyword_categories ({len(data_keyword_categories)} items):")
for data_keyword, category_name in data_keyword_categories.items():
    # The category_name tells us which group this keyword belongs to
    # Find a matching main keyword in that group
    
    # Look for this keyword or a similar one in the keywords we've already processed
    data_kw_lower = data_keyword.lower().strip()
    
    if data_kw_lower in keywords_with_colors:
        # Already processed
        continue
    
    # Try to find the category's color by finding a main keyword in that category
    category_key = f"{category_name}_keywords"
    if category_key in keywords_data and isinstance(keywords_data[category_key], dict):
        # Get the first main keyword from this category to get its color
        for main_kw, _ in keywords_data[category_key].items():
            color_rgb = find_main_keyword_color(main_kw)
            if color_rgb:
                hex_color = '#{:02x}{:02x}{:02x}'.format(color_rgb[0], color_rgb[1], color_rgb[2])
                keywords_with_colors[data_kw_lower] = hex_color
                print(f"  {data_keyword} -> {hex_color} (from {category_name})")
                break

# Save the merged file to chrome-extension
output_path = base_dir / 'chrome-extension' / 'keywords_with_colors.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(keywords_with_colors, f, indent=2, ensure_ascii=False)

print(f"\n[OK] Generated keywords_with_colors.json with {len(keywords_with_colors)} entries")
print(f"   Saved to: {output_path}")

# Verify all main keywords from colorsnew are included
print("\n[VERIFICATION]:")
missing_main = []
for main_kw in main_colors.keys():
    if main_kw.lower() not in keywords_with_colors:
        missing_main.append(main_kw)

if missing_main:
    print(f"[WARNING] Main keywords from colorsnew NOT in keywords_with_colors: {missing_main}")
else:
    print("[OK] All main keywords from colorsnew.json are included")

print(f"[OK] Total keywords with colors: {len(keywords_with_colors)}")
