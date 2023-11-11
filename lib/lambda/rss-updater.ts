import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBStreamEvent } from "aws-lambda";
import { Podcast } from 'podcast';
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { CodeBuildClient, StartBuildCommand } from "@aws-sdk/client-codebuild";
import PodtronConfig from '../../podtron-config';
import * as  d3 from 'd3';

export const handler = async (event: DynamoDBStreamEvent) => {
    const dynamoClient = new DynamoDBClient();
    const documentClient = DynamoDBDocumentClient.from(dynamoClient, { marshallOptions: { convertEmptyValues: true, removeUndefinedValues: true } });

    //Scan the dynamod db table for all records ordered by episode
    const params = new ScanCommand({
        TableName: process.env.PODCAST_TABLE_NAME,
        IndexName: 'podcast-episode-index',
        Select: 'ALL_ATTRIBUTES',
        ScanFilter: {
            processingStatus: {
                ComparisonOperator: 'EQ',
                AttributeValueList: ['DONE']
            }
        }
    });

    const response = await documentClient.send(params);

    //Format the response as an RSS feed
    const rss = formatAsRss(response.Items);

    //Upload rss to the content s3 bucket
    const s3 = new S3Client();

    const putParams = new PutObjectCommand({
        Bucket: process.env.CONTENT_BUCKET_NAME,
        Key: 'rss.xml',
        Body: rss,
        ContentType: 'application/rss+xml'
    });

    const putResponse = await s3.send(putParams);

    const putParamsTranscripts = new PutObjectCommand({
        Bucket: process.env.TRANSCRIPT_BUCKET_NAME,
        Key: 'rss.xml',
        Body: rss,
        ContentType: 'application/rss+xml'
    });

    const putResponseTranscripts = await s3.send(putParamsTranscripts);
    
    //Using the AWS CodeBuild API, trigger a new build of the static site
    try {
        const codeBuildClient = new CodeBuildClient();
        const codeBuildParams = {
            projectName: process.env.CODE_BUILD_PROJECT_ARN as string
        }
        
        const startCommand = new StartBuildCommand(codeBuildParams);
        const codeBuildResponse = await codeBuildClient.send(startCommand);
    }
    catch (err:any) {
        console.log('Likely expected error triggering code build: ', err);
    }
}
  
function formatAsRss (items:Record<string, any>[]|undefined) {
    //Create podcast using the node-podcast library
    //@ts-ignore
    const podcast = new Podcast(PodtronConfig.rssFeedConfig);

    if (items) {
        //Sort by episode number
        items.sort((a,b) => {
            return d3.descending(parseFloat(a.episodeNumber), parseFloat(b.episodeNumber));
        });

        for (let item of items) {
            let podcastItem = {
                title: item.title,
                description: item.summary,
                guid: item.podcastId,
                date: new Date(item.timestamp),
                itunesEpisode: item.episodeNumber,
                itunesSummary: item.summary,
                itunesExplicit: process.env.ITUNES_EXPLICIT as string,
                enclosure: {
                    url: encodeURI(`https://${item.bucket}.s3.amazonaws.com/${item.key}`),
                },
                ... PodtronConfig.rssFeedItemConfig

            }
            podcast.addItem(podcastItem);
        }
    }

    const xml=podcast.buildXml();
    return xml;



}