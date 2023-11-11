#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PodtronPipelineStack } from '../lib/podtron-pipeline-stack';
import * as dotenv from 'dotenv';
import PodtronCertStack from '../lib/podtron-cert-stack';
dotenv.config();

const app = new cdk.App();

//Need to set up cert stack in us-east-1 otherwise it won't work with cloudfront
const certStack = new PodtronCertStack(app, `${process.env.ENV_PREFIX}PodtronCertStack`, {
  env: {
    region: 'us-east-1'
  },
  crossRegionReferences: true
});
new PodtronPipelineStack(app, `${process.env.ENV_PREFIX}PodtronPipelineStack`, certStack.certificate, {
  env: {
    region: process.env.AWS_REGION,
  },
  crossRegionReferences: true
});