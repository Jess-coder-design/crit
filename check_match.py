import json

with open('landscape/json/landscape/position_3dmap.json', 'r', encoding='utf-8') as f:
    pos_data = json.load(f)

with open('landscape/json/landscape/3dmap_analysis.json', 'r', encoding='utf-8') as f:
    analysis_data = json.load(f)

# Find the sentence in position data
pos_sentence = None
for p in pos_data:
    if 'The following text is partly' in p.get('sentence', ''):
        pos_sentence = p.get('sentence')
        break

print(f"Position sentence: {repr(pos_sentence)}")
print(f"Length: {len(pos_sentence) if pos_sentence else 'Not found'}")

# Find matching in analysis
analysis_sentence = None
for a in analysis_data:
    if 'The following text is partly' in a.get('sentence', ''):
        analysis_sentence = a.get('sentence')
        break

print(f"\nAnalysis sentence: {repr(analysis_sentence)}")
print(f"Length: {len(analysis_sentence) if analysis_sentence else 'Not found'}")

if pos_sentence and analysis_sentence:
    if pos_sentence == analysis_sentence:
        print("\n✓ Sentences match exactly!")
    else:
        print("\n✗ Sentences DO NOT match!")
        print(f"Position version: {pos_sentence[:100]}...")
        print(f"Analysis version: {analysis_sentence[:100]}...")
