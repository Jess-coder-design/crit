exports.handler = async (event) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: "Method Not Allowed",
    };
  }

  try {
    const data = JSON.parse(event.body || "{}");

    if (!data.url) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing url" }),
      };
    }

    const token = process.env.GITHUB_TOKEN;
    const owner = "Jess-coder-design";
    const repo = "crit";
    const path = "landscape/json/landscape/position_3dmap.json";

    const githubHeaders = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "crit-netlify-function",
    };

    // 1) Load current file from GitHub
    const fileRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      { headers: githubHeaders }
    );

    if (!fileRes.ok) {
      throw new Error("Failed to load position_3dmap.json");
    }

    const fileData = await fileRes.json();
    const json = JSON.parse(Buffer.from(fileData.content, "base64").toString());

    // 2) Append new entry
    const newEntry = {
      url: data.url,
      sentence: "Added via CR!T extension",
      x: null,
      y: null,
      z: null,
      source: "extension",
      timestamp: new Date().toISOString(),
    };

    json.push(newEntry);

    // 3) Save back to GitHub
    const updatedContent = Buffer.from(JSON.stringify(json, null, 2)).toString("base64");

    const updateRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: "PUT",
        headers: githubHeaders,
        body: JSON.stringify({
          message: `Add new submission: ${data.url}`,
          content: updatedContent,
          sha: fileData.sha,
        }),
      }
    );

    if (!updateRes.ok) {
      throw new Error("Failed to update GitHub file");
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, added: data.url }),
    };
  } catch (err) {
    console.error("ERROR:", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
