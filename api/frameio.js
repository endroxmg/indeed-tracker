// Vercel Serverless Function: Frame.io API Proxy
// All Frame.io API calls are proxied through this function
// to keep the FRAMEIO_TOKEN server-side only.

export default async function handler(req, res) {
  const token = req.headers['x-frameio-token'] || process.env.FRAMEIO_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'FRAMEIO_TOKEN not configured' });
  }

  const { action, url, assetId } = req.query;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  try {
    if (action === 'resolveReview') {
      // Parse Frame.io URL to extract review token or asset ID
      const parsed = parseFrameioUrl(url);
      if (!parsed) {
        return res.status(400).json({ error: 'Invalid Frame.io URL' });
      }

      let asset = null;
      let comments = [];

      if (parsed.type === 'review') {
        // Resolve review link to get assets
        const reviewRes = await fetch(
          `https://api.frame.io/v2/review_links/${parsed.token}/items`,
          { headers }
        );
        if (!reviewRes.ok) throw new Error(`Review resolve failed: ${reviewRes.status}`);
        const items = await reviewRes.json();
        if (items.length > 0) {
          asset = items[0].asset || items[0];
        }
      } else if (parsed.type === 'asset') {
        // Direct asset ID
        const assetRes = await fetch(
          `https://api.frame.io/v2/assets/${parsed.assetId}`,
          { headers }
        );
        if (!assetRes.ok) throw new Error(`Asset fetch failed: ${assetRes.status}`);
        asset = await assetRes.json();
      }

      if (asset) {
        // Get comments
        const commentsRes = await fetch(
          `https://api.frame.io/v2/assets/${asset.id}/comments?page_size=100`,
          { headers }
        );
        if (commentsRes.ok) {
          const commentsData = await commentsRes.json();
          comments = (commentsData || []).map((c) => ({
            id: c.id,
            text: c.text || '',
            author: c.owner || { name: 'Unknown' },
            createdAt: c.inserted_at || c.created_at,
            timestamp: c.timestamp || null,
            completed: c.completed || false,
            category: categorizeComment(c.text || ''),
            commentType: categorizeType(c.text || ''),
          }));
        }

        return res.status(200).json({
          assetId: asset.id,
          name: asset.name,
          duration: asset.duration || null,
          fps: asset.fps || null,
          width: asset.width || null,
          height: asset.height || null,
          filesize: asset.filesize || null,
          thumb: asset.thumb || null,
          comments,
        });
      }

      return res.status(404).json({ error: 'No asset found' });
    }

    if (action === 'getAsset') {
      const assetRes = await fetch(
        `https://api.frame.io/v2/assets/${assetId}`,
        { headers }
      );
      if (!assetRes.ok) throw new Error(`Asset fetch failed: ${assetRes.status}`);
      const asset = await assetRes.json();
      return res.status(200).json({
        id: asset.id,
        name: asset.name,
        duration: asset.duration,
        fps: asset.fps,
        width: asset.width,
        height: asset.height,
        filesize: asset.filesize,
        thumb: asset.thumb,
      });
    }

    if (action === 'getComments') {
      const commentsRes = await fetch(
        `https://api.frame.io/v2/assets/${assetId}/comments?page_size=100`,
        { headers }
      );
      if (!commentsRes.ok) throw new Error(`Comments fetch failed: ${commentsRes.status}`);
      const data = await commentsRes.json();
      const comments = (data || []).map((c) => ({
        id: c.id,
        text: c.text || '',
        author: c.owner || { name: 'Unknown' },
        createdAt: c.inserted_at || c.created_at,
        timestamp: c.timestamp || null,
        completed: c.completed || false,
        category: categorizeComment(c.text || ''),
        commentType: categorizeType(c.text || ''),
      }));
      return res.status(200).json(comments);
    }

    if (action === 'test') {
      const meRes = await fetch('https://api.frame.io/v2/me', { headers });
      if (!meRes.ok) throw new Error(`Token invalid: ${meRes.status}`);
      const me = await meRes.json();
      return res.status(200).json({ success: true, user: me.name, email: me.email });
    }

    return res.status(400).json({ error: 'Invalid action or missing parameters' });
  } catch (err) {
    console.error('Frame.io proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ─── URL Parser ────────────────────────────────────────────
function parseFrameioUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);

    // https://app.frame.io/projects/PROJECT_ID/assets/ASSET_ID
    const projectAssetMatch = u.pathname.match(/\/projects\/[a-zA-Z0-9-]+\/assets\/([a-zA-Z0-9-]+)/);
    if (projectAssetMatch) return { type: 'asset', assetId: projectAssetMatch[1] };

    // https://app.frame.io/reviews/TOKEN
    const reviewMatch = u.pathname.match(/\/reviews\/([a-zA-Z0-9-]+)/);
    if (reviewMatch) return { type: 'review', token: reviewMatch[1] };

    // https://app.frame.io/player/ASSET_ID
    const playerMatch = u.pathname.match(/\/player\/([a-zA-Z0-9-]+)/);
    if (playerMatch) return { type: 'asset', assetId: playerMatch[1] };

    // https://f.io/TOKEN or https://fra.me/TOKEN
    if (u.hostname === 'f.io' || u.hostname === 'fra.me') {
      const token = u.pathname.replace('/', '').split('?')[0];
      if (token) return { type: 'review', token };
    }

    return null;
  } catch {
    return null;
  }
}

// ─── Comment Auto-categorization ───────────────────────────
function categorizeComment(text) {
  const lower = (text || '').toLowerCase();
  if (/voice|vo\b|audio|narrat|sound/.test(lower)) return 'voiceover';
  if (/animat|motion|transition|keyframe|ease|bounce/.test(lower)) return 'animation';
  if (/storyboard|script|story|scene|sequence|slide/.test(lower)) return 'storyboard';
  if (/\btext\b|copy|font|typo|caption|subtitle|title|heading/.test(lower)) return 'text';
  if (/timing|duration|speed|slow|fast|pace/.test(lower)) return 'timing';
  if (/\bui\b|design|layout|colou?r|brand|logo|icon|graphic/.test(lower)) return 'ui';
  return 'other';
}

function categorizeType(text) {
  const lower = (text || '').toLowerCase();
  if (/error|mistake|wrong|incorrect|fix|broken|not working|doesn't/.test(lower)) return 'error';
  return 'update';
}
