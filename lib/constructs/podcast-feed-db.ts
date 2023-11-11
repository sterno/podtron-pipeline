//A CDK construct that sets up a Dynamo DB table for tracking incoming emails. 
//The table is used to track the status of the email as it is processed by the system.

import { Construct } from 'constructs';
import { StreamViewType, AttributeType, Billing, TableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as dotenv from 'dotenv';
dotenv.config();


export interface EmailTrackDynamoDB {
    tableName: string;
    podcastTable: TableV2;
}

export class PodcastFeedDB extends Construct {

    podcastTable = <TableV2>{tableName: 'dynamodb:table/'};

    constructor(scope: Construct, id: string) {
        super(scope, id);

        this.podcastTable = new TableV2(this, id, {
            tableName: id,
            partitionKey: {
                name: 'podcastId',
                type: AttributeType.STRING
            },
            globalSecondaryIndexes: [
                {
                    indexName: 'podcast-episode-index',
                    partitionKey: {
                        name: 'episodeNumber',
                        type: AttributeType.NUMBER
                    },
                    
                }
            ],
            billing: Billing.onDemand(),
            removalPolicy: RemovalPolicy.DESTROY,
            dynamoStream: StreamViewType.NEW_AND_OLD_IMAGES
        });

        
    }
}