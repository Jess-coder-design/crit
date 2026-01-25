import json

# Load the position data
with open('landscape/json/landscape/position_3dmap.json', 'r', encoding='utf-8') as f:
    position_data = json.load(f)

# Recalculate onMap for all entries
updated_count = 0
for entry in position_data:
    x = entry.get('x')
    y = entry.get('y')
    z = entry.get('z')
    
    # onMap is true if x != 0 AND y != 0 AND z != null
    on_map = (x != 0 and x is not None) and (y != 0 and y is not None) and z is not None
    
    entry['onMap'] = on_map
    updated_count += 1

# Save back
with open('landscape/json/landscape/position_3dmap.json', 'w', encoding='utf-8') as f:
    json.dump(position_data, f, indent=2, ensure_ascii=False)

print(f"✓ Updated {updated_count} entries with onMap status")

# Count onMap=true entries
on_map_count = sum(1 for e in position_data if e.get('onMap'))
print(f"✓ Entries with onMap=true: {on_map_count}")
print(f"✓ Entries with onMap=false: {len(position_data) - on_map_count}")
