# KCoin SDK

Examples
```

// Create an address
let seed = new Buffer(crypto.randomBytes(32));
let key = kcoin.keyPairFromSeed(seed.toString('hex'));
let address = kcoin.publicKeyToAddress(key.publicKey, kcoin.network.mainnet);

// Send a TX
let tx = new kcoin.Transaction({
        from,
        to,
        coin: 'KCN',
        amount: 5 * 1e8,
        nonce: 7,
        fee: 200,
        memo: 'First transfer',
        network: network
});
tx.sign(aliceKeypair.secretKey);
assert(tx.verify());
await rpc.request('tx_send', tx.toObject());
console.log(tx.hash, 'sent');

// RPC
let rpc = new kcoin.Rpc({
        host: 'mcp.kcoin.website',
        port: '443',
        timeout: 5000,
	ssl: true
});
console.log(await rpc.request('mempool_getStats'));
```
