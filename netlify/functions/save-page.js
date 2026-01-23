const fs = require('fs');
const path = require('path');

// Handler for saving page data
exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse the incoming data
    const data = JSON.parse(event.body);
    
    // Validate required fields
    if (!data.url || !data.criticalKeywords || !data.designKeywords) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Try to load position_3dmap.json to check for existing URLs
    let existingUrls = new Set();
    try {
      const positionFilePath = path.join(process.env.LAMBDA_TASK_ROOT || '', '..', '..', 'landscape', 'json', 'landscape', 'position_3dmap.json');
      if (fs.existsSync(positionFilePath)) {
        const positionData = JSON.parse(fs.readFileSync(positionFilePath, 'utf8'));
        if (Array.isArray(positionData)) {
          positionData.forEach(item => {
            if (item.url) existingUrls.add(item.url);
          });
        }
      }
    } catch (err) {
      console.log('Could not read position_3dmap.json:', err.message);
    }

    // Check if URL already exists in position_3dmap.json
    if (existingUrls.has(data.url)) {
      return {
        statusCode: 409,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          success: false,
          message: 'URL already exists in position_3dmap.json',
          url: data.url
        })
      };
    }

    // Try to load submissions.json to check for duplicates
    let submissions = [];
    try {
      const submissionsPath = path.join(process.env.LAMBDA_TASK_ROOT || '', '..', '..', 'submissions.json');
      if (fs.existsSync(submissionsPath)) {
        submissions = JSON.parse(fs.readFileSync(submissionsPath, 'utf8'));
      }
    } catch (err) {
      console.log('Could not read submissions.json:', err.message);
    }

    // Check if URL already submitted
    if (submissions.some(sub => sub.url === data.url)) {
      return {
        statusCode: 409,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          success: false,
          message: 'URL already submitted',
          url: data.url
        })
      };
    }

    // Create submission entry
    const timestamp = new Date().toISOString();
    const criticalKeywordsStr = Array.isArray(data.criticalKeywords) 
      ? data.criticalKeywords.join('; ') 
      : data.criticalKeywords;
    const designKeywordsStr = Array.isArray(data.designKeywords) 
      ? data.designKeywords.join('; ') 
      : data.designKeywords;

    const submission = {
      timestamp,
      url: data.url,
      criticalKeywords: criticalKeywordsStr,
      designKeywords: designKeywordsStr
    };

    // Add to submissions array
    submissions.push(submission);

    // Save submissions.json
    try {
      const submissionsPath = path.join(process.env.LAMBDA_TASK_ROOT || '', '..', '..', 'submissions.json');
      fs.writeFileSync(submissionsPath, JSON.stringify(submissions, null, 2));
      console.log('Saved submissions to submissions.json');
    } catch (err) {
      console.log('Could not write submissions.json:', err.message);
    }

    // Load keywordsorder.json to get position mappings
    let criticalOrder = {};
    let designOrder = {};
    try {
      const keywordsOrderPath = path.join(process.env.LAMBDA_TASK_ROOT || '', '..', '..', 'landscape', 'json', 'landscape', 'keywordsorder.json');
      if (fs.existsSync(keywordsOrderPath)) {
        const keywordsOrderData = JSON.parse(fs.readFileSync(keywordsOrderPath, 'utf8'));
        criticalOrder = keywordsOrderData.criticalOrder || {};
        designOrder = keywordsOrderData.designOrder || {};
      }
    } catch (err) {
      console.log('Could not read keywordsorder.json:', err.message);
    }

    // Find dominant critical and design keywords to determine position
    let dominantCritical = null;
    let dominantDesign = null;
    let criticalPosition = null;
    let designPosition = null;

    if (Array.isArray(data.criticalKeywords) && data.criticalKeywords.length > 0) {
      dominantCritical = data.criticalKeywords[0];
      criticalPosition = criticalOrder[dominantCritical] || null;
    }

    if (Array.isArray(data.designKeywords) && data.designKeywords.length > 0) {
      dominantDesign = data.designKeywords[0];
      designPosition = designOrder[dominantDesign] || null;
    }

    // Calculate x and y coordinates based on positions (or use null if not found)
    // x coordinate is based on critical position
    let xCoord = null;
    if (criticalPosition !== null) {
      xCoord = criticalPosition;
    }

    // y coordinate is based on design position
    let yCoord = null;
    if (designPosition !== null) {
      yCoord = designPosition;
    }

    // Create position entry for position_3dmap.json
    const positionEntry = {
      url: data.url,
      sentence: `Added via CR!T extension - Critical keywords: ${criticalKeywordsStr}. Design keywords: ${designKeywordsStr}`,
      x: xCoord,
      y: yCoord,
      z: null,
      date: null,
      _dominant_critical_practice: dominantCritical,
      _critical_axis_position: criticalPosition,
      _dominant_design_practice: dominantDesign,
      _design_axis_position: designPosition,
      source: "new"
    };

    // Load position_3dmap.json and add new entry
    let positions = [];
    try {
      const positionsPath = path.join(process.env.LAMBDA_TASK_ROOT || '', '..', '..', 'landscape', 'json', 'landscape', 'position_3dmap.json');
      if (fs.existsSync(positionsPath)) {
        positions = JSON.parse(fs.readFileSync(positionsPath, 'utf8'));
      }
    } catch (err) {
      console.log('Could not read position_3dmap.json:', err.message);
    }

    // Add the new entry
    positions.push(positionEntry);

    // Save updated position_3dmap.json
    try {
      const positionsPath = path.join(process.env.LAMBDA_TASK_ROOT || '', '..', '..', 'landscape', 'json', 'landscape', 'position_3dmap.json');
      fs.writeFileSync(positionsPath, JSON.stringify(positions, null, 2));
      console.log('Added entry to position_3dmap.json with position:', { x: xCoord, y: yCoord });
    } catch (err) {
      console.log('Could not write position_3dmap.json:', err.message);
    }

    // Create analysis entry for 3dmap_analysis.json
    const analysisEntry = {
      url: data.url,
      year: null,
      sentence: `Added via CR!T extension - Critical keywords: ${criticalKeywordsStr}. Design keywords: ${designKeywordsStr}`,
      critical_keywords: Array.isArray(data.criticalKeywords) ? data.criticalKeywords.length : 1,
      critical: Array.isArray(data.criticalKeywords) ? data.criticalKeywords : [data.criticalKeywords],
      design_keywords: Array.isArray(data.designKeywords) ? data.designKeywords.length : 1,
      design: Array.isArray(data.designKeywords) ? data.designKeywords : [data.designKeywords],
      source: "new"
    };

    // Load 3dmap_analysis.json and add new entry
    let analysis = [];
    try {
      const analysisPath = path.join(process.env.LAMBDA_TASK_ROOT || '', '..', '..', 'landscape', 'json', 'landscape', '3dmap_analysis.json');
      if (fs.existsSync(analysisPath)) {
        analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
      }
    } catch (err) {
      console.log('Could not read 3dmap_analysis.json:', err.message);
    }

    // Add the new entry
    analysis.push(analysisEntry);

    // Save updated 3dmap_analysis.json
    try {
      const analysisPath = path.join(process.env.LAMBDA_TASK_ROOT || '', '..', '..', 'landscape', 'json', 'landscape', '3dmap_analysis.json');
      fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
      console.log('Added entry to 3dmap_analysis.json');
    } catch (err) {
      console.log('Could not write 3dmap_analysis.json:', err.message);
    }

    // Log to console (Netlify will show this in logs)
    console.log('Page submission saved:', submission);
    console.log('Analysis entry added:', analysisEntry);

    // Return success
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Page saved and analyzed successfully',
        data: submission
      })
    };
  } catch (error) {
    console.error('Error processing submission:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Failed to process submission', details: error.message })
    };
  }
};
