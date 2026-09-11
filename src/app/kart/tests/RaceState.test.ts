import RaceState, {RacePhase} from "~/app/kart/RaceState";
import KartController from "~/app/kart/KartController";

jest.mock('~/app/Config', () => ({__esModule: true, default: {TileSize: 611.4962158203125, StartPosition: {lat: 35.6595, lon: 139.7005}}}));

describe('RaceState', () => {
	test('formats times Mario Kart style', () => {
		expect(RaceState.formatTime(0)).toBe(`0'00"00`);
		expect(RaceState.formatTime(62340)).toBe(`1'02"34`);
		expect(RaceState.formatTime(599999)).toBe(`9'59"99`);
	});

	test('counts down 3, 2, 1 then go', () => {
		const race = new RaceState(3);
		race.reset(1000);
		expect(race.getCountdownValue(1000)).toBe(3);
		expect(race.getCountdownValue(1999)).toBe(3);
		expect(race.getCountdownValue(2000)).toBe(2);
		expect(race.getCountdownValue(3000)).toBe(1);
		expect(race.getCountdownValue(4000)).toBe(0);
		expect(race.getCountdownProgress(2500)).toBeCloseTo(0.5);
	});

	test('records splits in order and finishes after the last star', () => {
		const race = new RaceState(3);
		race.reset(0);
		race.start(1000);
		expect(race.getElapsed(1500)).toBe(500);
		expect(race.recordSplit(2000)).toBe(1000);
		expect(race.nextStarIndex).toBe(1);
		expect(race.isComplete).toBe(false);
		race.recordSplit(3000);
		race.recordSplit(4000);
		expect(race.isComplete).toBe(true);
		expect(race.finish(4000)).toBe(true);
		expect(race.phase).toBe(RacePhase.Finished);
		expect(race.getElapsed(9999)).toBe(3000);
		expect(race.bestTime).toBe(3000);

		// A slower second run is not a new best; a faster one is.
		race.reset(10000);
		race.start(10000);
		expect(race.finish(14000)).toBe(false);
		race.reset(20000);
		race.start(20000);
		expect(race.finish(22000)).toBe(true);
		expect(race.bestTime).toBe(2000);
	});
});

describe('KartController start line', () => {
	test('does not move while locked, moves once released', () => {
		const kart = new KartController();
		const startX = kart.position.x;
		kart.throttle = 1;
		for (let i = 0; i < 60; i++) {
			kart.update(1 / 60, 0);
		}
		expect(kart.position.x).toBe(startX);
		expect(kart.speed).toBe(0);

		kart.locked = false;
		for (let i = 0; i < 60; i++) {
			kart.update(1 / 60, 0);
		}
		expect(kart.position.x).toBeGreaterThan(startX + 1);
	});

	test('jump-start penalty holds the throttle briefly', () => {
		const kart = new KartController();
		kart.locked = false;
		kart.throttle = 1;
		kart.applyThrottlePenalty(0.5);
		for (let i = 0; i < 24; i++) {
			kart.update(1 / 60, 0);
		}
		expect(kart.speed).toBe(0);
		for (let i = 0; i < 30; i++) {
			kart.update(1 / 60, 0);
		}
		expect(kart.speed).toBeGreaterThan(0);
	});

	test('rocket start boost raises speed above normal max', () => {
		const kart = new KartController();
		kart.locked = false;
		kart.throttle = 1;
		kart.applyBoost();
		kart.update(1 / 60, 0);
		expect(kart.speed).toBeGreaterThan(kart.maxSpeed);
		expect(kart.isBoosting).toBe(true);
	});
});
