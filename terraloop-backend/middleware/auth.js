'use strict';

const { getAuth, getIsFirebaseReady } = require('../firebase');

/**
 * Firebase Auth token verification middleware.
 * Reads Bearer token from Authorization header.
 * Attaches decoded user to req.user.
 *
 * In development (Firebase not configured), passes through with a mock user.
 */
async function verifyToken(req, res, next) {
  if (!getIsFirebaseReady()) {
    // Development fallback — use x-user-id header directly
    req.user = { uid: req.headers['x-user-id'] || 'dev-user' };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    const decoded = await getAuth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { verifyToken };
