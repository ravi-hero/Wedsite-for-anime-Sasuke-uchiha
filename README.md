# Sasuke Uchiha — Anime Vault

This new package is based on your supplied files. The website name remains **Sasuke Uchiha**.

## Included
- Dark violet/silver/crimson responsive design
- Admin button in the top menu bar and separate admin login modal
- Member sign-up/sign-in
- Anime video grid, search, genre/category filters, player and download link
- Admin video upload, thumbnail selection, and delete controls
- Firebase Authentication, Firestore and Storage integration points

## Important security note about admin creation
You asked for admin account creation inside the website without manually matching a Firebase UID. A static GitHub Pages website cannot safely grant admin permissions by itself. If public signup automatically grants admin access in frontend code, visitors could make themselves admins. To do this safely, the admin creation action must call a trusted backend (for example, a Firebase Cloud Function) that verifies an owner-only setup secret and assigns the admin role. Never put that secret or a service-account key in `app.js`.

The current frontend still checks the `admins` collection by Firebase UID, so the no-manual-UID requirement is **not fully implemented yet** in this static package. A trusted backend and matching security rules are required before production use. I have not added an insecure client-side bypass.

## Setup
1. Upload `index.html`, `style.css`, `app.js`, `firestore.rules`, `storage.rules`, and `README.md` to the root of your existing GitHub repository.
2. In Firebase Console → Project settings → Your apps → Web app, replace the config placeholders in `app.js` with the exact web config values.
3. Enable Email/Password under Authentication and configure Firestore and Storage.
4. Publish security rules only after implementing the trusted admin provisioning flow.
5. Upload only videos and images you own or have permission to distribute.

Keep the project name and branding as **Sasuke Uchiha**. Admin UI visibility is not security by itself; server-side authorization is necessary.
