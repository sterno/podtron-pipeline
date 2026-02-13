//Lambda function that's a webhook for the callback from assemblyai.  It will
//Get the transcript from assembly AI, update the Dynamo DB record for the job, and then
//Store the transcript in S3

import { APIGatewayProxyEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

import AssemblyAI from 'assemblyai';
import * as dotenv from 'dotenv';
dotenv.config();

export const handler = async (event: APIGatewayProxyEvent) => {
    console.log('event: ', event);
    const body = JSON.parse(event.body as string);
    console.log('body: ', body);
    const transcriptId =  body.transcript_id;
    const status = body.status;
    const podcastId = event.queryStringParameters?.podcastId;

    if (status==='completed') {
        const apiKey = process.env.ASSEMBLYAI_API_KEY as string;
        const client = new AssemblyAI({
            apiKey: apiKey,
        });
        const transcript = await client.transcripts.get(transcriptId);

        //Upload the transcript to the outbound s3 bucket
        const s3 = new S3Client();
        const bucketName = process.env.OUTBOUND_BUCKET_NAME as string;
        const key = `${podcastId}.json`;
        const params = {
            Bucket: bucketName,
            Key: key,
            Body: JSON.stringify(transcript),
            ContentType: 'application/json'
        };
        await s3.send(new PutObjectCommand(params));
    }
    else if (status==='error') {
        //There was an error processing.  Write that out to DynamoDB
        const dynamoClient = new DynamoDBClient();
        const documentClient = DynamoDBDocumentClient.from(dynamoClient, 
            { marshallOptions: { convertEmptyValues: true, removeUndefinedValues: true }
        });
        const params = {
            TableName: process.env.PODCAST_TABLE_NAME,
            Key: {
                podcastId: podcastId
            },
            UpdateExpression: 'set processingStatus = :processingStatus',
            ExpressionAttributeValues: {
                ':processingStatus': 'ERROR'
            }
        }
        console.log('params: ', params);
        const command = new UpdateCommand(params);
        const response = await documentClient.send(command);
        return {
            status: 200
        }
    }
}
