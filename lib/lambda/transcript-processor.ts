//This class will process the incoming AWS Transcribe object and 

import SpeakerLabeler from "./speaker-labeler";

export type TranscriptionLine = {
    speaker: string;
    text: string;
}

export default class TranscriptProcessor {

    static processTranscript (transcript: any) {
        let transcriptLines: TranscriptionLine[] = [];

        let currentSpeaker=null;
        let currentTranscriptLine:any=null;
        for (let i = 0; i < transcript.words.length; i++) {
            const item = transcript.words[i];
            if (!currentSpeaker || currentSpeaker!==item.speaker) {
                currentSpeaker=item.speaker;
                if (currentTranscriptLine) {
                    transcriptLines.push(currentTranscriptLine);
                }
                currentTranscriptLine = {
                    speaker: currentSpeaker,
                    text: ''
                }
            }
            
            if (currentTranscriptLine) {
                currentTranscriptLine.text += item.text + ' ';
            }
        }
        if (currentTranscriptLine) {
            transcriptLines.push(currentTranscriptLine);
        }
        transcriptLines= SpeakerLabeler.labelSpeakers(transcriptLines);
        let transcriptString = TranscriptProcessor.convertToText(transcriptLines);
        return transcriptString;
    }

    

    static convertToText(transcriptLines: TranscriptionLine[]) {
        let transcriptString = '';
        for (let i = 0; i < transcriptLines.length; i++) {
            const line = transcriptLines[i];
            transcriptString += `${line.speaker}: ${line.text}\n\n`;
        }
        return transcriptString;
    }
}