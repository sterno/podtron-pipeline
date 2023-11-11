import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dotenv from 'dotenv';
import { PodtronBucket } from './constructs/podtron-bucket';
import { PodcastUploadEvent } from './constructs/podcast-upload-event';
import { PodcastFeedDB } from './constructs/podcast-feed-db';
import { TranscriptionCompleteEvent } from './constructs/transcription-complete-events';
import { RssUpdateEvent } from './constructs/rss-update-event';
import { PodtronApiSetup } from './constructs/podtron-api-setup';
import { PodtronCodeBuild } from './constructs/podtron-code-build';
import { SummaryQueue } from './constructs/podtron-summary-queue';
import { PodtronCloudFront } from './constructs/podtron-cloud-front';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
dotenv.config();

export class PodtronPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string,  podtronCert: Certificate, props?: cdk.StackProps) {
    super(scope, id, props);

    const inboundBucketName = `${process.env.ENV_PREFIX}${process.env.INBOUND_BUCKET_NAME}`;
    const outboundBucketName = `${process.env.ENV_PREFIX}${process.env.OUTBOUND_BUCKET_NAME}`;
    const contentBucketName = `${process.env.ENV_PREFIX}${process.env.CONTENT_BUCKET_NAME}`;
    const buildBucketName = `${process.env.ENV_PREFIX}${process.env.BUILD_BUCKET_NAME}`;
    const feedDbName = `${process.env.ENV_PREFIX}${process.env.PODCAST_TABLE_NAME}`;

    const inboundBucket = new PodtronBucket(this, inboundBucketName, inboundBucketName, true);
    const outboundBucket = new PodtronBucket(this, outboundBucketName, outboundBucketName, true);
    const contentBucket = new PodtronBucket(this, contentBucketName, contentBucketName, true);
    const buildBucket = new PodtronBucket(this, buildBucketName, buildBucketName, false);

    const podcastFeedDb = new PodcastFeedDB(this, feedDbName);

   

    //Define APIs
    const transcriptApi = new PodtronApiSetup(this, `${process.env.ENV_PREFIX}transcript-hook-api`, podcastFeedDb.podcastTable, outboundBucket.bucket, contentBucket.bucket, podtronCert);

    //Configure code build
    const codeBuild = new PodtronCodeBuild(this, `${process.env.ENV_PREFIX}code-build`, contentBucket.bucket, buildBucket.bucket, transcriptApi.restEndpointUrl, outboundBucket.bucket);

    //Set up the SQS queue
    const summaryQueue = new SummaryQueue(this, `${process.env.ENV_PREFIX}summary-queue`, `${process.env.ENV_PREFIX}summary-queue`);

    //Configure lambda events
    const podcastUploadEvent = new PodcastUploadEvent(this, `${process.env.ENV_PREFIX}podcast-upload-event`, inboundBucket.bucket, outboundBucket.bucket, podcastFeedDb.podcastTable, transcriptApi.restEndpointUrl);
    const transcriptionCompleteEvent = new TranscriptionCompleteEvent(this, `${process.env.ENV_PREFIX}transcription-complete-event`, podcastFeedDb.podcastTable, outboundBucket.bucket, summaryQueue.queue);
    const rssUpdateEvent = new RssUpdateEvent(this, `${process.env.ENV_PREFIX}rss-update-event`, podcastFeedDb.podcastTable, outboundBucket.bucket, codeBuild.codeBuild, contentBucket.bucket);
    
    //Configure cloudfront
    const cloudfront = new PodtronCloudFront(this, `${process.env.ENV_PREFIX}cloudfront`, contentBucket.bucket, podtronCert);
  }
  
}
