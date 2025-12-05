import { optimize } from './optimize.ts';
import { evaluate as evaluate1 } from './evaluate.ts';
import { Controlflow, Draft } from '@zimtsui/catflow';
declare const evaluate2: typeof evaluate1;
declare const evaluate3: typeof evaluate1;

export const workflow = (problem: string) => Controlflow.from(problem)
    .then(optimize)
    .then(answer => evaluate1(problem, answer))
    .then(answer => evaluate2(problem, answer))
    .then(answer => evaluate3(problem, answer))
.draft satisfies Draft<string>;
