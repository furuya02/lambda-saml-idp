#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { CdkStack } from "../lib/cdk-stack";

const app = new cdk.App();
const envVals = app.node.tryGetContext("app");

new CdkStack(app, "SamlIdpLambdaStack", {
  projectName: envVals.projectName,
  endpoint: envVals.endpoint,
  entityId: envVals.entityId,
  publicCrt: envVals.publicCrt,
  privateKey: envVals.privateKey,
});
