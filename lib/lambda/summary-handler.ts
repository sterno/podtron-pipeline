import { SQSEvent } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

import * as dotenv from 'dotenv';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { ChatGPTPodcastProcessor } from './chat-gpt-podcast-processor';
dotenv.config();

export const handler = async (event: SQSEvent) => {
    console.log('event: ', JSON.stringify(event, null, 2));

    //Configure dynamo
    const dynamoClient = new DynamoDBClient();
    const documentClient = DynamoDBDocumentClient.from(dynamoClient, 
        { marshallOptions: { convertEmptyValues: true, removeUndefinedValues: true }
    });


    for (let record of event.Records) {
        const body = JSON.parse(record.body);
        const bucket = body.bucket;
        const key = body.key;
        const podcastId = body.podcastId;

        const getParams = {
            TableName: process.env.PODCAST_TABLE_NAME,
            Key: {
                podcastId: podcastId
            },
            ProjectionExpression: 'podcastId, title, summary, episodeNumber'
        }
        console.log('Get Params: '+JSON.stringify(getParams));
        const existingPodcast = await documentClient.send(new GetCommand(getParams));

        //Load the trasnscript from the S3 bucket
        const transcript = await loadTranscript(bucket as string, key as string);
        const gptResponse = await ChatGPTPodcastProcessor.sendPrompt(transcript);

        //Check response for errors
        if (gptResponse.error) {
            throw gptResponse.error;
        }
        
        try {
            //Update the summary in the DynamoDB table
            let title = gptResponse.title;
            title=title.replaceAll('\'', '');
            title=title.replaceAll('"', '');

            console.log('EPISODE NUMBER: '+existingPodcast.Item?.episodeNumber);
            let episodeNumber=existingPodcast.Item?.episodeNumber.toString();

            if (episodeNumber) {
                if (episodeNumber.indexOf('.') > -1) {
                    let partNumber = episodeNumber.split('.')[1];
                    episodeNumber = episodeNumber.split('.')[0];
                    title=`Episode ${episodeNumber} - Part ${partNumber} - ${title}`;
                }
                else {
                    title=`Episode ${episodeNumber} - ${title}`;
                }
            }

            const params = {
                TableName: process.env.PODCAST_TABLE_NAME,
                Key: {
                    podcastId: podcastId
                },
                UpdateExpression: 'set summary = :summary, title = :title, processingStatus = :processingStatus',
                ExpressionAttributeValues: {
                    ':summary': gptResponse.summary,
                    ':title': title,
                    ':processingStatus': 'DONE'
                }
            }

            console.log('params: ', params);

            const command = new UpdateCommand(params);
            const response = await documentClient.send(command);
        }
        catch (err:any) {
            console.log('Error updating podcast: ', err);
            console.log(err.stack);
        }
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