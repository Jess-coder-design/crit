// Minimal bulletproof function - no file I/O, no external calls
exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  console.log('[save-page] Request received:', event.httpMethod);

  try {
    // Handle OPTIONS preflight
    if (event.httpMethod === 'OPTIONS') {
      console.log('[save-page] Handling OPTIONS');
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: '',
      };
    }

    // Only POST
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    console.log('[save-page] Processing POST');

    // Parse request body
    let data;
    try {
      data = JSON.parse(event.body);
    } catch (e) {
      console.error('[save-page] JSON parse failed:', e.message);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid JSON', details: e.message }),
      };
    }

    // Validate
    if (!data.url || !data.criticalKeywords || !data.designKeywords) {
      console.error('[save-page] Missing required fields');
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    console.log('[save-page] ✅ Validation passed:', data.url);

    // For now: just return success
    // (GitHub integration will come after we confirm this works)
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: 'Submission received',
        data: {
          url: data.url,
          criticalKeywordsCount: data.criticalKeywords.length,
          designKeywordsCount: data.designKeywords.length,
        },
      }),
    };
  } catch (error) {
    console.error('[save-page] Unexpected error:', error.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};
        method: method,
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'CRIT-Extension'
        }
      };
      
      if (content) {
        options.body = JSON.stringify(content);
      }
      
      const url = `https://api.github.com/repos/${repoOwner}/${repoName}${endpoint}`;
      const response = await fetch(url, options);
      const result = await response.json();
      return { status: response.status, data: result };
    }

    // Load current position_3dmap.json from GitHub
    let positionData = [];
    let positionSha = null;
    try {
      const { status, data: fileData } = await callGitHub('GET', '/contents/landscape/json/landscape/position_3dmap.json');
      if (status === 200) {
        positionData = JSON.parse(Buffer.from(fileData.content, 'base64').toString());
        positionSha = fileData.sha;
      }
    } catch (err) {
      console.log('Could not read position_3dmap.json from GitHub:', err.message);
    }

    // Check if URL already exists
    if (positionData.some(item => item.url === data.url)) {
      return {
        statusCode: 409,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          success: false,
          message: 'URL already exists',
          url: data.url
        })
      };
    }

    // Load keywordsorder.json to determine position
    let criticalOrder = {};
    let designOrder = {};
    try {
      const { status, data: fileData } = await callGitHub('GET', '/contents/landscape/json/landscape/keywordsorder.json');
      if (status === 200) {
        const keywordsOrderData = JSON.parse(Buffer.from(fileData.content, 'base64').toString());
        criticalOrder = keywordsOrderData.criticalOrder || {};
        designOrder = keywordsOrderData.designOrder || {};
      }
    } catch (err) {
      console.log('Could not read keywordsorder.json:', err.message);
    }

    // Find dominant keywords
    let dominantCritical = data.criticalKeywords[0] || null;
    let dominantDesign = data.designKeywords[0] || null;
    let criticalPosition = criticalOrder[dominantCritical] || null;
    let designPosition = designOrder[dominantDesign] || null;

    const criticalKeywordsStr = Array.isArray(data.criticalKeywords) ? data.criticalKeywords.join(', ') : data.criticalKeywords;
    const designKeywordsStr = Array.isArray(data.designKeywords) ? data.designKeywords.join(', ') : data.designKeywords;

    // Create position entry
    const positionEntry = {
      url: data.url,
      sentence: `Added via CR!T extension - Critical keywords: ${criticalKeywordsStr}. Design keywords: ${designKeywordsStr}`,
      x: criticalPosition,
      y: designPosition,
      z: null,
      date: null,
      _dominant_critical_practice: dominantCritical,
      _critical_axis_position: criticalPosition,
      _dominant_design_practice: dominantDesign,
      _design_axis_position: designPosition,
      source: "new",
      timestamp: new Date().toISOString()
    };

    // Add to position_3dmap.json
    positionData.push(positionEntry);

    // Update position_3dmap.json on GitHub
    try {
      const content = Buffer.from(JSON.stringify(positionData, null, 2)).toString('base64');
      const { status } = await callGitHub('PUT', '/contents/landscape/json/landscape/position_3dmap.json', {
        message: `Add new submission: ${data.url}`,
        content: content,
        sha: positionSha
      });
      console.log('Updated position_3dmap.json on GitHub');
    } catch (err) {
      console.log('Could not update position_3dmap.json on GitHub:', err.message);
      throw err;
    }

    // Load and update 3dmap_analysis.json
    let analysisData = [];
    let analysisSha = null;
    try {
      const { status, data: fileData } = await callGitHub('GET', '/contents/landscape/json/landscape/3dmap_analysis.json');
      if (status === 200) {
        analysisData = JSON.parse(Buffer.from(fileData.content, 'base64').toString());
        analysisSha = fileData.sha;
      }
    } catch (err) {
      console.log('Could not read 3dmap_analysis.json:', err.message);
    }

    const analysisEntry = {
      url: data.url,
      year: null,
      sentence: `Added via CR!T extension - Critical keywords: ${criticalKeywordsStr}. Design keywords: ${designKeywordsStr}`,
      critical_keywords: Array.isArray(data.criticalKeywords) ? data.criticalKeywords.length : 1,
      critical: Array.isArray(data.criticalKeywords) ? data.criticalKeywords : [data.criticalKeywords],
      design_keywords: Array.isArray(data.designKeywords) ? data.designKeywords.length : 1,
      design: Array.isArray(data.designKeywords) ? data.designKeywords : [data.designKeywords],
      source: "new",
      timestamp: new Date().toISOString()
    };

    analysisData.push(analysisEntry);

    // Update 3dmap_analysis.json on GitHub
    try {
      const content = Buffer.from(JSON.stringify(analysisData, null, 2)).toString('base64');
      await callGitHub('PUT', '/contents/landscape/json/landscape/3dmap_analysis.json', {
        message: `Add analysis for new submission: ${data.url}`,
        content: content,
        sha: analysisSha
      });
      console.log('Updated 3dmap_analysis.json on GitHub');
    } catch (err) {
      console.log('Could not update 3dmap_analysis.json on GitHub:', err.message);
    }

    console.log('Page submission saved:', data.url);

    // Return success
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        success: true,
        message: 'Page saved and analyzed successfully',
        data: {
          url: data.url,
          position: {
            x: criticalPosition,
            y: designPosition
          }
        }
      })
    };
  } catch (err) {
    console.error('Error:', err);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Internal server error: ' + err.message })
    };
  }
};
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
      headers: corsHeaders,
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
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to process submission', details: error.message })
    };
  }
};
