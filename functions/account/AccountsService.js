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

    async listAssets(account) {

    }

    async createAsset(account, asset) {

    }

}


module.exports = AccountsService;
