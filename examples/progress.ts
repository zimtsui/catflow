import { Draft, Finalized, Controlflow } from '@zimtsui/catflow';

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
