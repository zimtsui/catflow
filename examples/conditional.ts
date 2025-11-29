import { Controlflow, type Draft } from '@zimtsui/catflow';

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
