"use strict";

const EventEmitter = require("events");
const fetch = require("node-fetch");
const transports = require("./transports");
const { RPCCommands, RPCEvents } = require("./constants");
const { uuid } = require("./util");

/**
 * @typedef {RPCClientOptions}
 * @extends {ClientOptions}
 * @prop {string} transport RPC transport. one of `ipc` or `websocket`
 */

/**
 * The main hub for interacting with Discord RPC
 * @extends {BaseClient}
 */
class RPCClient extends EventEmitter {
    /**
     * @param {RPCClientOptions} [options] Options for the client.
     * You must provide a transport
     */
    constructor(options = {}) {
        super();

        this.options = options;

        this.accessToken = null;
        this.clientId = null;

        /**
         * Application used in this client
         * @type {?ClientApplication}
         */
        this.application = null;

        /**
         * User used in this application
         * @type {?User}
         */
        this.user = null;

        const Transport = transports[options.transport];
        if (!Transport) {
            throw new TypeError("RPC_INVALID_TRANSPORT", options.transport);
        }

        this.fetch = (method, path, { data, query } = {}) =>
            fetch(
                `${this.fetch.endpoint}${path}${
                    query ? new URLSearchParams(query) : ""
                }`,
                {
                    method,
                    body: data,
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                    },
                }
            ).then(async (r) => {
                const body = await r.json();
                if (!r.ok) {
                    const e = new Error(r.status);
                    e.body = body;
                    throw e;
                }
                return body;
            });

        this.fetch.endpoint = "https://discord.com/api";

        /**
         * Raw transport userd
         * @type {RPCTransport}
         * @private
         */
        this.transport = new Transport(this);
        this.transport.on("message", this._onRpcMessage.bind(this));

        /**
         * Map of nonces being expected from the transport
         * @type {Map}
         * @private
         */
        this._expecting = new Map();

        this._connectPromise = undefined;
    }

    /**
     * Search and connect to RPC
     */
    connect(clientId) {
        if (this._connectPromise) {
            return this._connectPromise;
        }
        this._connectPromise = new Promise((resolve, reject) => {
            this.clientId = clientId;
            const timeout = setTimeout(
                () => reject(new Error("RPC_CONNECTION_TIMEOUT")),
                10e3
            );
            timeout.unref();
            this.once("connected", () => {
                clearTimeout(timeout);
                resolve(this);
            });
            this.transport.once("close", () => {
                this._expecting.forEach((e) => {
                    e.reject(new Error("connection closed"));
                });
                this.emit("disconnected");
                reject(new Error("connection closed"));
            });
            this.transport.connect().catch(reject);
        });
        return this._connectPromise;
    }

    /**
     * @typedef {RPCLoginOptions}
     * @param {string} clientId Client ID
     * @param {string} [clientSecret] Client secret
     * @param {string} [accessToken] Access token
     * @param {string} [rpcToken] RPC token
     * @param {string} [tokenEndpoint] Token endpoint
     * @param {string[]} [scopes] Scopes to authorize with
     */

    /**
     * Performs authentication flow. Automatically calls Client#connect if needed.
     * @param {RPCLoginOptions} options Options for authentication.
     * At least one property must be provided to perform login.
     * @example client.login({ clientId: '1234567', clientSecret: 'abcdef123' });
     * @returns {Promise<RPCClient>}
     */
    async login(options = {}) {
        let { clientId, accessToken } = options;
        await this.connect(clientId);
        if (!options.scopes) {
            this.emit("ready");
            return this;
        }
        if (!accessToken) {
            accessToken = await this.authorize(options);
        }
        return this.authenticate(accessToken);
    }

    /**
     * Request
     * @param {string} cmd Command
     * @param {Object} [args={}] Arguments
     * @param {string} [evt] Event
     * @returns {Promise}
     * @private
     */
    request(cmd, args, evt) {
        return new Promise((resolve, reject) => {
            const nonce = uuid();
            this.transport.send({ cmd, args, evt, nonce });
            this._expecting.set(nonce, { resolve, reject });
        });
    }

    /**
     * Message handler
     * @param {Object} message message
     * @private
     */
    _onRpcMessage(message) {
        if (
            message.cmd === RPCCommands.DISPATCH &&
            message.evt === RPCEvents.READY
        ) {
            if (message.data.user) {
                this.user = message.data.user;
            }
            this.emit("connected");
        } else if (this._expecting.has(message.nonce)) {
            const { resolve, reject } = this._expecting.get(message.nonce);
            if (message.evt === "ERROR") {
                const e = new Error(message.data.message);
                e.code = message.data.code;
                e.data = message.data;
                reject(e);
            } else {
                resolve(message.data);
            }
            this._expecting.delete(message.nonce);
        } else {
            this.emit(message.evt, message.data);
        }
    }

    /**
     * Authorize
     * @param {Object} options options
     * @returns {Promise}
     * @private
     */
    async authorize({
        scopes,
        clientSecret,
        rpcToken,
        redirectUri,
        prompt,
    } = {}) {
        if (clientSecret && rpcToken === true) {
            const body = await this.fetch("POST", "/oauth2/token/rpc", {
                data: new URLSearchParams({
                    client_id: this.clientId,
                    client_secret: clientSecret,
                }),
            });
            rpcToken = body.rpc_token;
        }

        const { code } = await this.request("AUTHORIZE", {
            scopes,
            client_id: this.clientId,
            prompt,
            rpc_token: rpcToken,
        });

        const response = await this.fetch("POST", "/oauth2/token", {
            data: new URLSearchParams({
                client_id: this.clientId,
                client_secret: clientSecret,
                code,
                grant_type: "authorization_code",
                redirect_uri: redirectUri,
            }),
        });

        return response.access_token;
    }

    /**
     * Authenticate
     * @param {string} accessToken access token
     * @returns {Promise}
     * @private
     */
    authenticate(accessToken) {
        return this.request("AUTHENTICATE", { access_token: accessToken }).then(
            ({ application, user }) => {
                this.accessToken = accessToken;
                this.application = application;
                this.user = user;
                this.emit("ready");
                return this;
            }
        );
    }

    /**
     * Get a channel
     * @param {Snowflake} id Channel ID
     * @param {number} [timeout] Timeout request
     * @returns {Promise<Channel>}
     */
    getChannel(id, timeout) {
        return this.request(RPCCommands.GET_CHANNEL, {
            channel_id: id,
            timeout,
        });
    }

    /**
     * Get selected voice channel
     * @param {number} [timeout] Timeout request
     * @returns {Promise<Collection<Snowflake, Guild>>}
     */
    getSelectedVoiceChannel(timeout) {
        return this.request(RPCCommands.GET_SELECTED_VOICE_CHANNEL, {
            timeout,
        });
    }

    /**
     * Subscribe to an event
     * @param {string} event Name of event e.g. `MESSAGE_CREATE`
     * @param {Object} [args] Args for event e.g. `{ channel_id: '1234' }`
     * @returns {Promise<Object>}
     */
    async subscribe(event, args) {
        await this.request(RPCCommands.SUBSCRIBE, args, event);
        return {
            unsubscribe: () =>
                this.request(RPCCommands.UNSUBSCRIBE, args, event),
        };
    }

    /**
     * Destroy the client
     */
    async destroy() {
        await this.transport.close();
    }
}

module.exports = RPCClient;
