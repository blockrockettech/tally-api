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

}

module.exports = StellarGateway;
