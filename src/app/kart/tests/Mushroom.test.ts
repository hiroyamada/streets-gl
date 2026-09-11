import RaceState, {RacePhase, MaxMushrooms} from "~/app/kart/RaceState";
import KartController from "~/app/kart/KartController";

jest.mock('~/app/Config', () => ({__esModule: true, default: {TileSize: 611.4962158203125, StartPosition: {lat: 35.6595, lon: 139.7005}}}));

describe('RaceState mushrooms', () => {
	test('starts with the full mushroom count', () => {
		const race = new RaceState(3);
		expect(race.mushrooms).toBe(MaxMushrooms);
	});

	test('reset restores the full mushroom count', () => {
		const race = new RaceState(3);
		race.reset(0);
		race.beginCountdown(0);
		race.start(100);
		race.useMushroom();
		expect(race.mushrooms).toBe(MaxMushrooms - 1);
		race.reset(200);
		expect(race.mushrooms).toBe(MaxMushrooms);
	});

	test('useMushroom fails outside of Racing', () => {
		const race = new RaceState(3);
		race.reset(0);
		expect(race.phase).toBe(RacePhase.Title);
		expect(race.useMushroom()).toBe(false);

		race.beginCountdown(0);
		expect(race.phase).toBe(RacePhase.Countdown);
		expect(race.useMushroom()).toBe(false);
		expect(race.mushrooms).toBe(MaxMushrooms);
	});

	test('useMushroom succeeds MaxMushrooms times during Racing, then fails', () => {
		const race = new RaceState(3);
		race.reset(0);
		race.beginCountdown(0);
		race.start(100);

		for (let i = 0; i < MaxMushrooms; i++) {
			expect(race.useMushroom()).toBe(true);
		}

		expect(race.mushrooms).toBe(0);
		expect(race.useMushroom()).toBe(false);
		expect(race.mushrooms).toBe(0);
	});
});

describe('KartController mushroom boost', () => {
	test('raises speed above normal max and decays back afterward', () => {
		const kart = new KartController();
		kart.locked = false;

		kart.applyMushroomBoost();
		kart.update(1 / 60, 0);

		expect(kart.speed).toBeGreaterThan(kart.maxSpeed);
		expect(kart.isBoosting).toBe(true);

		for (let i = 0; i < 300; i++) {
			kart.update(1 / 60, 0);
		}

		expect(kart.isBoosting).toBe(false);
		expect(kart.speed).toBeLessThanOrEqual(kart.maxSpeed + 1e-6);
	});

	test('is a stronger boost than the drift boost', () => {
		const driftKart = new KartController();
		driftKart.locked = false;
		driftKart.throttle = 1;
		driftKart.applyBoost();
		driftKart.update(1 / 60, 0);

		const mushroomKart = new KartController();
		mushroomKart.locked = false;
		mushroomKart.throttle = 1;
		mushroomKart.applyMushroomBoost();
		mushroomKart.update(1 / 60, 0);

		expect(mushroomKart.speed).toBeGreaterThan(driftKart.speed);
	});

	test('does not set boostStarted (avoids double-playing the drift boost sound)', () => {
		const kart = new KartController();
		kart.locked = false;
		kart.boostStarted = true;
		kart.applyMushroomBoost();
		expect(kart.boostStarted).toBe(false);
	});
});
