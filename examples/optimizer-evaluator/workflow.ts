import { optimize } from './optimize.ts';
import { evaluate } from './evaluate.ts';
import { Controlflow, Draft } from '@zimtsui/catflow';

export const workflow = (problem: string) => Controlflow.from(problem)
    .then(optimize)
    .then(answer => evaluate(problem, answer))
.draft satisfies Draft<string>;
