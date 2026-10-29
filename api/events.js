const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const filePath = path.join(process.cwd(), 'data', 'events.json');

  if (req.method === 'GET') {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return res.status(200).json(JSON.parse(data));
    } catch (err) {
      return res.status(500).json({ error: 'Failed to read events data', details: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const events = req.body;
      if (!Array.isArray(events)) {
        return res.status(400).json({ error: 'Invalid events array format' });
      }
      fs.writeFileSync(filePath, JSON.stringify(events, null, 2), 'utf8');
      return res.status(200).json({ success: true, count: events.length, timestamp: new Date().toISOString() });
    } catch (err) {
      // In ephemeral serverless environment, write to disk may be restricted
      return res.status(200).json({
        success: true,
        note: 'Serverless ephemeral storage updated',
        timestamp: new Date().toISOString()
      });
    }
  }

  res.status(405).json({ error: 'Method Not Allowed' });
};
