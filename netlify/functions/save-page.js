const https = require('https');

exports.handler = async (event) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle OPTIONS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders, body: "Method Not Allowed" };
  }

  try {
    // Parse incoming submission
    const data = JSON.parse(event.body || "{}");
    const { url, criticalKeywords, designKeywords, sentence } = data;

    if (!url || !criticalKeywords || !designKeywords) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    // Log submission
    console.log('[save-page] Received submission:', {
      url,
      criticalKeywords,
      designKeywords,
      sentence,
      timestamp: new Date().toISOString()
    });

    // Try to write to GitHub if token is available
    const githubToken = process.env.newnewnew;
    console.log('[save-page] Checking token - newnewnew exists?', !!githubToken);
    
    if (githubToken) {
      console.log('[save-page] Token found, writing to GitHub...');
      try {
        await writeToGitHub(url, criticalKeywords, designKeywords, sentence, githubToken);
        console.log('[save-page] Successfully wrote to GitHub');
      } catch (gitError) {
        console.error('[save-page] GitHub write failed:', gitError.message);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({ 
            error: 'Failed to write to GitHub: ' + gitError.message 
          }),
        };
      }
    } else {
      console.warn('[save-page] newnewnew token not set - skipping GitHub write');
    }

    // Return success
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        url,
        message: "Submission received and saved successfully",
      }),
    };
  } catch (err) {
    console.error('[save-page] Error:', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

async function writeToGitHub(url, criticalKeywords, designKeywords, sentence, token) {
  return new Promise((resolve, reject) => {
    console.log('[writeToGitHub] Starting write to GitHub...');
    
    const owner = 'Jess-coder-design';
    const repo = 'crit';
    const branch = 'main';
    const filePath = 'landscape/json/landscape/position_3dmap.json';

    // Keyword order mapping (from keywordsorder.json)
    const keywordPositions = {
      critical: { question: 1, critique: 2, critical: 3, interrogate: 4, problematize: 5, reframe: 6, reflect: 7, position: 8, "post-critical": 9 },
      design: { work: 1, craft: 2, "applied art": 3, practice: 4, design: 5, project: 6, plan: 7, intend: 8, iterate: 9, explore: 10, inquire: 11, analyze: 12, evaluate: 13, investigate: 14, conceptualize: 15, narrate: 16, discourse: 17, dialecticize: 18, systematize: 19, theorize: 20 }
    };

    // Calculate position from keywords
    let x = null;
    let y = null;

    // Find critical keyword position (x-axis: 1-9)
    if (criticalKeywords && Array.isArray(criticalKeywords)) {
      for (let kw of criticalKeywords) {
        if (keywordPositions.critical[kw.toLowerCase()]) {
          x = keywordPositions.critical[kw.toLowerCase()];
          break;
        }
      }
    }

    // Find design keyword position (y-axis: 1-20)
    if (designKeywords && Array.isArray(designKeywords)) {
      for (let kw of designKeywords) {
        if (keywordPositions.design[kw.toLowerCase()]) {
          y = keywordPositions.design[kw.toLowerCase()];
          break;
        }
      }
    }

    console.log('[writeToGitHub] Calculated position - x:', x, 'y:', y, 'from keywords:', { criticalKeywords, designKeywords });

    // Fetch current file to get SHA
    const getOptions = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`,
      method: 'GET',
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'Netlify-Save-Page'
      }
    };

    https.request(getOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          console.error('[saveToGitHub] Failed to fetch file:', res.statusCode);
          reject(new Error('Failed to fetch position_3dmap.json'));
          return;
        }

        try {
          const fileData = JSON.parse(data);
          const content = Buffer.from(fileData.content, 'base64').toString('utf8');
          const entries = JSON.parse(content);

          // Create new entry with calculated position
          const newEntry = {
            url,
            sentence: sentence || '',
            x: x,
            y: y,
            z: null,
            date: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            source: 'new',
            _dominant_critical_practice: criticalKeywords && criticalKeywords[0] ? criticalKeywords[0] : null,
            _critical_axis_position: x,
            _dominant_design_practice: designKeywords && designKeywords[0] ? designKeywords[0] : null,
            _design_axis_position: y
          };

          console.log('[writeToGitHub] New entry:', newEntry);
          entries.push(newEntry);
          const updatedContent = Buffer.from(JSON.stringify(entries, null, 2)).toString('base64');

          // Write updated file back
          const putOptions = {
            hostname: 'api.github.com',
            path: `/repos/${owner}/${repo}/contents/${filePath}`,
            method: 'PUT',
            headers: {
              'Authorization': `token ${token}`,
              'User-Agent': 'Netlify-Save-Page',
              'Content-Type': 'application/json'
            }
          };

          const payload = JSON.stringify({
            message: `Add new submission: ${url}`,
            content: updatedContent,
            sha: fileData.sha,
            branch
          });

          const putReq = https.request(putOptions, (res) => {
            let putData = '';
            res.on('data', chunk => putData += chunk);
            res.on('end', () => {
              if (res.statusCode === 200 || res.statusCode === 201) {
                console.log('[writeToGitHub] Successfully wrote to position_3dmap.json with position x:', x, 'y:', y);
                resolve();
              } else {
                console.error('[writeToGitHub] Write failed:', res.statusCode, putData);
                reject(new Error(`GitHub write failed: ${res.statusCode}`));
              }
            });
          });

          putReq.write(payload);
          putReq.end();
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject).end();
  });
}
