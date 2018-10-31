'use strict';

const functions = require('firebase-functions');

const admin = require('firebase-admin');
admin.initializeApp();

const express = require('express');
const bodyParser = require('body-parser');

const cors = require('cors')({origin: true});


const firestore = admin.firestore();
const settings = {timestampsInSnapshots: true};
firestore.settings(settings);

const database = admin.database();

const AccountsService = require('./account/AccountsService');
const accountsService = new AccountsService(database, firestore);

const app = express();
app.use(cors);
app.use(bodyParser.json());

app.get('/account', async (req, res) => {
    const name = req.query.name;
    const account = await accountsService.getByName(name);
    validateAccountFound(res, account);

    return res.status(200).json({
        name: account.name,
        publicKey: account.publicKey,
    });
});

app.post('/account/register', async (req, res) => {
    const name = req.body.name;

    const account = await accountsService.register(name);
    validateAccountFound(res, account);

    return res.status(200).json({
        name: account.name,
        publicKey: account.publicKey,
    });
});

app.get('/account/assets', async (req, res) => {
    const name = req.query.name;

    const account = await accountsService.getByName(name);
    validateAccountFound(res, account);

    const assets = await accountsService.listAssets(account);
    return res.status(200).json({
        ...assets
    });
});

app.post('/account/assets/create', async (req, res) => {
    const name = req.body.name;
    const asset = req.body.asset;

    const account = await accountsService.getByName(name);
    validateAccountFound(res, account);

    const assets = await accountsService.createAsset(account, asset);
    return res.status(200).json({
        ...assets
    });
});

const validateAccountFound = (res, account) => {
    if (!account) {
        return res
            .status(500)
            .json({
                error: true,
                type: "ACCOUNT_NOT_FOUND"
            });
    }
};

exports.app = functions.https.onRequest(app);
