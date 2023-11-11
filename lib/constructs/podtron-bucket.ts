//CDK construct for creating the inbound email bucket

import { Construct } from 'constructs';
import { BlockPublicAccess, Bucket, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as dotenv from 'dotenv';
dotenv.config();

export interface PodtronBucket {
    bucket: Bucket;
}

export class PodtronBucket extends Construct {

    bucket: Bucket;

    constructor(scope: Construct, id: string, bucketName: string, allowPublic: boolean) {
        super(scope, id);
    
        let bucketParams = {
            bucketName: bucketName,
            removalPolicy: RemovalPolicy.DESTROY,
            publicReadAccess: allowPublic,
            objectOwnership: ObjectOwnership.BUCKET_OWNER_PREFERRED,
            blockPublicAccess: allowPublic?BlockPublicAccess.BLOCK_ACLS:BlockPublicAccess.BLOCK_ALL,
            isWebsite: allowPublic?true:false
        };

        this.bucket = new Bucket(this, `${bucketName}`, bucketParams );

    }
}