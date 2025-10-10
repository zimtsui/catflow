import { Finalized } from './exceptions.ts';


/**
 * Draft functor
 */
export type Draft<t> = AsyncGenerator<t, never, never>;
export namespace Draft {

	/**
	 * Natural transformation from Identity to Draft
	 */
	export async function *eta<t>(x: t): Draft<t> {
		return yield x;
	}

	/**
	 * Natural transformation from Draft^2 to Draft
	 */
	export async function *mu<t>(draftdraft: Draft<Draft<t>>): Draft<t> {
		for (let draft = await draftdraft.next().then(r => r.value);;) try {
			for (let final = await draft.next().then(r => r.value);;) try {
				return yield final;
			} catch (e) {
				final = await draft.throw(e).then(r => r.value);
			}
		} catch (e) {
			draft = await draftdraft.throw(e).then(r => r.value);
		}
	}

	/**
	 * Map a morphism to Draft Category
	 */
	export function map<i, o>(f: (i: i) => o): (draft: Draft<i>) => Draft<o> {
		return async function *(draft: Draft<i>) {
			for (let final = await draft.next().then(r => r.value);;) try {
				return yield f(final);
			} catch (e) {
				final = await draft.throw(e).then(r => r.value);
			}
		}
	}

	/**
	 * Natural transformation from Promise to Draft
	 */
	export async function *from<t>(promise: Promise<t>): Draft<t> {
		return yield await promise;
	}

	/**
	 * Natural transformation from Draft to Promise
	 */
	export async function to<t>(draft: Draft<t>): Promise<t> {
		return await draft.next()
			.then(r => r.value)
			.finally(() => draft
				.throw(new Finalized())
				.catch(e => e instanceof Finalized ? Promise.resolve() : Promise.reject(e))
			);
	}

}
