export default class EpsiodeNumber {

    /*
    This converts the episode name into an episode number.  So as long as the file
    is titled correctly, everything is automatic.  The assumption is:
    - The file name contains at most two numbers, the episode, and part number
    - If there's multiple parts to the episode, it should have "part" in the title to separate it
    - Example: "Episode 1.mp3" or "Episode 1 Part 1.mp3" or "Episode 1 Part 2.mp3"
    If there are any numbers elsewhere in the name it will behave weirdly.  So don't do that.
    */
    static convertFileNameToEpisodeNumber(fileName: string): number {


        fileName = fileName.replace('.mp3', '');
        fileName = fileName.replace('.m4a', '');
        let episodeNumber:number;

        if (fileName.toLowerCase().indexOf('part')>-1) {
            //This is a multipart episode and need to handle accordingly
            let partSplit = fileName.toLowerCase().split('part');
            let episodeNumberString = partSplit[0];
            let partNumberString = partSplit[1];
            episodeNumberString = episodeNumberString.replaceAll(/\D/g, '');
            partNumberString = partNumberString.replaceAll(/\D/g, '');
            episodeNumberString = episodeNumberString + '.' + partNumberString;
            episodeNumber = parseFloat(episodeNumberString);
        }
        else {
            let episodeNumberString = fileName.replaceAll(/\D/g, '');
            episodeNumber = parseInt(episodeNumberString);
        }

        return episodeNumber;
    }
}