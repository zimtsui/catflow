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
