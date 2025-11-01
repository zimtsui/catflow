import { Draft } from '@zimtsui/amenda';
import OpenAI from 'openai';
declare const openai: OpenAI;

export async function *solve(problem: string): Draft<string> {
	const messages: OpenAI.ChatCompletionMessageParam[] = [
		{ role: 'system', content: 'Please solve math problems.' },
		{ role: 'user', content: problem },
	];
	for (;;) {
		const completion = await openai.chat.completions.create({ model: 'gpt-4o', messages });
		messages.push({ role: 'assistant', content: completion.choices[0]!.message.content! });
		try {
			return yield completion.choices[0]!.message.content!;
		} catch (e) {
			if (e instanceof Error) {} else throw e;
			messages.push({ role: 'user', content: `Please revise your answer upon the feedback: ${e.message}` });
		}
	}
}
