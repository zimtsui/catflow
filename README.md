# Amenda

[![Npm package version](https://img.shields.io/npm/v/@zimtsui/amenda?style=flat-square)](https://www.npmjs.com/package/@zimtsui/amenda)

Amenda is an AI workflow orchestrator powered by the most native capabilities of TypeScript.

**You may have to be very familiar with TypeScript type system to read this document.**

## Rationale

Traditional workflows have almost every capability that AI workflows have, e.g. pipeline, parallelism, conditional, retry, etc. Popular AI workflow frameworks, e.g. LangChain, unify the APIs of various model suppliers. But in terms of orchestration, they are no different from the traditional ones.

So what is the key difference between AI workflows and traditional workflows in terms of orchestration? Is there anything that traditional orchestrators cannot do in AI workflows?

The answer is about the mechanism of retry. In traditional workflows, if a node fails, or if the output of the node is rejected by the downstream, the node should typically retry by repeating the exact same operation with the same accuracy as the last attempt. While in AI workflows, when a stateful AI node should retry, it revises its former output with a much higher accuracy than the last attempt.

## Concept

### Workflow

The output of a workflow can be represented as an async generator which yields the result value to the downstream.

```ts
export type Draft<value> = AsyncGenerator<value, never, never>;
```

If the downstream accepts the yielded result, `.throw` of the generator will be called with a `Finalized` error.

```ts
import { Draft } from '@zimtsui/amenda';
import OpenAI from 'openai';
declare const openai: OpenAI;

export async function *solve(problem: string): Draft<string> {
	const messages: OpenAI.ChatCompletionMessageParam[] = [
		{ role: 'system', content: 'Please solve math problems.' },
		{ role: 'user', content: problem },
	];
	const completion = await openai.chat.completions.create({ model: 'gpt-4o', messages });
	// The `yield` will never return if the downstream accepts the yielded result.
	return yield completion.choices[0]!.message.content!;
}
```

If the downstream rejects the yielded result, the `.throw` of the generator should be called with an exception as feedback. In this case, the workflow should revise its output and yield a new version.

```ts
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
```

A workflow can reject the input by throwing an exception to the upstream.

```ts
import { Draft } from '@zimtsui/amenda';
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
```

A workflow can also yield an exception to the downstream, for example, to oppose the feedback.

```ts
import { Draft } from '@zimtsui/amenda';
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
```

### Controlflow

A `Controlflow` is a wrapper of an async generator. It's intended to compose workflows.

```ts
import { Controlflow, Draft } from '@zimtsui/amenda';
declare function translateEnglishToChinese(englishText: string): Draft<string>;

const cf = Controlflow.from('What does 1+1 equal to ?')
	.map((text: string) => text.trimStart())	// append a sync function
	.transform(async (text: string) => text.trimEnd())	// append an async function
	.then(translateEnglishToChinese)	// append an async generator function
;
export default await cf.first();
```

## Best Practices

### Conditional Workflow

```ts
import { Controlflow, type Draft } from '@zimtsui/amenda';

declare const determineLanguage: (text: string) => Promise<'Chinese' | 'Russian' | 'English'>;
declare const translateChineseToEnglish: (chineseText: string) => Draft<string>;
declare const translateRussianToEnglish: (russianText: string) => Draft<string>;
declare const solveEnglishMathProblem: (englishMathProblem: string) => Draft<string>;

const cf = Controlflow.from('1+1 等于几？')
	.then(async function *(mathProblem: string): Draft<string> {
		switch (await determineLanguage(mathProblem)) {
			case 'Chinese': return yield *translateChineseToEnglish(mathProblem); break;
			case 'Russian': return yield *translateRussianToEnglish(mathProblem); break;
			case 'English': return yield mathProblem; break;
			default: throw new Error('Language Not Supported'); break;
		}
	}).then(solveEnglishMathProblem)
;
export default await cf.first();
```

### [Design Pattern of Optimizer Evaluator](https://www.anthropic.com/engineering/building-effective-agents)

```ts
import { Controlflow, type Draft } from '@zimtsui/amenda';

declare function generateCode(): Draft<string>;
declare function syntaxCheck(code: string): void;

async function *evaluate(optimization: Draft<string>): Draft<string> {
	let code = await optimization.next().then(r => r.value);
	for (;;) try {
		syntaxCheck(code);
		return yield code;
	} catch (syntaxError) {
		code = await optimization.throw(syntaxError).then(r => r.value);
	}
}

const cf = Controlflow.create()
	.then(generateCode)
	.pipe(evaluate)	// append an evaluator
;
export default await cf.first();
```

### Parallel

```ts
import { Controlflow, type Draft } from '@zimtsui/amenda';

declare const translateChineseToEnglish: (chineseText: string) => Draft<string>;
declare const translateChineseToRussian: (chineseText: string) => Draft<string>;

const cf = Controlflow.from('1+1 等于几？')
	.transform(async (chinese: string) => {
		const [english, russian] = await Promise.all([
			Controlflow.from(chinese).then(translateChineseToEnglish).first(),
			Controlflow.from(chinese).then(translateChineseToRussian).first(),
		]);
		return `# Chinese: ${chinese}\n\n# English: ${english}\n\n# Russian: ${russian}`;
	});
export default await cf.first();
```

## [Explanation of Amenda in Mathematics](./explanation.md)
