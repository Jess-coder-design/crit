const fs = require('fs');
const path = require('path');

// Read both files
const analysisPath = 'landscape/json/landscape/3dmap_analysis.json';
const positionPath = 'landscape/json/landscape/position_3dmap.json';

const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
const positions = JSON.parse(fs.readFileSync(positionPath, 'utf-8'));

// Create position map for quick lookup
const posMap = {};
positions.forEach(p => {
    posMap[p.sentence] = p;
});

// Add onMap flag to each analysis entry
let onMapCount = 0;
analysis.forEach(entry => {
    const pos = posMap[entry.sentence];
    const hasValidCoords = pos && pos.x !== null && pos.y !== null && pos.z !== null;
    entry.onMap = hasValidCoords;
    if (hasValidCoords) onMapCount++;
});

console.log(`Total sentences: ${analysis.length}`);
console.log(`Displayed on map: ${onMapCount}`);

// Save back
fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
console.log('Updated 3dmap_analysis.json with onMap flag');
