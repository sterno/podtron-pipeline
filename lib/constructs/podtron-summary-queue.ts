//Create SQS query for handling requests to summarize posts in case
//Chat GPT is having issues

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dotenv from 'dotenv';
dotenv.config();

export interface SummaryQueue {
    queue: cdk.aws_sqs.Queue;
}

export class SummaryQueue extends Construct {

    constructor(scope: Construct, id: string, queueName: string) {
        super(scope, id);

        this.queue = new cdk.aws_sqs.Queue(this, `${queueName}`, {
            queueName: queueName,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            visibilityTimeout: cdk.Duration.seconds(360),
        });

    }
}