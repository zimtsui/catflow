import { Controlflow, type Draft } from '@zimtsui/amenda';

declare const translateChineseToEnglish: (chineseText: string) => Draft<string>;
declare const translateEnglishToRussian: (englishText: string) => Draft<string>;
declare const translateRussianToChinese: (russianText: string) => Draft<string>;

const cf = Controlflow.from('1+1 等于几？')
	.then((chinese: string) => {
		let cf = Controlflow.from(chinese);
		for (let i = 1; i <= 3; i++) cf = cf
			.then(translateChineseToEnglish)
			.then(translateEnglishToRussian)
			.then(translateRussianToChinese);
		return cf.draft;
	});
export default await cf.first();
