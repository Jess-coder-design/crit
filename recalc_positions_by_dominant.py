import json

# Load data
with open('landscape/json/landscape/position_3dmap.json', encoding='utf-8') as f:
    positions = json.load(f)

with open('landscape/json/landscape/keywordsorder.json', encoding='utf-8') as f:
    keywords = json.load(f)

critical_order = keywords['criticalOrder']
design_order = keywords['designOrder']

# Recalculate positions based on dominant practices
updated = 0
for entry in positions:
    # Get dominant practice values
    dominant_critical = entry.get('_dominant_critical_practice')
    dominant_design = entry.get('_dominant_design_practice')
    
    # Set x,y based on dominant practices
    if dominant_critical and dominant_critical in critical_order:
        entry['x'] = critical_order[dominant_critical]
        updated += 1
    else:
        entry['x'] = None
    
    if dominant_design and dominant_design in design_order:
        entry['y'] = design_order[dominant_design]
    else:
        entry['y'] = None

# Save updated positions
with open('landscape/json/landscape/position_3dmap.json', 'w', encoding='utf-8') as f:
    json.dump(positions, f, ensure_ascii=False, indent=2)

print(f"Updated {updated} entries with dominant practice intersections")
