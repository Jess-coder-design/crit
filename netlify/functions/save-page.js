const https = require('https');
const http = require('http');

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
    const { url } = data;

    if (!url) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing URL" }),
      };
    }

    console.log('[save-page] Received URL:', url);

    // Fetch and analyze the page
    const sentences = await fetchAndAnalyzePage(url);
    console.log('[save-page] Found', sentences.length, 'sentences with keywords');

    if (sentences.length === 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "No sentences with keywords found on page" }),
      };
    }

    // Try to write to GitHub if token is available
    const githubToken = process.env.newnewnew;
    console.log('[save-page] Checking token - newnewnew exists?', !!githubToken);
    
    if (githubToken) {
      console.log('[save-page] Token found, writing to GitHub...');
      try {
        await writeToGitHub(url, sentences, githubToken);
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
        sentencesAdded: sentences.length,
        message: `Successfully analyzed page and added ${sentences.length} sentences`,
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

// Keyword data - critical and design keywords
const CRITICAL_KEYWORDS = ['question', 'critique', 'critical', 'interrogate', 'problematize', 'reframe', 'reflect', 'position', 'post-critical'];
const DESIGN_KEYWORDS = ['work', 'craft', 'applied art', 'practice', 'design', 'project', 'plan', 'intend', 'iterate', 'explore', 'inquire', 'analyze', 'evaluate', 'investigate', 'conceptualize', 'narrate', 'discourse', 'dialecticize', 'systematize', 'theorize'];

async function fetchAndAnalyzePage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, { timeout: 10000 }, (res) => {
      let html = '';
      
      res.on('data', chunk => html += chunk);
      res.on('end', () => {
        try {
          const sentences = extractAndAnalyzeSentences(html);
          resolve(sentences);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

function extractAndAnalyzeSentences(html) {
  // Simple sentence extraction - split by common sentence boundaries
  const sentences = html
    .replace(/<[^>]*>/g, ' ') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10 && s.length < 500); // Filter by length

  // Analyze each sentence for keywords
  const analyzed = [];
  for (const sentence of sentences) {
    const criticalKeywords = findKeywords(sentence, CRITICAL_KEYWORDS);
    const designKeywords = findKeywords(sentence, DESIGN_KEYWORDS);

    // Only include sentences that have at least one keyword
    if (criticalKeywords.length > 0 || designKeywords.length > 0) {
      analyzed.push({
        sentence,
        criticalKeywords,
        designKeywords
      });
    }
  }

  // Remove duplicates
  const seen = new Set();
  return analyzed.filter(item => {
    if (seen.has(item.sentence)) return false;
    seen.add(item.sentence);
    return true;
  });
}

function findKeywords(text, keywords) {
  const found = [];
  const lowerText = text.toLowerCase();
  
  for (const keyword of keywords) {
    // Use word boundaries to match whole words
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    if (regex.test(lowerText)) {
      found.push(keyword);
    }
  }
  
  return found;
}

async function writeToGitHub(url, sentences, token) {
  // Keyword position mapping
  const keywordPositions = {
    critical: { question: 1, critique: 2, critical: 3, interrogate: 4, problematize: 5, reframe: 6, reflect: 7, position: 8, "post-critical": 9 },
    design: { work: 1, craft: 2, "applied art": 3, practice: 4, design: 5, project: 6, plan: 7, intend: 8, iterate: 9, explore: 10, inquire: 11, analyze: 12, evaluate: 13, investigate: 14, conceptualize: 15, narrate: 16, discourse: 17, dialecticize: 18, systematize: 19, theorize: 20 }
  };

  // First, fetch and update 3dmap_analysis.json
  await updateAnalysisFile(url, sentences, token, keywordPositions);
  
  // Then fetch and update position_3dmap.json
  await updatePositionFile(url, sentences, token, keywordPositions);
}

async function updateAnalysisFile(url, sentences, token, keywordPositions) {
  return new Promise((resolve, reject) => {
    const owner = 'Jess-coder-design';
    const repo = 'crit';
    const branch = 'main';
    const filePath = 'landscape/json/landscape/3dmap_analysis.json';

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
        try {
          const fileData = JSON.parse(data);
          const content = Buffer.from(fileData.content, 'base64').toString('utf8');
          const entries = JSON.parse(content);

          // Add new analysis entries
          for (const sent of sentences) {
            const entry = {
              url,
              sentence: sent.sentence,
              criticalKeywords: sent.criticalKeywords,
              designKeywords: sent.designKeywords,
              timestamp: new Date().toISOString(),
              source: 'new'
            };
            entries.push(entry);
          }

          const updatedContent = Buffer.from(JSON.stringify(entries, null, 2)).toString('base64');

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
            message: `Add analyzed sentences from ${url}`,
            content: updatedContent,
            sha: fileData.sha,
            branch
          });

          const putReq = https.request(putOptions, (res) => {
            let putData = '';
            res.on('data', chunk => putData += chunk);
            res.on('end', () => {
              if (res.statusCode === 200 || res.statusCode === 201) {
                console.log('[updateAnalysisFile] Successfully updated 3dmap_analysis.json');
                resolve();
              } else {
                reject(new Error(`Failed to update analysis file: ${res.statusCode}`));
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

async function updatePositionFile(url, sentences, token, keywordPositions) {
  return new Promise((resolve, reject) => {
    const owner = 'Jess-coder-design';
    const repo = 'crit';
    const branch = 'main';
    const filePath = 'landscape/json/landscape/position_3dmap.json';

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
        try {
          const fileData = JSON.parse(data);
          const content = Buffer.from(fileData.content, 'base64').toString('utf8');
          const entries = JSON.parse(content);

          // Calculate position for each sentence and add to position file
          for (const sent of sentences) {
            let x = null;
            let y = null;

            // Find first critical keyword position
            if (sent.criticalKeywords.length > 0) {
              x = keywordPositions.critical[sent.criticalKeywords[0].toLowerCase()];
            }

            // Find first design keyword position
            if (sent.designKeywords.length > 0) {
              y = keywordPositions.design[sent.designKeywords[0].toLowerCase()];
            }

            const entry = {
              url,
              sentence: sent.sentence,
              x: x,
              y: y,
              z: null,
              date: new Date().toISOString(),
              timestamp: new Date().toISOString(),
              source: 'new',
              _dominant_critical_practice: sent.criticalKeywords.length > 0 ? sent.criticalKeywords[0] : null,
              _critical_axis_position: x,
              _dominant_design_practice: sent.designKeywords.length > 0 ? sent.designKeywords[0] : null,
              _design_axis_position: y
            };
            entries.push(entry);
          }

          const updatedContent = Buffer.from(JSON.stringify(entries, null, 2)).toString('base64');

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
            message: `Add new positions from ${url}: ${sentences.length} sentences`,
            content: updatedContent,
            sha: fileData.sha,
            branch
          });

          const putReq = https.request(putOptions, (res) => {
            let putData = '';
            res.on('data', chunk => putData += chunk);
            res.on('end', () => {
              if (res.statusCode === 200 || res.statusCode === 201) {
                console.log('[updatePositionFile] Successfully updated position_3dmap.json with', sentences.length, 'entries');
                resolve();
              } else {
                reject(new Error(`Failed to update position file: ${res.statusCode}`));
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
