const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');

admin.initializeApp();

/**
 * Validates a Google Play Purchase Token.
 * Expected data: { purchaseToken: string, productId: string, packageName: string }
 */
exports.validatePurchase = functions.https.onCall(async (data, context) => {
  // 1. Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { purchaseToken, productId, packageName } = data;

  if (!purchaseToken || !productId || !packageName) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing purchase data.');
  }

  try {
    // 2. Initialize Google Play Developer API
    // You must provide service account credentials in the environment or via ADC
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });
    const authClient = await auth.getClient();
    const play = google.androidpublisher({
      version: 'v3',
      auth: authClient,
    });

    // 3. Verify the purchase with Google Play
    try {
      const response = await play.purchases.products.get({
        packageName: packageName || 'com.colediverti.album2026',
        productId: productId || 'premium_upgrade',
        token: purchaseToken,
      });

      // 4. Check purchase state (0 = purchased, 1 = canceled, 2 = pending)
      if (response.data.purchaseState === 0) {
        const uid = context.auth.uid;

        // 5. Update user profile in Firestore to enable Premium
        await admin.firestore().collection('users').doc(uid).update({
          isPremium: true,
          purchaseToken: purchaseToken,
          premiumUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, message: 'Purchase validated and PRO features unlocked!' };
      } else {
        return { success: false, message: 'Purchase is not in a valid state.' };
      }
    } catch (apiError) {
      console.error('Google Play API Error details:', apiError);
      return { 
        success: false, 
        message: 'Google Play API verification failed. Make sure your service account is correctly configured in Google Play Console.',
        error: apiError.message
      };
    }
  } catch (error) {
    console.error('General Error validating purchase:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Error validating purchase.');
  }
});
