/** Seeded into the editor on first load so there's always a chart on screen. */
export const SAMPLE_FML = `# app.fml — the five node types, one map.
# Edit here or click a node to edit it in the right-hand panel.

@meta
  title: Demo App
  base: https://api.example.com

@nodes
  Launch     = event
  HasSession = decision
  Login      = page
  authLogin  = api
  Home       = page
  Denied     = page
  Checkout   = flow

@node Launch {
  source: cold start
}

@node HasSession {
  condition: a saved token is present
}

@node Login {
  route: /login
  title: Sign in
}

# api nodes carry enough to be executed later — method, path, body,
# what to capture out of the response, and what status to expect.
@node authLogin {
  method: POST
  path: /auth/login
  body: {"email": "{email}", "password": "{password}"}
  capture.token: $.data.token
  expect: 200
}

@node Home {
  route: /
  title: Dashboard
}

@node Denied {
  route: /login
  title: Wrong credentials
}

# a flow node is a portal — it stands for another doc
@node Checkout {
  doc: checkout
}

@flow
  Launch -open> HasSession
  HasSession:
    -yes> Home
    -no> Login

  Login -submit> authLogin
  authLogin:
    -200> Home
    -401> Denied {
      note: three strikes locks the account
      owner: auth-team
    }

  Home -buy> Checkout


@doc checkout

@nodes
  Cart     = page
  payApi   = api
  Receipt  = page
  PayFailed = page

@node Cart {
  route: /cart
  title: Your basket
}

@node payApi {
  method: POST
  path: /payments
  header.Authorization: Bearer {token}
  capture.paymentId: $.data.id
  expect: 201
}

@node Receipt {
  route: /receipt
  title: Thanks!
}

@node PayFailed {
  route: /cart
  title: Payment declined
}

@flow
  Cart -pay> payApi
  payApi:
    -201> Receipt
    -402> PayFailed
  PayFailed -retry> Cart
`;
