# Development

## Profunctor

为什么不设计成如下的逆协变函子？

```ts
export type Draft<feedback, final> = AsyncGenerator<final, never, feedback>;
```

这是因为 `Draft feedback` 函子的 Kleisli 态射中无法向上传导反馈。

```ts
export type Kleisli<feedback, i, o> = (i: i) => Draft<feedback, o>;
```
