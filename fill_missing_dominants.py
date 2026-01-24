import json
from collections import Counter
import random

with open('landscape/json/landscape/position_3dmap.json', encoding='utf-8') as f:
    data = json.load(f)

with open('landscape/json/landscape/keywordsorder.json', encoding='utf-8') as f:
    keywords = json.load(f)

design_order = keywords['designOrder']

# Get distribution of existing design practices
existing_design = [e['_dominant_design_practice'] for e in data if e.get('_dominant_design_practice')]
design_dist = Counter(existing_design)

# Normalize to probabilities
total = sum(design_dist.values())
design_probs = {k: v / total for k, v in design_dist.items()}

print(f"Design practice distribution (probability):")
for practice, prob in sorted(design_probs.items(), key=lambda x: -x[1]):
    print(f"  {practice}: {prob:.2%}")

# Now assign missing dominants - both for critical and design
missing_critical = 0
missing_design = 0

for entry in data:
    # Assign missing critical - distribute among all critical practices
    if entry.get('_dominant_critical_practice') is None and entry.get('_critical_axis_position') is None:
        # Randomly assign from existing distribution
        critical_practices = list(keywords['criticalOrder'].keys())
        entry['_dominant_critical_practice'] = random.choice(critical_practices)
        entry['x'] = keywords['criticalOrder'][entry['_dominant_critical_practice']]
        missing_critical += 1
    
    # Assign missing design - use probability distribution
    if entry.get('_dominant_design_practice') is None and entry.get('_design_axis_position') is None:
        # Randomly assign based on probability distribution
        entry['_dominant_design_practice'] = random.choices(list(design_probs.keys()), weights=list(design_probs.values()))[0]
        entry['y'] = design_order[entry['_dominant_design_practice']]
        missing_design += 1

# Save
with open('landscape/json/landscape/position_3dmap.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"\nAssigned {missing_critical} missing critical practices")
print(f"Assigned {missing_design} missing design practices")
