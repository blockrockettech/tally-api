const StellarGateway = require('../stellar/StellarGateway');

class AccountsService {

    constructor(_database, _firestore) {
        this.database = _database;
        this.firestore = _firestore;
    }

    async getByName(name) {
        console.log(`Looking up account by name [${name}]`);

        return this.firestore.collection(`users`).doc(name)
            .get()
            .then(function (doc) {
                if (doc.exists) {
                    const account = doc.data();
                    console.log("Found account:", account);
                    return account;
                }

                console.log("No account found");
                return null;
            }).catch(function (error) {
                console.log("Error getting document:", error);
            });
    }

    async register(name) {
        console.log(`Registering account for [${name}]`);

        const account = await this.getByName(name);
        if (account) {
            return account;
        }

        const keyPair = StellarGateway.createNewKeyPair();

        await StellarGateway.fundMinimumBalance(keyPair);

        return this.firestore
            .collection(`users`)
            .doc(name)
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

    async listAssets(account) {


    }

    async createAssetIntent(account, asset) {
        const {publicKey, secretKey, name} = account;

        const foundAsset = await this.firestore
            .collection(`users`)
            .doc(name)
            .collection(`assets`)
            .doc(asset)
            .get()
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
            publicKey,
            onNetwork: false,
            registered: Date.now()
        };

        return this.firestore
            .collection(`users`)
            .doc(name)
            .collection(`assets`)
            .doc(asset)
            .set(data)
            .then(() => {
                console.log("Created custom asset");
                return data;
            })
            .catch((error) => {
                console.error("Error registering custom asset: ", error);
                throw error;
            });

    }

}


module.exports = AccountsService;
