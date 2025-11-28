import { Draft } from '@zimtsui/amenda';
import OpenAI from 'openai';
declare const openai: OpenAI;

export async function *optimize(problem: string): Draft<string | Error> {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: 'Please solve math problems.' },
        { role: 'user', content: problem },
    ];
    for (;;) {
        const completion = await openai.chat.completions.create({ model: 'gpt-4o', messages });
        messages.push(completion.choices[0]!.message);
        try {
            if (completion.choices[0]!.message.content! === 'OPPOSE')
                return yield new Error('My answer is correct.');
            else
                return yield completion.choices[0]!.message.content!;
        } catch (e) {
            if (e instanceof Error) {} else throw e;
            messages.push({
                role: 'user',
                content: `Your answer is rejected: ${e.message}. Please revise your answer.`,
            });
        }
    }
}
