import { Controlflow, Draft } from '@zimtsui/catflow';
declare function translateEnglishToChinese(englishText: string): Draft<string>;

const cf = Controlflow.from('What does 1+1 equal to ?')
	.map((text: string) => text.trimStart())	// append a sync function
	.transform(async (text: string) => text.trimEnd())	// append an async function
	.then(translateEnglishToChinese)	// append an async generator function
;
export default await cf.first();
