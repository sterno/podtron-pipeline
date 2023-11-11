import { S3Event } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

import * as dotenv from 'dotenv';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
dotenv.config();

export const handler = async (event: S3Event) => {
    console.log('event: ', JSON.stringify(event, null, 2));
    const bucket = event.Records[0].s3.bucket.name;
    const key = event.Records[0].s3.object.key;
    console.log('bucket: ', bucket);
    console.log('key: ', key);

    if (key==='rss.xml') {
        return; //Skip the RSS feed
    }

    let podcastId = key.replaceAll('automated/', '');
    podcastId = podcastId.replaceAll('imported/', '');
    podcastId=podcastId.split('.')[0];

    console.log('podcastId: ', podcastId);

    try {
        //Configure dynamo
        const dynamoClient = new DynamoDBClient();
        const documentClient = DynamoDBDocumentClient.from(dynamoClient, 
            { marshallOptions: { convertEmptyValues: true, removeUndefinedValues: true }
        });

        //Load the existing entry from DynamoDB
        const getParams = {
            TableName: process.env.PODCAST_TABLE_NAME,
            Key: {
                podcastId: podcastId
            },
            ProjectionExpression: 'podcastId, title, summary, episodeNumber'
        }
        console.log('Get Params: '+JSON.stringify(getParams));
        const existingPodcast = await documentClient.send(new GetCommand(getParams));
        console.log('EPISODE: '+JSON.stringify(existingPodcast.Item));
        if (existingPodcast.Item?.summary) {
            console.log('Podcast already has a summary, marking complete.');

            const params = {
                TableName: process.env.PODCAST_TABLE_NAME,
                Key: {
                    podcastId: podcastId
                },
                UpdateExpression: 'set processingStatus = :processingStatus',
                ExpressionAttributeValues: {
                    ':processingStatus': 'DONE'
                }
            }
    
            console.log('params: ', params);
    
            const command = new UpdateCommand(params);
            const response = await documentClient.send(command);

        }
        else {
            //Write the bucket and key to the SQS queue for later processing
            const sqs = new SQSClient();
            const sqsResult = await sqs.send(new SendMessageCommand({
                QueueUrl: process.env.SUMMARY_QUEUE_URL as string,
                MessageBody: JSON.stringify({
                    bucket: bucket,
                    key: key,
                    podcastId: podcastId
                })
            }));

            console.log('sqsResult: ', sqsResult);

        }
        
    }
    catch (err:any) {
        console.log('error: ', err);
        console.log(err.stack);
    }

}

async function loadTranscript (bucket:string, key:string) : Promise<string>{
    const s3 = new S3Client();
    const response = await s3.send(new GetObjectCommand({
        Bucket: bucket,
        Key: key
    }));

    if (response.Body) {
        let responseString = await response.Body?.transformToString('utf-8');
        let summary = JSON.parse(responseString);
        let transcript = summary.text;

        //Limit the size of the transcript to 3000 words
        let split = transcript.split(' ');
        if (split.length > 3000) {
            split = split.slice(0, 3000);
            transcript = split.join(' ');
        }

        return transcript;
    }
    else {
        return '';
    }

}