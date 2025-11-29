import { optimize } from './optimize.ts';
import { evaluate as evaluate1 } from './evaluate.ts';
import { Controlflow, Draft } from '@zimtsui/catflow';
declare const evaluate2: typeof evaluate1;
declare const evaluate3: typeof evaluate1;

export const workflow = (problem: string) => Controlflow.from(problem)
    .then(optimize)
    .pipe(draft => evaluate1(problem, draft))
    .pipe(draft => evaluate2(problem, draft))
    .pipe(draft => evaluate3(problem, draft))
.draft satisfies Draft<string | Error>;
