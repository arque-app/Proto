/** Seeded into the editor on first load so there's always a chart on screen. */
export const SAMPLE_FML = `# app.fml — three unrelated journeys in one map

@meta
  title: Demo App

@nodes
  Login = page
  authApi = api
  Home = page
  Denied = page
  Cart = page
  payApi = api
  Receipt = page
  Settings = page
  Profile = page

@node authApi {
  endpoint: https://api.example.com/auth/login
  method: POST
}

@flow
  Login -submit> authApi
  authApi:
    -200> Home
    -401> Denied

  Cart -checkout> payApi
  payApi -200> Receipt

  Settings -edit> Profile
  Profile -save> Settings
`;
