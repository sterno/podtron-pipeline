//This code is an aws lambda function that is trigger when a new MP3 file is uploaded to the 
//inbound bucket.  It will initiate a new transcription job based on that MP3 file, with the
//output going to the outbound bucket.

import { S3Event } from 'aws-lambda';

import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import EpsiodeNumber from '../episode-number';

import AssemblyAI from 'assemblyai';
dotenv.config();

export const handler = async (event: S3Event) => {
    console.log('event: ', JSON.stringify(event, null, 2));
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key);
    console.log('bucket: ', bucket);
    console.log('key: ', key);

    try {
        const podcastId = await trackPodcast(bucket, key);
        if (podcastId) {
            const response = await startTranscriptionJob(bucket, key, podcastId);
            console.log('response: ', response);
        }
    }
    catch (err:any) {
        console.log('error: ', err);
        console.log(err.stack);
    }

}

async function trackPodcast (bucket:string, key:string):Promise<string|null> {
    const date = new Date();
    const timestamp = date.getTime();

    let podcastId = ''

    const dynamoClient = new DynamoDBClient();
    const documentClient = DynamoDBDocumentClient.from(dynamoClient, 
        { marshallOptions: { convertEmptyValues: true, removeUndefinedValues: true }
    });
    
    let episodeNumber=EpsiodeNumber.convertFileNameToEpisodeNumber(key);
    console.log('EPISODE NUMBER: '+episodeNumber);
    
    //Look to see if there's an existing entry for this podcast based on the episode number
    const lookupParams = {
        TableName: process.env.PODCAST_TABLE_NAME,
        IndexName: 'podcast-episode-index',
        KeyConditionExpression: 'episodeNumber = :episodeNumber',
        ProjectionExpression: 'podcastId, processingStatus',
        ExpressionAttributeValues: {
            ':episodeNumber': episodeNumber
        }
    };

    let updateEntry=false;

    const lookupResponse = await documentClient.send(new QueryCommand(lookupParams));
    if (lookupResponse.Items && lookupResponse.Items.length > 0) {
        const processingStatus = <string>lookupResponse.Items[0].processingStatus;
        if (processingStatus==='DONE') {
            console.log('Podcast already has a summary, marking complete.');
            return null;
        }
        podcastId = <string>lookupResponse.Items[0].podcastId;
        updateEntry=true;
    }
    else {
        podcastId = randomUUID();
    }

    //Store podcast in the Dynamodb table
    if (updateEntry) {
        //Update the existing entry
        const params = {
            TableName: process.env.PODCAST_TABLE_NAME,
            Key: {
                podcastId: podcastId
            },
            UpdateExpression: 'set processingStatus = :processingStatus',
            ExpressionAttributeValues: {
                ':processingStatus': 'TRANSCRIBING',
            }
        }

        console.log('params: ', JSON.stringify(params, null, 2));
        await documentClient.send(new UpdateCommand(params));
    }
    else {
        const params = {
            TableName: process.env.PODCAST_TABLE_NAME,
            Item: {
                podcastId: podcastId,
                timestamp: timestamp,
                bucket: bucket,
                key: key,
                episodeNumber: episodeNumber,
                title: `Episode ${episodeNumber}`,
                processingStatus: 'TRANSCRIBING'
            }
        }

        console.log('params: ', JSON.stringify(params, null, 2));

        await documentClient.send(new PutCommand(params));
    }
    return podcastId;
}

async function startTranscriptionJob (bucket:string, key:string, podcastId:string) {
    // Create unique job name
    const keyWithSpaces = key.replaceAll(/\+/g, ' ');
    const jobName = `${podcastId}`;
    
    //Create URL of the file to be transcribed
    const fileUrl = `https://${bucket}.s3.amazonaws.com/${key}`;

    const apiKey = process.env.ASSEMBLYAI_API_KEY as string;
    const client = new AssemblyAI({
        apiKey: apiKey,
    });

    const webhookUrl = `${process.env.WEBHOOK_URL}?podcastId=${podcastId}`;
    const data = {
        audio_url: fileUrl,
        speaker_labels: true,
        webhook_url: webhookUrl
    }

    console.log('Params to AssemblyAI: ', JSON.stringify(data, null, 2));


    const transcript = await client.transcripts.create(data, {
        poll: false
    });

    console.log(JSON.stringify(transcript, null, 2));
}


