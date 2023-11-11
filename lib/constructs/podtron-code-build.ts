import {aws_codebuild, aws_iam } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import * as dotenv from 'dotenv';
dotenv.config();

export interface PodtronCodeBuild {
    codeBuild: aws_codebuild.Project;
}

export class PodtronCodeBuild extends Construct {


    codeBuild: aws_codebuild.Project;

    constructor(scope: Construct, id: string, contentBucket: Bucket, buildBucket: Bucket, apiEndpoint: string, outboundBucket: Bucket) {
        super(scope, id);

        const variablesToInclude = ['DOMAIN_NAME','SITE_TITLE','SUB_TITLE','ITUNES_CATEGORY','ITUNES_SUBCATEGORY','ITUNES_EMAIL','ENV_PREFIX','API_DOMAIN_NAME'];

        //Create json of environment variables but stripping out everything AWS related
        let tempEnv = Object.assign({}, process.env);
        for (let key in tempEnv) {
            if (!variablesToInclude.includes(key)) {
                delete tempEnv[key];
            }
        }

        tempEnv.GATSBY_RSS_FEED_URL=outboundBucket.urlForObject('rss.xml');
        tempEnv.CONTENT_BUCKET=contentBucket.bucketName;
        tempEnv.GATSBY_API_ENDPOINT=apiEndpoint;
        tempEnv.SITE_URL=`https://${process.env.DOMAIN_NAME}`;
        tempEnv.IMAGE_URL=`https://${process.env.DOMAIN_NAME}/logo.png`;

        //Now format the environment variables in the style of 'variable name':{value:'variable value'}
        let buildEnvVars:any = {};
        Object.keys(tempEnv).forEach((key) => {
            buildEnvVars[key] = {value:tempEnv[key]};
        });
       
        let codeBuildConfig = {
            projectName: `${process.env.ENV_PREFIX}podtron-project`,
            buildSpec: aws_codebuild.BuildSpec.fromSourceFilename('buildspec.yml'),
            environment: {
              buildImage: aws_codebuild.LinuxArmBuildImage.AMAZON_LINUX_2_STANDARD_3_0,
              computeType: aws_codebuild.ComputeType.SMALL,
              environmentVariables: buildEnvVars,
            },
            concurrentBuildLimit:1,
            source: {},
            cache: aws_codebuild.Cache.bucket(buildBucket),
        }
        if (process.env.GIT_BRANCH) {
            codeBuildConfig.source = aws_codebuild.Source.gitHub({
                repo: process.env.GIT_REPO as string,
                owner: process.env.GIT_OWNER as string,
                branchOrRef: process.env.GIT_BRANCH as string
            });
        }
        else {
            codeBuildConfig.source = aws_codebuild.Source.gitHub({
                repo: process.env.GIT_REPO as string,
                owner: process.env.GIT_OWNER as string,
            });
        }

        //@ts-ignore - this is complaining about the way we assemble the config but it will be fine at runtime
        this.codeBuild = new aws_codebuild.Project(this, `${process.env.ENV_PREFIX}site-project`, codeBuildConfig);

        //Make sure the code build pipeline has access to the content bucket
        this.codeBuild.addToRolePolicy(new aws_iam.PolicyStatement({
            effect: aws_iam.Effect.ALLOW,
            actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
                's3:ListBucket',
                's3:GetBucketLocation',
                's3:putBucketWebsite',
            ],
            resources: [
                contentBucket.bucketArn,
                contentBucket.bucketArn + '/*'
            ]
        }));
    }
}