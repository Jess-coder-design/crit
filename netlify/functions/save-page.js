const fetch = require("node-fetch"); // make sure Netlify supports this; optional in newer Node versions

exports.handler = async (event) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle preflight OPTIONS
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders, body: "Method Not Allowed" };
  }

  try {
    // Parse incoming submission
    const data = JSON.parse(event.body || "{}");
    const { url, criticalKeywords, designKeywords } = data;

    if (!url || !criticalKeywords || !designKeywords) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    // GitHub setup
    const token = process.env.GITHUB_TOKEN;
    const owner = "Jess-coder-design"; // <-- replace with your GitHub username
    const repo = "crit";

    const positionPath = "landscape/json/landscape/position_3dmap.json";
    const orderPath = "landscape/json/landscape/keywordsorder.json";

    const ghHeaders = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "crit-netlify-function",
    };

    // ── Load keywords order ─────────────────────────────
    const orderRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${orderPath}`,
      { headers: ghHeaders }
    );

    if (!orderRes.ok) {
      throw new Error("Could not load keywordsorder.json");
    }

    const orderData = await orderRes.json();
    const orderJson = JSON.parse(
      Buffer.from(orderData.content, "base64").toString()
    );

    const criticalOrder = orderJson.criticalOrder || {};
    const designOrder = orderJson.designOrder || {};

    const dominantCritical = Array.isArray(criticalKeywords)
      ? criticalKeywords[0]
      : criticalKeywords;
    const dominantDesign = Array.isArray(designKeywords)
      ? designKeywords[0]
      : designKeywords;

    const x = criticalOrder[dominantCritical] ?? null;
    const y = designOrder[dominantDesign] ?? null;

    // ── Load current positions ──────────────────────────
    const posRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${positionPath}`,
      { headers: ghHeaders }
    );

    if (!posRes.ok) {
      throw new Error("Could not load position_3dmap.json");
    }

    const posData = await posRes.json();
    const positions = JSON.parse(
      Buffer.from(posData.content, "base64").toString()
    );

    // ── Optional: check for duplicates ─────────────────
    if (positions.some((entry) => entry.url === url)) {
      return {
        statusCode: 409,
        headers: corsHeaders,
        body: JSON.stringify({ error: "URL already submitted", url }),
      };
    }

    // ── Add new entry ───────────────────────────────────
    const newEntry = {
      url,
      sentence: `Added via CR!T extension`,
      x,
      y,
      z: null,
      source: "extension",
      timestamp: new Date().toISOString(),
      _dominant_critical_practice: dominantCritical,
      _dominant_design_practice: dominantDesign,
    };

    positions.push(newEntry);

    // ── Save back to GitHub ─────────────────────────────
    const updated = Buffer.from(JSON.stringify(positions, null, 2)).toString(
      "base64"
    );

    const updateRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${positionPath}`,
      {
        method: "PUT",
        headers: ghHeaders,
        body: JSON.stringify({
          message: `Add submission: ${url}`,
          content: updated,
          sha: posData.sha,
        }),
      }
    );

    if (!updateRes.ok) {
      const text = await updateRes.text();
      throw new Error(`Failed to update GitHub file: ${text}`);
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        url,
        position: { x, y },
        message: "Submission saved successfully",
      }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
