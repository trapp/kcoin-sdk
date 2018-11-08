let crypto = require('crypto');
let nacl = require('tweetnacl');
let assert = require('assert');
let bech32 = require('bech32');
let JsonRpc = require('./JsonRpc');

const maxInt = 9223372036854775807;
const network = {
    mainnet: {
        prefix: 'kcn'
    },
    regtest: {
        prefix: 'ktest'
    }
};

class Transaction {

    constructor({
        amount,
        coin,
        fee,
        from,
        nonce,
        to,
        network,
        memo = "",
        signature = null
    }) {
        this.tx = {
            amount,
            coin,
            fee,
            from,
            memo,
            nonce,
            to
        };
        assertTx(this.tx);
        assert(network && network.prefix, 'invalid network');
        assert(from === null || isAddressValid(from, network), 'invalid from address');
        assert(isAddressValid(to, network), 'invalid to address');
        this.hash = hash(this.tx);
        this.signature = signature;
        this.network = network;
    }

    sign(privateKey) {
        this.signature = sign(this.tx, privateKey);
    }

    verify() {
        return verify(this.tx, this.signature, addressToPublicKey(this.tx.from !== null ? this.tx.from : this.tx.to, this.network));
    }

    valueOf() {
        return {
            hash: this.hash.toString('hex'),
            signature: this.signature === null ? null : this.signature.toString('hex'),
            tx: this.tx
        };
    }

    toObject() {
        return this.valueOf();
    }

    toString() {
        return JSON.stringify(this.valueOf());
    }
}


function sign (tx, privateKey) {
    return Buffer.from(nacl.sign.detached(sha256(serialize(tx)), privateKey));
}

function verify (tx, signature, publicKey) {
    return nacl.sign.detached.verify(sha256(serialize(tx)), signature, publicKey);
}

function sha256(data) {
    return crypto.createHash('sha256').update(data).digest();
}

function hash (tx) {
    return sha256(serialize(tx));
}

function serialize (tx) {
    assertTx(tx);
    let payload = JSON.stringify({
        amount: tx.amount,
        coin: tx.coin,
        fee: tx.fee,
        from: tx.from,
        memo: tx.memo,
        nonce: tx.nonce,
        to: tx.to
    });
    let buffer = new Buffer(payload, 'utf8');
    return buffer;
}

function deserialize (buffer) {
    assert(Buffer.isBuffer(buffer), 'buffer expected');
    let payload = buffer.toString('hex');
    let tx = JSON.parse(payload);
    assertTx(tx);
    return {
        amount: tx.amount,
        coin: tx.coin,
        fee: tx.fee,
        from: tx.from,
        memo: tx.memo,
        nonce: tx.nonce,
        to: tx.to
    };
}

function assertTx(tx) {
    //console.log(tx);
    assert(tx.from || tx.from === null, 'from missing');
    assert(tx.to, 'to missing');
    assert(isInt(tx.fee), 'fee has to be a number');
    assert(tx.fee < maxInt, 'fee has to be less than 2^64');
    assert(tx.coin, 'coin missing');
    assert(typeof tx.coin === 'string', 'coin has to be a string');
    assert(tx.coin.length <= 4, 'coin can have a max length of 64 bytes');
    assert(tx.coin === tx.coin.toUpperCase(), 'coin has to be upper case');
    assert(tx.amount, 'amount missing');
    assert(isInt(tx.amount), 'amount has to be a number');
    assert(tx.amount < maxInt, 'amount has to be less than 2^64')
    assert(typeof tx.nonce === 'number', 'nonce is missing');
    assert(isInt(tx.nonce), 'nonce has to be a number');
    assert(typeof tx.memo === 'string', 'memo has to be a string');
    assert(tx.memo.length <= 64, 'memo can have a max length of 64 bytes');
    assert(tx.memo.match(/^[ -~]*$/), 'memo can only contain printable ascii characters (space to tilde)');
}

function isInt(value) {
    return !isNaN(value) && value === parseInt(value, 10) && value >= 0;
}

function addressToPublicKey(address, network) {
    assert(network && network.prefix, 'invalid network');
    let decoded = bech32.decode(address);
    assert(decoded.prefix === network.prefix, "Wrong prefix");
    return new Buffer(bech32.fromWords(decoded.words));
}

function publicKeyToAddress(publicKey, network) {
    assert(network && network.prefix, 'invalid network');
    return bech32.encode(network.prefix, bech32.toWords(publicKey));
}

function isAddressValid(address, network) {
    assert(network && network.prefix, 'invalid network');
    try {
        addressToPublicKey(address, network);
        return true;
    } catch (e) {
        return false;
    }
}

function keyPairFromSeed(seed) {
    return nacl.sign.keyPair.fromSeed(new Buffer(seed, 'hex'));
}

module.exports = {
    addressToPublicKey,
    publicKeyToAddress,
    keyPairFromSeed,
    deserialize,
    serialize,
    hash,
    verify,
    sign,
    isAddressValid,
    network,
    Transaction,
    nacl,
    Rpc: JsonRpc
};
