//Mocha file to test the transcript processing

//import { expect } from 'chai';
import * as  fs from 'fs';

import awsTranscriptProcessor from '../lib/lambda/transcript-processor';

describe('Test transcript processing', () => {
    it('should return a transcript', async () => {
        //Load transcript file from test-data folder
        let testTranscript = fs.readFileSync('test-data/transcript.json', 'utf8');
        let transcriptJson = JSON.parse(testTranscript);

        const parsedTranscript = await awsTranscriptProcessor.processTranscript(transcriptJson);
    });
});
