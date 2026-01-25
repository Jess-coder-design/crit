import json

url_to_delete = "https://www.criticalfashionproject.org/text/escaping-the-pressure-critical-thinking-in-theory-and-design/"

# Process 3dmap_analysis.json
with open('landscape/json/landscape/3dmap_analysis.json', 'r', encoding='utf-8') as f:
    analysis_data = json.load(f)

original_count = len(analysis_data)
analysis_data = [entry for entry in analysis_data if entry.get('url') != url_to_delete]
deleted_from_analysis = original_count - len(analysis_data)

with open('landscape/json/landscape/3dmap_analysis.json', 'w', encoding='utf-8') as f:
    json.dump(analysis_data, f, indent=2, ensure_ascii=False)

print(f"✓ 3dmap_analysis.json: Deleted {deleted_from_analysis} entries")

# Process position_3dmap.json
with open('landscape/json/landscape/position_3dmap.json', 'r', encoding='utf-8') as f:
    position_data = json.load(f)

original_count = len(position_data)
position_data = [entry for entry in position_data if entry.get('url') != url_to_delete]
deleted_from_position = original_count - len(position_data)

with open('landscape/json/landscape/position_3dmap.json', 'w', encoding='utf-8') as f:
    json.dump(position_data, f, indent=2, ensure_ascii=False)

print(f"✓ position_3dmap.json: Deleted {deleted_from_position} entries")
print(f"\nTotal entries deleted: {deleted_from_analysis + deleted_from_position}")
