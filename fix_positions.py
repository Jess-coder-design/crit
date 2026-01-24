import json

# Load the file
with open('landscape/json/landscape/position_3dmap.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Update positions
count_critical = 0
count_design = 0

for entry in data:
    if entry.get('_dominant_critical_practice') == 'critical':
        entry['_critical_axis_position'] = 0
        entry['x'] = 0  # critical maps to x
        count_critical += 1
    if entry.get('_dominant_design_practice') == 'design':
        entry['_design_axis_position'] = 0
        entry['y'] = 0  # design maps to y
        count_design += 1

# Save the file
with open('landscape/json/landscape/position_3dmap.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f'Updated {count_critical} entries with "critical" to x=0')
print(f'Updated {count_design} entries with "design" to y=0')
