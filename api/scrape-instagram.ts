// Vercel Serverless Function to proxy Apify API calls
// This solves CORS issues by making API calls server-side

import type { VercelRequest, VercelResponse } from '@vercel/node';

const APIFY_TOKEN = process.env.VITE_APIFY_TOKEN;
const ACTOR_ID = 'apify/instagram-followers-count-scraper';
const BASE_URL = 'https://api.apify.com/v2';

interface ApifyRunResponse {
  data: {
    id: string;
    status: string;
  };
}

interface ApifyDatasetItem {
  username: string;
  followersCount?: number;
  engagementRate?: number;
  profileUrl?: string;
  error?: string;
}

// Start an Apify scraper run
const startApifyRun = async (usernames: string[]): Promise<string> => {
  if (!APIFY_TOKEN) {
    throw new Error('Apify API token not configured');
  }

  const response = await fetch(`${BASE_URL}/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      usernames: usernames.map(u => u.replace('@', '')),
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to start Apify run: ${response.statusText}`);
  }

  const data: ApifyRunResponse = await response.json();
  return data.data.id;
};

// Poll for run results
const getRunResults = async (runId: string): Promise<ApifyDatasetItem[]> => {
  if (!APIFY_TOKEN) {
    throw new Error('Apify API token not configured');
  }

  let status = 'RUNNING';
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max (5s intervals)

  while (status === 'RUNNING' && attempts < maxAttempts) {
    const statusResponse = await fetch(`${BASE_URL}/actor-runs/${runId}?token=${APIFY_TOKEN}`);
    const statusData = await statusResponse.json();
    status = statusData.data.status;

    if (status === 'RUNNING') {
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }
  }

  if (status !== 'SUCCEEDED') {
    throw new Error(`Apify run failed with status: ${status}`);
  }

  const datasetResponse = await fetch(`${BASE_URL}/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}`);

  if (!datasetResponse.ok) {
    throw new Error(`Failed to fetch dataset: ${datasetResponse.statusText}`);
  }

  return datasetResponse.json();
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { usernames } = req.body as { usernames: string[] };

    if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
      return res.status(400).json({ error: 'Invalid usernames array' });
    }

    if (!APIFY_TOKEN) {
      return res.status(500).json({ error: 'Apify API token not configured' });
    }

    const runId = await startApifyRun(usernames);
    const results = await getRunResults(runId);

    return res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error('[API] Error scraping Instagram:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to scrape Instagram data',
    });
  }
}
