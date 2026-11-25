// AuraScan address for LearnLive. Safe to keep on GitHub: it is only an address, there are no keys here.
//
// How LearnLive proves to AuraScan that it is really LearnLive, without any secret in this code:
// LearnLive's server makes its own key pair from a secret the hosting already has (the Supabase
// service key). The PUBLIC half is shown at  /api/aurascan?action=pubkey . In AuraScan, an admin opens
// Developers / API -> "Linked websites", types this website's address and presses Link. Done.
//
// (Hosting settings AURASCAN_URL / AURASCAN_PUBLIC_KEY / AURASCAN_SECRET_KEY still work and win if set.)
// To switch AuraScan off: set url to ''.
export default {
  url: 'https://desktop-8avfe05.tail6dcbd1.ts.net',
};
