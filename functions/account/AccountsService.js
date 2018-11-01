const StellarGateway = require('../stellar/StellarGateway');
const _ = require('lodash');

class AccountsService {

    constructor(_database, _firestore) {
        this.database = _database;
        this.firestore = _firestore;
    }

    async getByName(name) {
        console.log(`Looking up account by name [${name}]`);

        const doc = await this.firestore.collection(`users`).doc(name).get();

        if (doc.exists) {
            const account = doc.data();
            console.log("Found account:", account);
            return account;
        }

        console.log("No account found");
        return null;
    }

    async register(name) {
        console.log(`Registering account for [${name}]`);

        const account = await this.getByName(name);
        if (account) {
            return account;
        }

        const keyPair = StellarGateway.createNewKeyPair();

        await StellarGateway.fundMinimumBalance(keyPair);

        return this.firestore.collection(`users`).doc(name)
            .set({
                name,
                ...keyPair,
                registered: Date.now()
            })
            .then(() => {
                console.log("Registered account successfully");
                return this.getByName(name);
            })
            .catch((error) => {
                console.error("Error registering account: ", error);
                throw error;
            });
    }

    async listAllAssets() {
        const snapshot = await this.firestore.collection(`users`).get();

        let users = [];
        snapshot.forEach(doc => {
            users.push(doc.data());
        });

        const promises = users.map((user) => this.listAssets(user));
        const results = await Promise.all(promises);

        return _.flatten(results);
    }

    async listAssets(account) {
        const {name} = account;

        const snapshot = await this.firestore
            .collection(`users`).doc(name)
            .collection(`assets`)
            .get();

        const assets = [];
        snapshot.forEach(doc => {
            assets.push(doc.data());
        });
        return assets;
    }

    async createAssetIntent(account, asset) {
        const {publicKey, name} = account;

        const accountAssetsRes = this.firestore
            .collection(`users`).doc(name)
            .collection(`assets`).doc(asset);

        const foundAsset = await accountAssetsRes.get()
            .then(doc => {
                if (doc.exists) {
                    return doc.data();
                }
                return null;
            });

        if (foundAsset) {
            console.log("Already created asset, returning it");
            return foundAsset;
        }

        const data = {
            asset,
            name,
            publicKey,
            registered: Date.now()
        };

        return accountAssetsRes.set(data)
            .then(() => {
                console.log("Created custom asset");
                return data;
            })
            .catch((error) => {
                console.error("Error registering custom asset: ", error);
                throw error;
            });
    }

    async transfer(fromAccount, toAccount, asset, amount) {
        const hasTrustline = await StellarGateway.trustlineExists(fromAccount, toAccount, asset);
        if (!hasTrustline) {
            await StellarGateway.setupTrustline(fromAccount, toAccount, asset);
        }

        return StellarGateway.transferCustomAsset(fromAccount, toAccount, asset, amount)
            .then(() => {
                return true;
            })
            .catch((error) => {
                console.log(error);
                throw error;
            });
    }

}


module.exports = AccountsService;
