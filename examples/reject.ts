import { Draft } from '@zimtsui/catflow';
import OpenAI from 'openai';
declare const openai: OpenAI;

export async function *solve(problem: string): Draft<string> {
	const messages: OpenAI.ChatCompletionMessageParam[] = [
		{ role: 'system', content: 'Please solve math problems.' },
		{ role: 'user', content: problem },
	];
	const completion = await openai.chat.completions.create({ model: 'gpt-4o', messages });
	if (completion.choices[0]!.message.tool_calls?.[0]?.function.name === 'fail')
		throw new Error('The problem is too hard.');
	return yield completion.choices[0]!.message.content!;
}
