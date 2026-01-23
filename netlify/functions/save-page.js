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

    // Log submission (for now, just acknowledge receipt)
    console.log('[save-page] Received submission:', {
      url,
      criticalKeywords,
      designKeywords,
      sentence,
      timestamp: new Date().toISOString()
    });

    // Return success - GitHub integration coming soon
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        url,
        message: "Submission received successfully",
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
