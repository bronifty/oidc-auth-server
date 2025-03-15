const { generateKeyPair, exportJWK } = require('jose');

(async () => {
    const { privateKey } = await generateKeyPair('RS256', {
        extractable: true,
        use: 'sig',
        key_ops: ['sign', 'verify']
    });
    const jwk = await exportJWK(privateKey);
    console.log(JSON.stringify(jwk));
})();

// $ npm install jose
// $ node generate-jwks.js | openssl base64 | tr -d '\n' | pbcopy