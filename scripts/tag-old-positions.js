#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the position_3dmap.json file
const filePath = path.join(__dirname, '..', 'landscape', 'json', 'landscape', 'position_3dmap.json');

try {
  let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  // Add "source": "old" to entries that don't have a source field
  data = data.map(entry => {
    if (!entry.source) {
      entry.source = 'old';
    }
    return entry;
  });
  
  // Write back to file
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`✓ Added source field to all entries in position_3dmap.json`);
  console.log(`Total entries: ${data.length}`);
  console.log(`Old entries: ${data.filter(e => e.source === 'old').length}`);
  console.log(`New entries: ${data.filter(e => e.source === 'new').length}`);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
