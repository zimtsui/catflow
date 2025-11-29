import { Draft } from '@zimtsui/catflow';
import OpenAI from 'openai';
declare const openai: OpenAI;

export async function *evaluate(problem: string, draft: Draft<string | Error>): Draft<string | Error> {
	let input = await draft.next().then(r => r.value);
	let answer = input as string;
	const messages: OpenAI.ChatCompletionMessageParam[] = [
		{ role: 'system', content: 'Please examine the given answer of the given math problem. Print only `ACCEPT` if it is correct.' },
		{ role: 'user', content: `Problem: ${problem}\n\nAnswer: ${answer}` },
	];
	for (let evaluating = true;; evaluating = true) try {
		const completion = await openai.chat.completions.create({ model: 'gpt-4o', messages });
		messages.push(completion.choices[0]!.message);
		if (completion.choices[0]!.message.content === 'ACCEPT') return yield (evaluating = false, answer);
		else throw new Error(completion.choices[0]!.message.content!);
	} catch (e) {
		for (;;) {
			input = await draft.throw(e as Error).then(r => r.value);
			if (input instanceof Error && !evaluating) {} else break;
			try { return yield input; } catch (newe) { e = newe; }
		}
		if (input instanceof Error) messages.push({
			role: 'user',
			content: `Your rejection is opposed: ${input.message}\n\nPlease examine it again.`,
		}); else messages.push({
			role: 'user',
			content: `The answer is revised: ${answer = input}\n\nPlease examine it again.`,
		});
	}
}
