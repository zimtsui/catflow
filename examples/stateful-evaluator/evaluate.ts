import { Draft } from '@zimtsui/amenda';
import OpenAI from 'openai';
declare const openai: OpenAI;

export async function *evaluate(problem: string, draft: Draft<string>): Draft<string> {
	let answer = await draft.next().then(r => r.value);
	const messages: OpenAI.ChatCompletionMessageParam[] = [
		{
			role: 'system',
			content: [
				'Please examine the given answer of the given math problem.',
				'Print `ACCEPT` if it is correct.',
			].join(' '),
		},
		{ role: 'user', content: `Problem: ${problem}\n\nAnswer: ${answer}` },
	];
	for (;;) try {
		const completion = await openai.chat.completions.create({ model: 'gpt-4o', messages });
		messages.push(completion.choices[0]!.message);
		if (completion.choices[0]!.message.content === 'ACCEPT') return yield answer;
		else throw new Error(completion.choices[0]!.message.content!);
	} catch (e) {
		answer = await draft.throw(e as Error).then(r => r.value);
		messages.push({
			role: 'user',
			content: `The answer is revised: ${answer}\n\nPlease examine it again.`,
		});
	}
}
