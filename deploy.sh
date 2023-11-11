#!/bin/sh

# Load project name from the environment prefix from the .env file
source .env
ENV=$ENV_PREFIX'podtron-project'

cdk deploy --all --require-approval never

#Make a call to the codebuild project to start the build
aws codebuild start-build --project-name $ENV --region $AWS_REGION --output json

