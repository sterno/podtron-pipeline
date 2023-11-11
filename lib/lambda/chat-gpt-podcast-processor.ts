
import {OpenAI} from 'openai'; 
import PodtronConfig from '../../podtron-config';

const configuration = {
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORGANIZATION
};

const openai = new OpenAI(configuration);

export class ChatGPTPodcastProcessor {

    static async sendPrompt (transcript:string) : Promise<any> {
        let messages=ChatGPTPodcastProcessor.bootstrapPromptForSummary;
        messages.push({
            role:"user",
            content:transcript
        });

        const params: OpenAI.Chat.ChatCompletionCreateParams = {
            model: <string>process.env.OPENAI_CHAT_GPT_MODEL,
            messages: <OpenAI.Chat.ChatCompletionMessageParam[]>messages
        };

        const gptResponse = await openai.chat.completions.create(params);

        let summary = gptResponse.choices[0].message.content; 
        console.log('Content Only: '+summary);
        

        let titleMessages=ChatGPTPodcastProcessor.bootstrapPromptForTitle;
        titleMessages.push({
            role:"user",
            content: <string>summary
        });

        const titleParams: OpenAI.Chat.ChatCompletionCreateParams = {
            model: <string>process.env.OPENAI_CHAT_GPT_MODEL,
            messages: <OpenAI.Chat.ChatCompletionMessageParam[]>titleMessages
        };

        const titleResponse = await openai.chat.completions.create(titleParams);
        let title = titleResponse.choices[0].message.content; 
        console.log('Title: '+title);

        return { 
            summary: summary,
            title: title 
        };
    }

    static bootstrapPromptForSummary=PodtronConfig.gptPrompts.summaryPrompt;

    static bootstrapPromptForTitle=PodtronConfig.gptPrompts.titlePrompt;




}


