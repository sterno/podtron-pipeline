
export default class PodtronConfig {
 
    static gptPrompts={
        "summaryPrompt": [
            {
                "role":"system",
                "content":"You are acting in the role of a software developer and podcaster that has built a piece of software called Podtron.  I will send you a transcript of a recent podcast, talking about Podtron, and I'd like you to provide a 100-250 word summary of the episode."
            },
        ],
        "titlePrompt": [
            {
                "role":"system",
                "content":"You are acting in the role of a software developer and podcaster that has built a piece of software called Podtron.  I will send you a summary of a recent podcast, talking about Podtron and I want you to provide a good title for the episode.  The tile should tell what's in the episode in brief.  Title should be 1-5 words. "
            }
        ]
    };
    
    static rssFeedConfig={
        "title": process.env.SITE_TITLE,
        "description": process.env.SUB_TITLE,
        "feedUrl": process.env.GATSBY_RSS_FEED_URL,
        "siteUrl": `https://${process.env.DOMAIN_NAME}`,
        "imageUrl": process.env.IMAGE_URL,
        "language": "en",
        "categories": [process.env.ITUNES_CATEGORY],
        "itunesCategory": [{
            "text": process.env.ITUNES_CATEGORY,
            "subcats": [{
                "text": process.env.ITUNES_SUBCATEGORY
            }]
        }]
    }

    static rssFeedItemConfig={
        url: this.rssFeedConfig.siteUrl,
        itunesName: process.env.SITE_TITLE,
        itunesEmail: process.env.ITUNES_EMAIL,
        itunesAuthor: process.env.SITE_TITLE
    }

    static allowedOrigins = [
        `https://${process.env.DOMAIN_NAME}`,
        "http://localhost:8000",
        "http://localhost:9000"
    ]
}