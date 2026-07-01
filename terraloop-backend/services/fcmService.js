'use strict';

const { getMessaging, getIsFirebaseReady } = require('../firebase');

/**
 * Send a push notification to a specific device token via FCM.
 */
async function sendPush(deviceToken, title, body, data = {}) {
  if (!getIsFirebaseReady()) {
    console.log(`[FCM Mock] Would send: "${title}" → "${body}" to token ${deviceToken?.slice(0,12)}...`);
    return { success: true, mock: true };
  }

  const messaging = getMessaging();
  if (!messaging) return { success: false, reason: 'FCM not initialised' };

  try {
    const message = {
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      token: deviceToken
    };
    const response = await messaging.send(message);
    return { success: true, messageId: response };
  } catch (err) {
    console.error('FCM send error:', err.message);
    return { success: false, reason: err.message };
  }
}

/**
 * Notify a user that a facility near them now accepts their garage item.
 */
async function notifyFacilityFound(deviceToken, itemName, facilityName) {
  return sendPush(
    deviceToken,
    '📍 Facility Found Nearby',
    `${facilityName} now accepts your "${itemName}". Tap to view details.`,
    { type: 'FACILITY_ALERT' }
  );
}

/**
 * Notify a user about a community milestone.
 */
async function notifyCommunityActivity(deviceToken, message) {
  return sendPush(deviceToken, '🌱 TerraLoop Community', message, { type: 'COMMUNITY' });
}

module.exports = { sendPush, notifyFacilityFound, notifyCommunityActivity };
