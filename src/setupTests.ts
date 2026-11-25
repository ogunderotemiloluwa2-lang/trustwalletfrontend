// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// jsdom exposes a Uint8Array that is a different realm from Node's, so Node
// Buffers returned by ethers' crypto helpers fail ethers' own `instanceof
// Uint8Array` check. Aligning Buffer's prototype chain fixes that.
if (typeof Buffer !== 'undefined' && !(Buffer.from([]) instanceof Uint8Array)) {
  Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype);
}
