import { Draft } from './draft.ts';


export class Controlflow<o = void> {
	private constructor(public draft: Draft<o>) {}

	public static of<o>(draft: Draft<o>) {
		return new Controlflow(draft);
	}

	public static from<o>(o: o): Controlflow<o> {
		return Controlflow.of(Draft.eta(o));
	}

	public static create(): Controlflow<void> {
		return (Controlflow.from<void>)();
	}

	public first(): Promise<Awaited<o>> {
		return Draft.to(this.draft);
	}

	public pipe<nexto>(f: (draft: Draft<o>) => Draft<nexto>): Controlflow<nexto> {
		return new Controlflow(f(this.draft));
	}

	public then<nexto>(f: (o: o) => Draft<nexto>): Controlflow<nexto> {
		return new Controlflow(Draft.mu(Draft.map(f)(this.draft)));
	}

	/**
	 * @param f is allowed to throw synchronously.
	 */
	public transform<nexto>(f: (o: o) => PromiseLike<nexto>): Controlflow<nexto> {
		const af = async (o: o) => f(o);
		return this.then(o => Draft.from(af(o)));
	}

	public map<nexto>(f: (o: o) => nexto): Controlflow<nexto> {
		return this.pipe(Draft.map(f));
	}

	public through(f: (o: o) => void): Controlflow<o> {
		const af = async (o: o) => f(o);
		return this.transform(o => af(o).then(() => o));
	}
}
