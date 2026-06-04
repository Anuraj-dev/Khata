// Stub for @react-native-google-signin/google-signin in Expo Go.
// The real native module only works in a dev/prod build.
// This stub lets the app boot in Expo Go without crashing;
// Google Sign-In buttons will be disabled (canGoogleSignIn stays false).

const GoogleSignin = {
  configure: () => {},
  hasPlayServices: () => Promise.resolve(true),
  signIn: () => Promise.reject(new Error("Google Sign-In not available in Expo Go")),
  signOut: () => Promise.resolve(),
  isSignedIn: () => false,
  getCurrentUser: () => null,
  getTokens: () => Promise.reject(new Error("Not available in Expo Go")),
};

const statusCodes = {
  SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
  IN_PROGRESS: "IN_PROGRESS",
  PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE",
  SIGN_IN_REQUIRED: "SIGN_IN_REQUIRED",
};

module.exports = { GoogleSignin, statusCodes };
