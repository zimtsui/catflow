import { Draft } from '@zimtsui/amenda';
import OpenAI from 'openai';
declare const openai: OpenAI;

export async function *evaluate(problem: string, answer: string): Draft<string> {
	const messages: OpenAI.ChatCompletionMessageParam[] = [
		{ role: 'system', content: 'Please examine the given answer of the given math problem. Print `ACCEPT` if it is correct.' },
		{ role: 'user', content: `Problem: ${problem}\n\nAnswer: ${answer}` },
	];
	const completion = await openai.chat.completions.create({ model: 'gpt-4o', messages });
	messages.push(completion.choices[0]!.message);
	if (completion.choices[0]!.message.content === 'ACCEPT') return yield answer;
	else throw new Error(completion.choices[0]!.message.content!);
}
