# Catflow

[![Npm package version](https://img.shields.io/npm/v/@zimtsui/catflow?style=flat-square)](https://www.npmjs.com/package/@zimtsui/catflow)

Almost all workflow orchestrators are based on Graph Theory, e.g. LangChain, LangGraph, Airflow, etc. While Catflow is one based on Category Theory, and is powered by the most native capabilities of TypeScript.

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

[示例](./examples/yield.ts)

If the downstream rejects the yielded result, the `.throw` of the generator should be called with an exception as feedback. In this case, the node should revise its output and yield a new version.

[示例](./examples/feedback.ts)

A node can reject the input by throwing an exception to the upstream.

[示例](./examples/reject.ts)

### Controlflow

A `Controlflow` is a wrapper of nodes. It's intended to compose nodes within a workflow into a larger node.

[示例](./examples/controlflow.ts)

## Basic Orchestrations

### Conditional

[示例](./examples/conditional.ts)

### Loop

[示例](./examples/loop.ts)

### Parallel

[示例](./examples/parallel.ts)

## Advanced Orchestrations

### [Design Pattern of *Optimizer - Evaluator*](https://www.anthropic.com/engineering/building-effective-agents)

#### [Optimizer](./examples/optimizer-evaluator/optimize.ts)

#### [Evaluator](./examples/optimizer-evaluator/evaluate.ts)

#### [Workflow](./examples/optimizer-evaluator/workflow.ts)

### Design Pattern of *Optimizer - Stateful Evaluator*

#### [Evaluator](./examples/optimizer-stateful-evaluator/evaluate.ts)

#### [Workflow](./examples/optimizer-stateful-evaluator/workflow.ts)

### Design Pattern of *Optimizer - Multiple Evaluators*

#### [Workflow](./examples/optimizer-multiple-evaluators/workflow.ts)

### Design Pattern of *Optimizer - Multiple Stateful Evaluators*

#### [Workflow](./examples/optimizer-multiple-stateful-evaluators/workflow.ts)

### [Progress Log](./examples/progress.ts)

## Explanation of Catflow in Mathematics

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

An stateful evaluator node is a morphism of the draft category.

一个有状态评估器节点是草稿范畴的一个态射。

```ts
export type StatefulEvaluator<i, o> = (draft: Draft<i>) => Draft<o>;
```

### Kleisli Morphism of Draft Monad 草稿单子的 Kleisli 态射

An stateless evaluator node is a morphism of the Kleisli category of draft monad.

一个无状态评估器节点是草稿单子的 Kleisli 范畴中的一个态射。

```ts
export type StatelessEvaluator<i, o> = (i: i) => Draft<o>;
```
