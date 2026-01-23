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

    // Create CSV row
    const timestamp = new Date().toISOString();
    const criticalKeywordsStr = Array.isArray(data.criticalKeywords) 
      ? data.criticalKeywords.join('; ') 
      : data.criticalKeywords;
    const designKeywordsStr = Array.isArray(data.designKeywords) 
      ? data.designKeywords.join('; ') 
      : data.designKeywords;

    const csvRow = `"${timestamp}","${data.url}","${criticalKeywordsStr}","${designKeywordsStr}"\n`;

    // Log to console (Netlify will show this in logs)
    console.log('Page submission:', {
      timestamp,
      url: data.url,
      criticalKeywords: criticalKeywordsStr,
      designKeywords: designKeywordsStr
    });

    // Return success
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Page saved successfully',
        data: {
          timestamp,
          url: data.url,
          criticalKeywords: criticalKeywordsStr,
          designKeywords: designKeywordsStr
        }
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
