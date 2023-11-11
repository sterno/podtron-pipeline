//Set up the API Gateway endpoint for handling the incoming webhook from AssemblyAI
import * as cdk from 'aws-cdk-lib';
import { Construct } from "constructs";
import { TableV2 } from "aws-cdk-lib/aws-dynamodb";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import path = require("path");
import { Runtime } from "aws-cdk-lib/aws-lambda";
import PodtronConfig from '../../podtron-config';
import { EndpointType, LambdaIntegration, Method, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Certificate, CertificateValidation, ValidationMethod } from 'aws-cdk-lib/aws-certificatemanager';
import { allowedNodeEnvironmentFlags } from 'process';


export interface PodtronApiSetup {
    restEndpointUrl: string,
}

export class PodtronApiSetup extends Construct {

    restEndpointUrl: string;

    constructor(scope: Construct, id: string, podcastTable: TableV2, outboundBucket: Bucket, contentBucket: Bucket, certificate: Certificate) {
        super(scope, id);

        const transcriptWebookHandler = new NodejsFunction(this, `${process.env.ENV_PREFIX}db-transcript-hook`, {
            entry: path.join(__dirname, '../lambda/transcript-hook.ts'),
            runtime: Runtime.NODEJS_18_X,
            timeout: cdk.Duration.seconds(30),
            environment: {
                PODCAST_TABLE_NAME: podcastTable.tableName,
                OUTBOUND_BUCKET_NAME: outboundBucket.bucketName,
                ASSEMBLYAI_API_KEY: <string>process.env.ASSEMBLYAI_API_KEY,
            },
            functionName: `${process.env.ENV_PREFIX}db-transcript-hook`,
            logRetention: 7,
        });

        //Add permission to upload to outbound bucket
        transcriptWebookHandler.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
            effect: cdk.aws_iam.Effect.ALLOW,
            actions: ['s3:PutObject'],
            resources: [`${outboundBucket.bucketArn}/*`]
        }));

       
        const getTranscriptHandler = new NodejsFunction(this, `${process.env.ENV_PREFIX}db-get-transcript`, {
            entry: path.join(__dirname, '../lambda/get-transcript.ts'),
            runtime: Runtime.NODEJS_18_X,
            timeout: cdk.Duration.seconds(30),
            environment: {
                OUTBOUND_BUCKET_NAME: outboundBucket.bucketName
            },
            functionName: `${process.env.ENV_PREFIX}db-get-transcript`,
            logRetention: 7
        });

        getTranscriptHandler.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
            effect: cdk.aws_iam.Effect.ALLOW,
            actions: ['s3:GetObject'],
            resources: [`${outboundBucket.bucketArn}/*`]
        }));

        let allowedOrigins:Array<string> = PodtronConfig.allowedOrigins as Array<string>;
        allowedOrigins.push(contentBucket.bucketWebsiteUrl);

        
        //Set up API end points and CORS
        const api = new RestApi(this, `${process.env.ENV_PREFIX}podtron-api`, {
            defaultCorsPreflightOptions: {
                allowOrigins: allowedOrigins,
                allowMethods: ['GET', 'POST'],
            },
            domainName: {
                domainName: process.env.API_DOMAIN_NAME as string,
                certificate: certificate,
                endpointType: EndpointType.EDGE,
            }
        });

        
        const transcriptResource = api.root.addResource('transcript');

        transcriptResource.addMethod('GET',new LambdaIntegration(getTranscriptHandler));
        transcriptResource.addMethod('POST', new LambdaIntegration(transcriptWebookHandler));

        this.restEndpointUrl=`https://${process.env.API_DOMAIN_NAME}/transcript`;`}`
        
    }
}