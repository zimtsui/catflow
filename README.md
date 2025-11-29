# Amenda

[![Npm package version](https://img.shields.io/npm/v/@zimtsui/amenda?style=flat-square)](https://www.npmjs.com/package/@zimtsui/amenda)

Almost all workflow orchestrators are based on Graph Theory, e.g. LangChain, LangGraph, Airflow, etc. While Amenda is one based on Category Theory, and is powered by the most native capabilities of TypeScript.

- [Rationale](#rationale)
- [Concept](#concept)
	- [Workflow Node](#workflow-node)
	- [Controlflow](#controlflow)
- [Basic Orchestrations](#basic-orchestrations)
	- [Conditional](#conditional)
	- [Loop](#loop)
	- [Parallel](#parallel)
- [Advanced Orchestrations](#advanced-orchestrations)
	- [Design Pattern of *Optimizer - Evaluator*](#design-pattern-of-optimizer---evaluator)
	- [Design Pattern of *Optimizer - Stateful Evaluator*](#design-pattern-of-optimizer---stateful-evaluator)
	- [Design Pattern of *Optimizer - Opposable Evaluator*](#design-pattern-of-optimizer---opposable-evaluator)
	- [Design Pattern of *Optimizer - Multiple Evaluators*](#design-pattern-of-optimizer---multiple-evaluators)
	- [Design Pattern of *Optimizer - Multiple Stateful Evaluators*](#design-pattern-of-optimizer---multiple-stateful-evaluators)
	- [Design Pattern of *Optimizer - Multiple Opposable Evaluators*](#design-pattern-of-optimizer---multiple-opposable-evaluators)
	- [Progress Log](#progress-log)
- [Explanation of Amenda in Mathematics](#explanation-of-amenda-in-mathematics)
	- [Functor of Draft 草稿函子](#functor-of-draft-草稿函子)
	- [Natural Transformations of Draft Functor 草稿函子的自然变换](#natural-transformations-of-draft-functor-草稿函子的自然变换)
	- [Morphisms of Draft Category 草稿范畴的态射](#morphisms-of-draft-category-草稿范畴的态射)
	- [Kleisli Category of Draft Monad 草稿单子的 Kleisli 范畴](#kleisli-category-of-draft-monad-草稿单子的-kleisli-范畴)

## Rationale

Traditional workflows have almost all capabilities that AI workflows have, e.g. pipeline, parallelism, conditional, retry, etc. Popular AI workflow frameworks, e.g. LangChain, unify the APIs of various model suppliers. But in terms of orchestration, they are no different from the traditional ones.

So what is the essential difference between AI workflows and traditional workflows in terms of orchestration? The answer is about the mechanism of retry. In traditional workflows, if a node fails, or if the output of the node is rejected by the downstream, the node should typically retry by repeating the exact same operation with the same success rate as the last attempt. While in AI workflows, when a stateful AI node should retry, it revises its former output with a much higher success rate than the last attempt.

## Concept

### Workflow Node

The output of a node can be represented as an async generator which yields the result value to the downstream.

```ts
export type Draft<value> = AsyncGenerator<value, never, never>;
```

If the downstream accepts the yielded result, `.throw` of the generator will be called with a `Finalized` exception.

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

If the downstream rejects the yielded result, the `.throw` of the generator should be called with an exception as feedback. In this case, the node should revise its output and yield a new version.

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

A node can reject the input by throwing an exception to the upstream.

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

A node can also yield an exception to the downstream, for example, to oppose the feedback.

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

A `Controlflow` is a wrapper of nodes. It's intended to compose nodes within a workflow into a larger node.

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

## Basic Orchestrations

### Conditional

```ts
import { Controlflow, type Draft } from '@zimtsui/amenda';

declare const determineLanguage: (text: string) => Promise<'Chinese' | 'Russian' | 'English'>;
declare const translateEnglishToChinese: (englishText: string) => Draft<string>;
declare const translateRussianToChinese: (russianText: string) => Draft<string>;
declare const solveEnglishMathProblem: (englishMathProblem: string) => Draft<string>;

const cf = Controlflow.from('What does 1+1 equal to ?')
	.then(async function *(mathProblem: string): Draft<string> {
		switch (await determineLanguage(mathProblem)) {
			case 'English': return yield *translateEnglishToChinese(mathProblem);
			case 'Russian': return yield *translateRussianToChinese(mathProblem);
			case 'Chinese': return yield mathProblem;
			default: throw new Error('Language Not Supported');
		}
	}).then(solveEnglishMathProblem)
;
export default await cf.first();
```

### Loop

```ts
import { Controlflow, type Draft } from '@zimtsui/amenda';

declare const translateEnglishToRussian: (englishText: string) => Draft<string>;
declare const translateRussianToChinese: (russianText: string) => Draft<string>;
declare const translateChineseToEnglish: (chineseText: string) => Draft<string>;

const cf = Controlflow.from('What does 1+1 equal to ?')
	.then((mathProblemInEnglish: string) => {
		let cf = Controlflow.from(mathProblemInEnglish);
		for (let i = 1; i <= 3; i++) cf = cf
			.then(translateEnglishToRussian)
			.then(translateRussianToChinese)
			.then(translateChineseToEnglish)
		;
		return cf.draft;
	});
export default await cf.first();
```

### Parallel

```ts
import { Controlflow, type Draft } from '@zimtsui/amenda';

declare const translateEnglishToChinese: (englishText: string) => Draft<string>;
declare const translateEnglishToRussian: (englishText: string) => Draft<string>;

const cf = Controlflow.from('What does 1+1 equal to ?')
	.transform(async (mathProblemInEnglish: string) => {
		const [mathProblemInChinese, mathProblemInRussian] = await Promise.all([
			Controlflow.from(mathProblemInEnglish).then(translateEnglishToChinese).first(),
			Controlflow.from(mathProblemInEnglish).then(translateEnglishToRussian).first(),
		]);
		return [
			`# English: ${mathProblemInEnglish}`,
			`# Chinese: ${mathProblemInChinese}`,
			`# Russian: ${mathProblemInRussian}`,
		].join('\n\n');
	});
export default await cf.first();
```

## Advanced Orchestrations

### [Design Pattern of *Optimizer - Evaluator*](https://www.anthropic.com/engineering/building-effective-agents)

#### Optimizer

```ts
import { Draft } from '@zimtsui/amenda';
import OpenAI from 'openai';
declare const openai: OpenAI;

export async function *optimize(problem: string): Draft<string> {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
        {
            role: 'system',
            content: [
                'Please solve math problems.',
                'Your answer will be evaluated and the feedback will be provided if the answer is rejected.'
            ].join(' ')
        },
        { role: 'user', content: problem },
    ];
    for (;;) try {
        const completion = await openai.chat.completions.create({ model: 'gpt-4o', messages });
        messages.push(completion.choices[0]!.message);
        return yield completion.choices[0]!.message.content!;
    } catch (e) {
        if (e instanceof Error) {} else throw e;
        messages.push({
            role: 'user',
            content: `Your answer is rejected: ${e.message}. Please revise your answer.`,
        });
    }
}
```

#### Evaluator

```ts
import { Draft } from '@zimtsui/amenda';
import OpenAI from 'openai';
declare const openai: OpenAI;

export async function *evaluate(problem: string, answer: string): Draft<string> {
	const messages: OpenAI.ChatCompletionMessageParam[] = [
		{
			role: 'system',
			content: [
				'Please examine the given answer of the given math problem.',
				'Print only `ACCEPT` if it is correct.',
			].join(' '),
		},
		{ role: 'user', content: `Problem: ${problem}\n\nAnswer: ${answer}` },
	];
	const completion = await openai.chat.completions.create({ model: 'gpt-4o', messages });
	messages.push(completion.choices[0]!.message);
	if (completion.choices[0]!.message.content === 'ACCEPT') return yield answer;
	else throw new Error(completion.choices[0]!.message.content!);
}
```

#### Workflow

```ts
import { optimize } from './optimize.ts';
import { evaluate } from './evaluate.ts';
import { Controlflow, Draft } from '@zimtsui/amenda';

export const workflow = (problem: string) => Controlflow.from(problem)
    .then(optimize)
    .then(answer => evaluate(problem, answer))
.draft satisfies Draft<string>;
```

### Design Pattern of *Optimizer - Stateful Evaluator*

#### Evaluator

```ts
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
```

#### Workflow

```ts
import { optimize } from './optimize.ts';
import { evaluate } from './evaluate.ts';
import { Controlflow, Draft } from '@zimtsui/amenda';

export const workflow = (problem: string) => Controlflow.from(problem)
    .then(optimize)
    .pipe(draft => evaluate(problem, draft))
.draft satisfies Draft<string>;
```

### Design Pattern of *Optimizer - Opposable Evaluator*

#### Optimizer

```ts
import { Draft } from '@zimtsui/amenda';
import OpenAI from 'openai';
declare const openai: OpenAI;

export async function *optimize(problem: string): Draft<string | Error> {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
        {
            role: 'system',
            content: [
                'Please solve math problems.',
                'Your answer will be evaluated and the feedback will be provided if the answer is rejected.',
                'If you insist your answer, print only `OPPOSE` to oppose the rejection, or revise your answer.',
            ].join(' '),
        },
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
```

#### Evaluator

```ts
import { Draft } from '@zimtsui/amenda';
import OpenAI from 'openai';
declare const openai: OpenAI;

export async function *evaluate(problem: string, draft: Draft<string | Error>): Draft<string | Error> {
	let input = await draft.next().then(r => r.value);
	let answer = input as string;
	const messages: OpenAI.ChatCompletionMessageParam[] = [
		{
			role: 'system',
			content: [
				'Please examine the given answer of the given math problem.',
				'Print only `ACCEPT` if it is correct.',
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
		input = await draft.throw(e as Error).then(r => r.value);
		if (input instanceof Error) messages.push({
			role: 'user',
			content: `Your rejection is opposed: ${input.message}\n\nPlease examine it again.`,
		}); else messages.push({
			role: 'user',
			content: `The answer is revised: ${answer = input}\n\nPlease examine it again.`,
		});
	}
}
```

#### Workflow

```ts
import { optimize } from './optimize.ts';
import { evaluate } from './evaluate.ts';
import { Controlflow, Draft } from '@zimtsui/amenda';

export const workflow = (problem: string) => Controlflow.from(problem)
    .then(optimize)
    .pipe(draft => evaluate(problem, draft))
.draft satisfies Draft<string | Error>;
```

### Design Pattern of *Optimizer - Multiple Evaluators*

#### Workflow

```ts
import { optimize } from './optimize.ts';
import { evaluate as evaluate1 } from './evaluate.ts';
import { Controlflow, Draft } from '@zimtsui/amenda';
declare const evaluate2: typeof evaluate1;
declare const evaluate3: typeof evaluate1;

export const workflow = (problem: string) => Controlflow.from(problem)
    .then(optimize)
    .then(draft => evaluate1(problem, draft))
    .then(draft => evaluate2(problem, draft))
    .then(draft => evaluate3(problem, draft))
.draft satisfies Draft<string>;
```

### Design Pattern of *Optimizer - Multiple Stateful Evaluators*

#### Workflow

```ts
import { optimize } from '../multiple-evaluators/optimize.ts';
import { evaluate as evaluate1 } from './evaluate.ts';
import { Controlflow, Draft } from '@zimtsui/amenda';
declare const evaluate2: typeof evaluate1;
declare const evaluate3: typeof evaluate1;

export const workflow = (problem: string) => Controlflow.from(problem)
    .then(optimize)
    .pipe(draft => evaluate1(problem, draft))
    .pipe(draft => evaluate2(problem, draft))
    .pipe(draft => evaluate3(problem, draft))
.draft satisfies Draft<string>;
```

### Design Pattern of *Optimizer - Multiple Opposable Evaluators*

#### Evaluator

```ts
import { Draft } from '@zimtsui/amenda';
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
		for (;;) try {
			input = await draft.throw(e as Error).then(r => r.value);
			if (input instanceof Error && !evaluating) return yield input; else break;
		} catch (newe) { e = newe; }
		if (input instanceof Error) messages.push({
			role: 'user',
			content: `Your rejection is opposed: ${input.message}\n\nPlease examine it again.`,
		}); else messages.push({
			role: 'user',
			content: `The answer is revised: ${answer = input}\n\nPlease examine it again.`,
		});
	}
}
```

#### Workflow

```ts
import { optimize } from './optimize.ts';
import { evaluate as evaluate1 } from './evaluate.ts';
import { Controlflow, Draft } from '@zimtsui/amenda';
declare const evaluate2: typeof evaluate1;
declare const evaluate3: typeof evaluate1;

export const workflow = (problem: string) => Controlflow.from(problem)
    .then(optimize)
    .pipe(draft => evaluate1(problem, draft))
    .pipe(draft => evaluate2(problem, draft))
    .pipe(draft => evaluate3(problem, draft))
.draft satisfies Draft<string | Error>;
```

### Progress Log

```ts
import { Draft, Finalized, Controlflow } from '@zimtsui/amenda';

function beginning(nextStage: string) {
	return async function *<input>(input: input): Draft<input> {
		if (nextStage) console.log(nextStage);
		return yield input;
	}
}
function ending(lastStage: string) {
	return async function *<input>(input: input): Draft<input> {
		try {
			return yield input;
		} catch (e) {
			if (e instanceof Finalized) {}
			else if (lastStage) console.log(lastStage);
			throw e;
		}
	}
}
declare const optimize: (problem: string) => Draft<string>;
declare const evaluate1: (problem: string, draft: Draft<string>) => Draft<string>;
declare const evaluate2: (problem: string, draft: Draft<string>) => Draft<string>;
declare const evaluate3: (problem: string, draft: Draft<string>) => Draft<string>;

export const workflow = (problem: string) => Controlflow.from(problem)

    .then(beginning('Optimization'))
    .then(optimize)
    .then(beginning('Optimization'))

    .then(beginning('Evaluation 1'))
    .pipe(draft => evaluate1(problem, draft))
    .then(ending('Evaluation 1'))

    .then(beginning('Evaluation 2'))
    .pipe(draft => evaluate2(problem, draft))
    .then(ending('Evaluation 2'))

    .then(beginning('Evaluation 3'))
    .pipe(draft => evaluate3(problem, draft))
    .then(ending('Evaluation 3'))

.draft satisfies Draft<string>;
```

## Explanation of Amenda in Mathematics

### Functor of Draft 草稿函子

In analogy to `Promise<t>`, which is a type of future values, `Draft<t>` is a type of draft values, because it can be rejected and sent back to the author for revision.

`Promise<t>` 是期值类型，类比地，`Draft<t>` 是草稿类型，因为草稿可以打回去给作者进行修改。

In analogy to the functor `Promise`, which maps from the category of present value types to the category of future value types, the functor `Draft` maps from the category of final value types to the category of draft value types.

`Promise` 函子从现值范畴映射到期值范畴，类比地，`Draft` 函子从终稿范畴映射到草稿范畴。

```ts
export type Draft<t> = AsyncGenerator<t, never, never>;
```

### Natural Transformations of Draft Functor 草稿函子的自然变换

-	`eta` is a natural transformation from the identity functor to the functor `Draft`.

	`eta` 是从恒等函子到 `Draft` 函子的自然变换。

-	`mu` is a natural transformation from the functor `Draft`$^2$ to the functor `Draft`.

	`mu` 是从 `Draft`$^2$ 函子到 `Draft` 函子的自然变换。

-	`from` is a natural transformation from the functor `Promise` to the functor `Draft`.

	`from` 是从 `Promise` 函子到 `Draft` 函子的自然变换。

-	`to` is a natural transformation from the functor `Draft` to the functor `Promise`.

	`to` 是从 `Draft` 函子到 `Promise` 函子的自然变换。

```ts
export declare function eta<t>(x: t): Draft<t>;
export declare function mu<t>(x: Draft<Draft<t>>): Draft<t>;
export declare function from<t>(x: Promise<t>): Draft<t>;
export declare function to<t>(x: Draft<t>): Promise<t>;
```

### Morphisms of Draft Category 草稿范畴的态射

An evaluator in the design pattern of Optimizer Evaluator is a morphism of the draft category.

优化评估设计模式中的评估器是草稿范畴的态射。

```ts
export type Evaluator<i, o> = (optimization: Draft<i>) => Draft<o>;
```

### Kleisli Category of Draft Monad 草稿单子的 Kleisli 范畴

An async generator function which returns a `Draft` is a morphism of the Kleisli category of draft monad.

一个返回 `Draft` 的异步生成器函数是一个草稿单子的 Kleisli 范畴中的态射。

```ts
export type Kleisli<i, o> = (i: i) => Draft<o>;
```
