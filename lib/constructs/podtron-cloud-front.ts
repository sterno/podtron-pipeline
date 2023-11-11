/*
Construct that sets up the cloud front distribution for the podcast site
that's hosted in the content bucket.
*/
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { CachePolicy, Distribution, OriginAccessIdentity, OriginProtocolPolicy, SSLMethod, ViewerProtocolPolicy } from "aws-cdk-lib/aws-cloudfront";
import { HttpOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { CanonicalUserPrincipal, Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import * as dotenv from 'dotenv';
dotenv.config();

export class PodtronCloudFront extends Construct {

    constructor(scope: Construct, id: string, contentBucket: Bucket, certificate: Certificate) {
        super(scope, id);

        const domainName = process.env.DOMAIN_NAME as string;

        //Set up the cloud front distribution
        const cloudfrontDistribution = new Distribution(this, `${process.env.ENV_PREFIX}cloudfront-distribution`, {
            defaultBehavior: {
                origin: new HttpOrigin(contentBucket.bucketWebsiteDomainName, {
                    protocolPolicy: OriginProtocolPolicy.HTTP_ONLY
            
                }),
                viewerProtocolPolicy: ViewerProtocolPolicy.ALLOW_ALL,
                cachePolicy: CachePolicy.CACHING_DISABLED,

                
            },
            domainNames: [domainName, `www.${domainName}`],
            certificate: certificate
        });

        const cloudfrontOAI = new OriginAccessIdentity(
            this, 'CloudFrontOriginAccessIdentity');

        contentBucket.addToResourcePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['s3:GetObject'],
            resources: [`${contentBucket.bucketArn}/*`],
            principals: [new CanonicalUserPrincipal(cloudfrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId)]
        }));
    }
}