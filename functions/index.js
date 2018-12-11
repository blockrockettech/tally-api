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
        balances: account.balances
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

app.get('/assets', async (req, res) => {
    const assets = await accountsService.listAllAssets();
    return res.status(200).json({
        ...assets
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

    const assets = await accountsService.createAssetIntent(account, asset);
    return res.status(200).json({
        ...assets
    });
});

app.post('/account/assets/revoke', async (req, res) => {
    const to = req.body.to;
    const asset = req.body.asset;
    const issuer = req.body.issuer;

    const toAccount = await accountsService.getByName(to);
    validateAccountFound(res, toAccount);

    const issuerAccount = await accountsService.getByName(issuer);
    validateAccountFound(res, issuerAccount);

    const success = await accountsService.revokeTrustline(toAccount, issuerAccount, asset);
    return res.status(200).json({
        success
    });
});

app.post('/transfer', async (req, res) => {
    const from = req.body.from;
    const to = req.body.to;
    const asset = req.body.asset;
    const amount = req.body.amount;

    const fromAccount = await accountsService.getByName(from);
    validateAccountFound(res, fromAccount);

    const toAccount = await accountsService.getByName(to);
    validateAccountFound(res, toAccount);

    const issuerAccount = await accountsService.getByName(asset.issuer);
    validateAccountFound(res, issuerAccount);

    const success = await accountsService.transfer(fromAccount, toAccount, issuerAccount, asset, amount);
    return res.status(200).json({
        success
    });
});

app.post('/transfer/native', async (req, res) => {
    const from = req.body.from;
    const to = req.body.to;
    const amount = req.body.amount;

    const fromAccount = await accountsService.getByName(from);
    validateAccountFound(res, fromAccount);

    const toAccount = await accountsService.getByName(to);
    validateAccountFound(res, toAccount);

    const success = await accountsService.transferNative(fromAccount, toAccount, amount);
    return res.status(200).json({
        success
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
