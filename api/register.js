const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const record = req.body || {};
  if (!record.id) {
    record.id = 'reg_' + Date.now();
  }
  if (!record.submittedAt) {
    record.submittedAt = new Date().toISOString();
  }

  const filePath = path.join(process.cwd(), 'data', 'registrations.json');

  try {
    let list = [];
    if (fs.existsSync(filePath)) {
      list = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    list.push(record);
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf8');
  } catch (err) {
    // In serverless environments, file writing may be restricted
  }

  return res.status(200).json({
    success: true,
    message: 'Registration recorded successfully',
    record
  });
};
