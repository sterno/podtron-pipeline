//Code that sets up the event trigger on the inbound s3 bucket, calling the transcription handler lambda function

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Bucket, EventType } from 'aws-cdk-lib/aws-s3';
import { PolicyStatement, Effect} from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { S3EventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { TableV2 } from 'aws-cdk-lib/aws-dynamodb';

export class PodcastUploadEvent extends Construct {
    constructor(scope: Construct, id: string, inboundBucket: Bucket, outboundBucket: Bucket, podcastTable: TableV2, apiEndpoint: string) {
        super(scope, id);

        console.log('API Endpoint: ', apiEndpoint);
        const transcriptionHandler = new NodejsFunction(this, `${process.env.ENV_PREFIX}transcription-handler`, {
            entry: path.join(__dirname, '../lambda/transcription-handler.ts'),
            runtime: Runtime.NODEJS_18_X,
            timeout: cdk.Duration.seconds(30),
            environment: {
                OUTBOUND_BUCKET_NAME: outboundBucket.bucketName,
                PODCAST_TABLE_NAME: podcastTable.tableName,
                WEBHOOK_URL: apiEndpoint,
                ASSEMBLYAI_API_KEY: <string>process.env.ASSEMBLYAI_API_KEY,
            },
            functionName: 'podtron-transcription-handler',
            logRetention: 7
        });

        transcriptionHandler.addEventSource(new S3EventSource(
            inboundBucket, {
                events: [EventType.OBJECT_CREATED],
            }
        ));
    
        const dynamoDbPolicyStatement = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'dynamodb:PutItem', 
                'dynamodb:GetItem',
                'dynamodb:Query',
                'dynamodb:Scan',
                'dynamodb:UpdateItem'
            ],
            resources: [
                `${podcastTable.tableArn}`,
                `${podcastTable.tableArn}/index/*`
            ]
        });
        
        transcriptionHandler.addToRolePolicy(dynamoDbPolicyStatement);
    }
}