import { optimize } from './optimize.ts';
import { evaluate } from './evaluate.ts';
import { Controlflow, Draft } from '@zimtsui/amenda';

export const workflow = (problem: string) => Controlflow.from(problem)
    .then(optimize)
    .pipe(draft => evaluate(problem, draft))
.draft satisfies Draft<string>;
