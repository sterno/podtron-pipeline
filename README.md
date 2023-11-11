# Podtron

Podtron is a tool I built to make the process of publishing podcasts a bit less tedious.  It was also a chance to play with AI tools and see what they were capable of.  The way Podtron works, once installed, is that you upload a podcast episode to an s3 bucket, and Podtron handles the rest.  It will post the episode and provide the title and description.  

As you might gather, there's a bit of tuning involved in this to get it right.  I'll probably evolve this a bit over time for my own needs, but overall just putting it out into the world as a POC.  

## How's it Built?

Podtron uses Gatsby as the framework, providing a way to host a site that's fast, running straight out of an S3 bucket.  The only piece that involves server side code is the transcript processor which is run as a Lambda function.  This is what reads in a transcript file and displays it on the site.

The back end is a simple AWS pipeline that takes the file from S3, tracks it in DynamoDB, and then processes it using a combination of ChatGPT and Assembly AI.  Assembly AI handles the transcription, and ChatGPT handles the summarization and title work.  I originally started with AWS transcribe, but found that Assembly AI did a better job.  I might shift to using Assembly's LLM features but for now this works.

## Site Generation

The Gatsby site is compiled every time there's a podcast episode.  This feels a little heavy weight, but what it leads to is a site that is blazingly fast.  The last step of the processing of the podcast episode triggers an update to the RSS feed for the podcast and the website rebuild.  

## Podtron Instructions

The steps go something like this: 

* Set up AWS credentials and AWS_PROFILE environment in your local build environment
* Set up a .env which contains the variables needed to run the system (the template for this is in example.env)
* Modify the Chat GPT prompts in the podtron-config.ts file - this will allow you to fine tune what you get back from Chat GPT
* Run the CDK bootstrap: cdk bootstrap
* Run the deploy.sh file which will initate the CDK build and trigger codebuild to generate your site

There's a couple other steps that need to happen along the way with the AWS setup.

* Verifying the domain name for the SSL certificates
* Authenticating the Codebuild project against your Github repo

## That's enough for now

This was something that scratched an itch for me, but if you find it useful, let me know.  The instructions here are bare bones, but if somebody actually uses this, I'll take the time to improve it.  
