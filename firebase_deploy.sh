#!/usr/bin/env bash

echo "Deploying firebase functions"
firebase use tally-eab26;
firebase deploy --only functions;
