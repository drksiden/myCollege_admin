import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Admin SDK is usually initialized in index.ts, so we don't initialize it here again.
// However, if this file were to be deployed as a standalone function, initialization would be needed:
// if (!admin.apps.length) { admin.initializeApp(); }

interface NewsData {
  title: string;
  content: string;
  isPublished: boolean;
  // Add other fields if necessary for context or typing
}

export const onNewsPublished = functions.firestore
  .document('news/{newsId}')
  .onWrite(async (change, context) => {
    const { newsId } = context.params;

    // Handle deletion: If the news item is deleted, do nothing.
    if (!change.after.exists) {
      console.log(`News ${newsId} was deleted. No notification sent.`);
      return null;
    }

    const newsData = change.after.data() as NewsData | undefined;

    // If no data after the change (should not happen if not a delete), do nothing.
    if (!newsData) {
      console.log(`No data for news ${newsId} after write. No notification sent.`);
      return null;
    }

    const beforeData = change.before.exists ? (change.before.data() as NewsData | undefined) : undefined;

    // Determine if the news was "just published"
    // This means either:
    // 1. It's a new document that is published.
    // 2. It's an existing document that was not published before, but now is.
    const justPublished = newsData.isPublished && (!beforeData || !beforeData.isPublished);

    if (!justPublished) {
      console.log(`News ${newsId} is not newly published (isPublished: ${newsData.isPublished}, previously published: ${beforeData?.isPublished}). No notification sent.`);
      return null;
    }

    console.log(`News ${newsId} (${newsData.title}) was just published. Preparing notifications.`);

    try {
      const usersSnapshot = await admin.firestore().collection('users').get();

      if (usersSnapshot.empty) {
        console.log('No users found to notify.');
        return null;
      }

      const batch = admin.firestore().batch();
      const notificationsCollection = admin.firestore().collection('notifications');

      usersSnapshot.forEach(userDoc => {
        const userId = userDoc.id;
        const notificationRef = notificationsCollection.doc(); // Auto-generate ID

        const notificationPayload = {
          userId: userId,
          title: `New Article: ${newsData.title}`,
          message: newsData.content.substring(0, 100) + (newsData.content.length > 100 ? '...' : ''),
          type: 'news' as const, // Ensures the type is exactly 'news'
          read: false,
          data: { newsId: newsId },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        batch.set(notificationRef, notificationPayload);
      });

      await batch.commit();
      console.log(`Successfully sent notifications to ${usersSnapshot.size} users for news ${newsId}.`);
      return null;

    } catch (error) {
      console.error(`Error sending notifications for news ${newsId}:`, error);
      // Optionally, rethrow or handle specific errors if needed
      return null; // Or throw error to indicate failure for retry mechanisms if configured
    }
  });
