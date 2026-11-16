const jwt = require('jsonwebtoken');
function createTrackToken(orderId, justPlaced = true) {
  const secret = process.env.TRACK_TOKEN_SECRET;
  if (!secret) throw new Error('Missing TRACK_TOKEN_SECRET');
  return jwt.sign({ orderId: String(orderId), justPlaced }, secret, { expiresIn: '7d' });
}
module.exports = { createTrackToken };
