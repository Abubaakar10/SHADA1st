# Firebase Setup Guide — SHADA1st Apparel Shop

This guide will walk you through setting up a free Firebase project to sync products, collections, and settings across all customer devices and admin screens in real-time.

---

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add Project** (or **Create a Project**).
3. Name your project (e.g. `shada1st-apparel`).
4. (Optional) Disable Google Analytics unless desired, then click **Create Project**.

---

## Step 2: Register a Web App & Get Credentials

1. On your project overview page in Firebase Console, click the **Web icon (`</>`)** to add a web application.
2. Enter App nickname: `SHADA1st Web App`.
3. Click **Register app**.
4. You will see a `const firebaseConfig = { ... }` block containing your keys. Copy this JSON object:

```json
{
  "apiKey": "AIzaSy...",
  "authDomain": "shada1st-apparel.firebaseapp.com",
  "projectId": "shada1st-apparel",
  "storageBucket": "shada1st-apparel.appspot.com",
  "messagingSenderId": "1234567890",
  "appId": "1:1234567890:web:abcdef..."
}
```

---

## Step 3: Create Firestore Database

1. In the left navigation menu of Firebase Console, click **Build** -> **Firestore Database**.
2. Click **Create Database**.
3. Choose **Production mode** or **Test mode** and select your closest location (e.g. `eur3` or `us-central`).
4. Click **Enable**.

---

## Step 4: Configure Firestore Security Rules

1. In the Firestore Database tab, click **Rules**.
2. Copy and paste the rules from `firestore-rules.txt` in this repository:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /products/{productId} {
      allow read, write: if true;
    }
    match /collections/{collectionId} {
      allow read, write: if true;
    }
    match /settings/{settingId} {
      allow read, write: if true;
    }
  }
}
```

3. Click **Publish**.

---

## Step 5: Connect Firebase to SHADA1st Admin Panel

You have two easy ways to connect your Firebase credentials:

### Option A: Via Admin Dashboard (No Coding Required)
1. Open `admin.html` in your web browser.
2. Enter your Admin PIN (Default: `1234`).
3. Click the **WhatsApp & Settings** tab.
4. Scroll down to **Firebase Integration & Sync**.
5. Paste your JSON credentials object into the box and click **Save & Connect Firebase**.
6. The green badge will appear showing **Firebase Firestore Connected**!

### Option B: Via `js/firebase-config.js`
Open `js/firebase-config.js` in your editor and update `defaultFirebaseConfig` with your credentials.

---

## Instant Fallback (Demo Mode)

If Firebase credentials are not entered, the application automatically uses **LocalStorage Engine**, allowing you to test products, collections, drag-and-drop sorting, and WhatsApp link generation immediately out-of-the-box!
