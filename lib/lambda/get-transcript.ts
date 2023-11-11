import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import TranscriptProcessor from "./transcript-processor";

//Event handler that's responding to a REST API call that's come through the API Gateway.
//It will retrieve the transcript from the outbound bucket based on the podcast Id

export const handler = async (event: APIGatewayProxyEvent):Promise<any> => {
    console.log('Event: ',event);
    const podcastId = event.queryStringParameters?.podcastId;
    console.log('podcastId: ', podcastId);

    //Retrieve the podcast info from S3 bucket based on the incoming podcastId
    const transcriptKey = `${podcastId}.json`;
    const bucket = process.env.OUTBOUND_BUCKET_NAME as string;
    const transcript = await loadTranscript(bucket, transcriptKey);
    console.log('transcript: ', transcript);
    const transcriptJson = JSON.parse(transcript as string);

    //Process the transcript
    const processedTranscript=TranscriptProcessor.processTranscript(transcriptJson);
    return {
        statusCode: 200,
        body:  JSON.stringify({
            transcript: processedTranscript,
        }),
        headers: {
            contentType: "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "OPTIONS,GET",
        }
    }

}

async function loadTranscript (bucket:string, key:string):Promise<string|undefined> {
    const s3 = new S3Client();
    const params = new GetObjectCommand({
        Bucket: bucket,
        Key: key
    });

    const response = await s3.send(params);
    return response.Body?.transformToString('utf-8');
    
}

