import { messaging } from './../../config/firebaseAdmin.js';

export async function sendNotification(deviceTokens, notificationPayload, customData = {}) {
    const tokens = Array.isArray(deviceTokens) ? deviceTokens : [deviceTokens];

    const messages = tokens.map(token => ({
        token,
        notification: notificationPayload,
        data: customData,
    }));

    try {
        const responses = await Promise.all(messages.map(msg => messaging.send(msg)));
        console.log(`✅ Notifications sent to ${tokens.length} devices`);
        return responses;
    } catch (error) {
        console.error('🔥 FCM Send Error:', error);
        throw error;
    }
};
