import { Draft } from '@zimtsui/catflow';
import OpenAI from 'openai';
declare const openai: OpenAI;

export async function *solve(problem: string): Draft<string | Error> {
	const messages: OpenAI.ChatCompletionMessageParam[] = [
		{ role: 'system', content: 'Please solve math problems.' },
		{ role: 'user', content: problem },
	];
	const completion = await openai.chat.completions.create({ model: 'gpt-4o', messages });
	try {
		return yield completion.choices[0]!.message.content!;
	} catch (e) {
		return yield new Error('My solution is correct, and your feedback is wrong.');
	}
}
