import { type Draft } from '@zimtsui/catflow';
import * as Stage from '@zimtsui/typelog/stage';


export function fork(
    name: string,
    forked: (slave: Stage.Thread) => void,
    joined: (slave: Stage.Thread, e: unknown) => void,
) {
	return async function *<input>(input: input): Draft<input> {
		const master = Stage.getThread();
		const slave = Stage.forkSync(name, slave => forked(slave));
		Stage.sw1tch(slave);
		try {
			return yield input;
		} catch (e) {
			const thread = Stage.getThread();
			if (thread.master === master) {
				Stage.sw1tch(master);
				Stage.joinSync(thread, slave => joined(slave, e));
			}
			throw e;
		}
	}
}

export function join(joined: (slave: Stage.Thread) => void) {
	return async function *<input>(input: input): Draft<input> {
		const slave = Stage.getThread();
		const master = slave.master;
		if (master) {} else throw new Error();
		Stage.sw1tch(master);
		Stage.joinSync(slave, slave => joined(slave));
        return yield input;
	}
}
