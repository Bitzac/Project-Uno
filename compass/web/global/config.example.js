// Copy to config.js (not committed) or let the deploy workflow write it from the FIREBASE_WEB_CONFIG variable.
// These values are the public Firebase web config: they identify the project, they are not secrets.
window.COMPASS_CONFIG = {
  firebase: {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'your-project.firebaseapp.com',
    projectId: 'your-project',
    appId: 'YOUR_APP_ID'
  }
};
