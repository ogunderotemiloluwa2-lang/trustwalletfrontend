# Trust Wallet Web

## Run the application

This project is the front end only. The authentication API lives in
[`../backend`](../backend) and must be running separately.

```bash
npm install
npm start          # http://localhost:3000
```

The API base URL comes from `REACT_APP_API_URL` in `.env` (defaults to
`http://localhost:5000`). Point it at the deployed Render URL in production.

```text
REACT_APP_API_URL=http://localhost:5000
```

Because `REACT_APP_*` values are inlined at build time, changing this value
requires a rebuild.

## Accounts and sign-in

- Account data (display name, password hash, six-digit code hash, headline
  balance, wallet records) lives in MongoDB. Nothing about the user is written to
  `localStorage`.
- Creating a wallet asks for a wallet password **and** a six-digit code. The
  password signs the account in; the code opens the encrypted wallet.
- Signing in happens once per device. Afterwards the app opens straight on the
  six-digit code screen, and the password is only needed on a new device or
  after signing out.
- A forgotten code is reset from the code screen: the wallet password is checked
  against MongoDB, then the new code is saved to the account with
  `POST /api/auth/pin`. The back arrow on the code screen signs out on this
  device and returns to the password screen.
- Once an account exists the app opens on the sign-in screen, never on wallet
  setup again.
- The headline balance is stored on the account, so it is the same on every
  device and is never reset by signing out or by removing a wallet from a device.
  It stays at `$0` until an amount is set in Settings.
- The session token and the remembered unlock state use `localStorage`, so the
  owner keeps signing in once per device; the lock flag and the idle clock use
  `sessionStorage`, so a fresh tab starts locked.
- Every password input has a show/hide toggle.

## Tests

```bash
npm test
```

## Existing Create React App scripts

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
