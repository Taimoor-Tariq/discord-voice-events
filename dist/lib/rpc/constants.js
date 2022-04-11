'use strict';

function keyMirror(arr) {
  const tmp = {};
  for (const value of arr) {
    tmp[value] = value;
  }
  return tmp;
}

exports.browser = typeof window !== 'undefined';

exports.RPCCommands = keyMirror([
  'DISPATCH',
  'GET_CHANNEL',
  'SUBSCRIBE',
  'UNSUBSCRIBE',
  'GET_SELECTED_VOICE_CHANNEL',
]);

exports.RPCEvents = keyMirror([
  'READY',
]);
