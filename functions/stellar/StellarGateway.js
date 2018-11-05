const StellarSdk = require('stellar-sdk');

StellarSdk.Network.useTestNetwork();

const server = new StellarSdk.Server('https://horizon-testnet.stellar.org');

const axios = require('axios');

const MIN_XLM_BALANCE = '2.0';

const ACCOUNTS_PAYABLE = {
    publicKey: "GB3BHC6UGGJX4WOXJDINSINLUZEPWLZWCBNOFZF5AK64MX2HI4NUSAH5",
    secretKey: "SCQVOMPTZVZQJYQ2P5IHTDO7YVOW33ZX7QFIJ7DLCSJS47KIGOPQC3P3",
};

class StellarGateway {

    static createNewKeyPair() {
        console.log(`Creating key pair`);
        const pair = StellarSdk.Keypair.random();

        // return both for testing purposes
        return {
            secretKey: pair.secret(),
            publicKey: pair.publicKey(),
        };
    }

    static async fundMinimumBalance(account) {

        const {publicKey} = account;

        // The account is funding the balance
        const funder = await server.loadAccount(ACCOUNTS_PAYABLE.publicKey);

        // Send the minimum amount from the
        let transaction = new StellarSdk.TransactionBuilder(funder)
            .addOperation(StellarSdk.Operation.createAccount({
                destination: publicKey,
                startingBalance: MIN_XLM_BALANCE
            }))
            .build();

        // Sign the transaction
        transaction.sign(StellarSdk.Keypair.fromSecret(ACCOUNTS_PAYABLE.secretKey));

        // Submit to the network
        return server.submitTransaction(transaction);
    }

    static async transferNative(fromAccount, toAccount, amount) {
        const {publicKey: fromPublicKey, secretKey: fromSecretKey} = fromAccount;
        const {publicKey: toPublicKey} = toAccount;

        console.log(`Transferring XLM from [${fromPublicKey}] to [${toPublicKey}]`);

        const account = await server.loadAccount(ACCOUNTS_PAYABLE.publicKey);

        const transaction = new StellarSdk.TransactionBuilder(account)
            .addOperation(StellarSdk.Operation.payment({
                asset: new StellarSdk.Asset.native(),
                destination: toPublicKey,
                amount: `${amount}`,
                source: fromPublicKey // the account the operation is run on/against
            }))
            .build();

        // Requester signs it
        transaction.sign(StellarSdk.Keypair.fromSecret(fromSecretKey));

        // Fee payer signs it
        transaction.sign(StellarSdk.Keypair.fromSecret(ACCOUNTS_PAYABLE.secretKey));

        // Submit to the network
        return server.submitTransaction(transaction);
    }

    static async transferCustomAsset(fromAccount, toAccount, issuerAccount, asset, amount) {
        const {publicKey: fromPublicKey, secretKey: fromSecretKey} = fromAccount;
        const {publicKey: toPublicKey} = toAccount;

        console.log(`Transferring asset [${asset}] from issuer [${fromPublicKey}] to [${toPublicKey}]`);

        const account = await server.loadAccount(ACCOUNTS_PAYABLE.publicKey);

        const transaction = new StellarSdk.TransactionBuilder(account)
            .addOperation(StellarSdk.Operation.payment({
                asset: new StellarSdk.Asset(asset, issuerAccount.publicKey),
                destination: toPublicKey,
                amount: `${amount}`,
                source: fromPublicKey // the account the operation is run on/against
            }))
            .build();

        // Requester signs it
        transaction.sign(StellarSdk.Keypair.fromSecret(fromSecretKey));

        // Fee payer signs it
        transaction.sign(StellarSdk.Keypair.fromSecret(ACCOUNTS_PAYABLE.secretKey));

        // Submit to the network
        return server.submitTransaction(transaction);
    }

    static async trustlineExists(toAccount, issuerAccount, asset) {
        const {publicKey: toPublicKey} = toAccount;
        const {publicKey: issuerPublicKey} = issuerAccount;

        if (toPublicKey === issuerPublicKey) {
            console.log(`Skipping trustline creation between the same account [${issuerPublicKey}]`);
            return true;
        }

        const account = await server.loadAccount(toPublicKey);

        const trustlineFound = account.balances.some((balance) => {
            return balance.asset_code === asset
                && balance.asset_issuer === issuerPublicKey
                && balance.limit > 0;
        });
        console.log(`Checking trustline exist for issuer [${issuerPublicKey}] asset [${asset}] to [${toPublicKey}] - exists = [${trustlineFound}]`);

        return trustlineFound;
    }

    static async setupTrustline(toAccount, issuerAccount, asset, limit = '10000000') {

        const {publicKey: toPublicKey, secretKey: toSecretKey} = toAccount;
        const {publicKey: issuerPublicKey} = issuerAccount;

        console.log(`Setting up trustline between issuer [${issuerPublicKey}] asset [${asset}] to [${toPublicKey}] limit [${limit}]`);

        const account = await server.loadAccount(ACCOUNTS_PAYABLE.publicKey);

        const transaction = new StellarSdk.TransactionBuilder(account)
            .addOperation(StellarSdk.Operation.changeTrust({
                asset: new StellarSdk.Asset(asset, issuerPublicKey),
                limit: limit,
                source: toPublicKey // the account the operation is run on/against
            }))
            .build();

        // Source signs it
        transaction.sign(StellarSdk.Keypair.fromSecret(toSecretKey));

        // Fee payer signs it
        transaction.sign(StellarSdk.Keypair.fromSecret(ACCOUNTS_PAYABLE.secretKey));

        return server.submitTransaction(transaction);
    }

    static async revokeTrustline(toAccount, issuerAccount, asset) {
        // Note: A user cannot revoke a tustline if they are holding assets of this type
        // Note: The issuer can revoke a trustline and any of the issuers assets held by the account are locked

        const {publicKey: toPublicKey, secretKey: toSecretKey} = toAccount;
        const {publicKey: issuerPublicKey} = issuerAccount;

        console.log(`Revoking trustline between issuer [${issuerPublicKey}] asset [${asset}] to [${toPublicKey}]`);

        const account = await server.loadAccount(ACCOUNTS_PAYABLE.publicKey);

        const transaction = new StellarSdk.TransactionBuilder(account)
            .addOperation(StellarSdk.Operation.changeTrust({
                asset: new StellarSdk.Asset(asset, issuerPublicKey),
                limit: '0', // Set to ZERO to clear
                source: toPublicKey // the account the operation is run on/against
            }))
            .build();

        // Source signs it
        transaction.sign(StellarSdk.Keypair.fromSecret(toSecretKey));

        // Fee payer signs it
        transaction.sign(StellarSdk.Keypair.fromSecret(ACCOUNTS_PAYABLE.secretKey));

        return server.submitTransaction(transaction);
    }
}

module.exports = StellarGateway;
