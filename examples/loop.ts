import { Controlflow, type Draft } from '@zimtsui/amenda';

declare const translateEnglishToRussian: (englishText: string) => Draft<string>;
declare const translateRussianToChinese: (russianText: string) => Draft<string>;
declare const translateChineseToEnglish: (chineseText: string) => Draft<string>;

const cf = Controlflow.from('What does 1+1 equal to ?')
	.then((mathProblemInEnglish: string) => {
		let cf = Controlflow.from(mathProblemInEnglish);
		for (let i = 1; i <= 3; i++) cf = cf
			.then(translateEnglishToRussian)
			.then(translateRussianToChinese)
			.then(translateChineseToEnglish)
		;
		return cf.draft;
	});
export default await cf.first();
