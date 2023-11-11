import * as cdk from 'aws-cdk-lib';
import { TableV2 } from "aws-cdk-lib/aws-dynamodb";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { S3EventSource, SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Bucket, EventType } from 'aws-cdk-lib/aws-s3';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from "constructs";
import path = require("path");


export class TranscriptionCompleteEvent extends Construct {
    constructor(scope: Construct, id: string, podcastTable: TableV2, outboundBucket: Bucket, summaryQueue: Queue) {
        super(scope, id);

        const summaryHandler = new NodejsFunction(this, 'podtron-summary-handler', {
            entry: path.join(__dirname, '../lambda/summary-handler.ts'),
            runtime: Runtime.NODEJS_18_X,
            timeout: cdk.Duration.seconds(60),
            memorySize: 256,
            environment: {
                PODCAST_TABLE_NAME: podcastTable.tableName,
                OPENAI_API_KEY: <string>process.env.OPENAI_API_KEY,
                OPENAI_ORGANIZATION: <string>process.env.OPENAI_ORGANIZATION,
                OPENAI_CHAT_GPT_MODEL: <string>process.env.OPENAI_CHAT_GPT_MODEL,
            },
            functionName: 'podtron-summary-handler',
            logRetention: 7
        });

        const transcriptCompleteHandler = new NodejsFunction(this, 'podtron-transcript-complete-handler', {
            entry: path.join(__dirname, '../lambda/transcription-complete-handler.ts'),
            runtime: Runtime.NODEJS_18_X,
            timeout: cdk.Duration.seconds(60),
            memorySize: 256,
            environment: {
                PODCAST_TABLE_NAME: podcastTable.tableName,
                OPENAI_API_KEY: <string>process.env.OPENAI_API_KEY,
                OPENAI_ORGANIZATION: <string>process.env.OPENAI_ORGANIZATION,
                OPENAI_CHAT_GPT_MODEL: <string>process.env.OPENAI_CHAT_GPT_MODEL,
                SUMMARY_QUEUE_URL: summaryQueue.queueUrl,
            },
            functionName: 'podtron-transcript-complete-handler',
            logRetention: 7
        });


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

        const s3PolicyStatement = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                's3:GetObject',
            ],
            resources: [
                `${outboundBucket.bucketArn}`,
                `${outboundBucket.bucketArn}/*`
            ]
        });

        const sqsPolicyStatement = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'sqs:*'
            ],
            resources: [
                summaryQueue.queueArn
            ]
        });

        transcriptCompleteHandler.addEventSource(new S3EventSource(
            outboundBucket, {
                events: [EventType.OBJECT_CREATED],
            }
        ));

        summaryHandler.addEventSource(new SqsEventSource(summaryQueue, {
            batchSize: 1,
        }));


        summaryHandler.addToRolePolicy(dynamoDbPolicyStatement);
        summaryHandler.addToRolePolicy(s3PolicyStatement);
        summaryHandler.addToRolePolicy(sqsPolicyStatement);
        transcriptCompleteHandler.addToRolePolicy(dynamoDbPolicyStatement);
        transcriptCompleteHandler.addToRolePolicy(s3PolicyStatement);
        transcriptCompleteHandler.addToRolePolicy(sqsPolicyStatement);
    }

}