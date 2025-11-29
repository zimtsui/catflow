import { Controlflow, type Draft } from '@zimtsui/catflow';

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
