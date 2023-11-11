import * as cdk from 'aws-cdk-lib';
import { Project } from 'aws-cdk-lib/aws-codebuild';
import { TableV2 } from "aws-cdk-lib/aws-dynamodb";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Runtime, StartingPosition } from "aws-cdk-lib/aws-lambda";
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from "constructs";
import path = require("path");


/*
static rssFeedConfig={
        "title": process.env.SITE_TITLE,
        "description": process.env.SUB_TITLE,
        "feedUrl": process.env.GATSBY_RSS_FEED_URL,
        "siteUrl": `https://${process.env.DOMAIN_NAME}`,
        "imageUrl": process.env.IMAGE_URL,
        "language": "en",
        "categories": [process.env.ITUNES_CATEGORY],
        "itunesCategory": [{
            "text": process.env.ITUNES_CATEGORY,
            "subcats": [{
                "text": process.env.ITUNES_SUBCATEGORY
            }]
        }]
    }

    static rssFeedItemConfig={
        url: this.rssFeedConfig.siteUrl,
        itunesName: process.env.SITE_TITLE,
        itunesEmail: process.env.ITUNES_EMAIL,
        itunesAuthor: process.env.SITE_TITLE
    }

    static allowedOrigins = [
        `https://${process.env.DOMAIN_NAME}`,
*/


export class RssUpdateEvent extends Construct {
    constructor(scope: Construct, id: string, podcastTable: TableV2, transcriptBucket:Bucket, codebuild: Project, contentBucket: Bucket) {
        super(scope, id);

        const imageURL = `https://${process.env.DOMAIN_NAME}/logo.png`;

        const rssHandler = new NodejsFunction(this, `${process.env.ENV_PREFIX}rss-update-handler`, {
            entry: path.join(__dirname, '../lambda/rss-updater.ts'),
            runtime: Runtime.NODEJS_18_X,
            timeout: cdk.Duration.seconds(30),
            environment: {
                PODCAST_TABLE_NAME: podcastTable.tableName,
                TRANSCRIPT_BUCKET_NAME: transcriptBucket.bucketName,
                CONTENT_BUCKET_NAME: contentBucket.bucketName,
                CODE_BUILD_PROJECT_ARN: codebuild.projectArn,
                SITE_TITLE: process.env.SITE_TITLE as string,
                SUB_TITLE: process.env.SUB_TITLE as string,
                GATSBY_RSS_FEED_URL: process.env.GATSBY_RSS_FEED_URL as string,
                ITUNES_CATEGORY: process.env.ITUNES_CATEGORY as string,
                ITUNES_SUBCATEGORY: process.env.ITUNES_SUBCATEGORY as string,
                ITUNES_EMAIL: process.env.ITUNES_EMAIL as string,
                ITUNES_EXPLICIT: process.env.ITUNES_EXPLICIT as string,
                DOMAIN_NAME: process.env.DOMAIN_NAME as string,
                IMAGE_URL: imageURL,

            },
            functionName: `${process.env.ENV_PREFIX}rss-update-handler`,
            logRetention: 7
        });


        const dynamoDbPolicyStatement = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'dynamodb:GetItem',
                'dynamodb:Query',
                'dynamodb:Scan',
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
                's3:PutObject',
                's3:PutObjectAcl',
            ],
            resources: [
                `${contentBucket.bucketArn}`,
                `${contentBucket.bucketArn}/*`,
                `${transcriptBucket.bucketArn}`,
                `${transcriptBucket.bucketArn}/*`
            ]
        });

        //Add permissions to run the code build once done
        const codeBuildPolicyStatement = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'codebuild:StartBuild',
            ],
            resources: [
                codebuild.projectArn
            ]
        });


        rssHandler.addEventSource(new DynamoEventSource(
            podcastTable,{
                startingPosition: StartingPosition.TRIM_HORIZON,
                batchSize: 1,
                retryAttempts: 0
            }
        ));

        rssHandler.addToRolePolicy(dynamoDbPolicyStatement);
        rssHandler.addToRolePolicy(s3PolicyStatement);
        rssHandler.addToRolePolicy(codeBuildPolicyStatement);

    
    }

}