import { TranscriptionLine } from "./transcript-processor";

/**
 * This class attempts to provide specific labels for speakers in the podcast.  It's necessarily custsom
 * and if not implemented speakers will just be labeled, A, B, C, etc.
 */

export default class SpeakerLabeler {
    static labelSpeakers(transcriptLines: TranscriptionLine[]) {

        //Insert custom code here to label speakers

        return transcriptLines;
    }
}