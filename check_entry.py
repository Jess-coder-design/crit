import json

with open('landscape/json/landscape/position_3dmap.json', 'r', encoding='utf-8') as f:
    pos_data = json.load(f)

sentence = '11   \n The following text is partly an introduction to the concept of critique in the humanities and social sciences and in design respectively but there is also the intention of a closer investigation of what has been described as the crisis of critique'

matches = [p for p in pos_data if p.get('sentence') == sentence]
print(f'Found {len(matches)} entries with exact sentence match in position_3dmap.json')

if len(matches) > 1:
    print('WARNING: Duplicate entries found!')
    for i, m in enumerate(matches):
        print(f'  Entry {i}: onMap={m.get("onMap")}, source={m.get("source")}')
else:
    if matches:
        m = matches[0]
        print(f'Single entry found: onMap={m.get("onMap")}, x={m.get("x")}, y={m.get("y")}, z={m.get("z")}, source={m.get("source")}')
        print(f'Entry position in list: index {pos_data.index(m)}')
    else:
        print('No entries found with exact sentence text')
        
# Also count how many new submissions are on the map
new_on_map = [p for p in pos_data if p.get('source') == 'new' and p.get('onMap') == True]
print(f'\nTotal new submissions with onMap=true: {len(new_on_map)}')
