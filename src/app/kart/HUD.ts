import RaceState from "~/app/kart/RaceState";

export const ArrowSize = 88;

const Styles = `
#hud { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 10;
	font-family: 'Russo One', 'Inter', system-ui, sans-serif; color: #fff; font-style: italic;
	text-shadow: -2px -2px 0 #1a1a2e, 2px -2px 0 #1a1a2e, -2px 2px 0 #1a1a2e, 2px 2px 0 #1a1a2e, 0 4px 8px rgba(0,0,0,.6); }
#hud .hud-stars { position: absolute; top: 20px; left: 26px; font-size: 60px; color: #ffd83d; }
#hud .hud-stars.bump { animation: hudBump .35s ease-out; }
#hud .hud-timer { position: absolute; top: 20px; right: 28px; font-size: 60px; letter-spacing: 1px; }
#hud .hud-split { position: absolute; top: 96px; right: 30px; font-size: 32px; color: #7dff9a; opacity: 0; }
#hud .hud-split.show { animation: hudSplit 1.6s ease-out; }
#hud .hud-next { position: absolute; top: 24px; left: 50%; transform: translateX(-50%); font-size: 36px; white-space: nowrap; display: flex; align-items: center; gap: 6px; }
#hud .hud-next span { color: #ffd83d; }
#hud .hud-nav { display: inline-block; font-size: 1.8em; color: #ffd83d; line-height: 1; vertical-align: middle; will-change: transform; }
#hud .hud-arrow { position: absolute; left: 0; top: 0; font-size: ${ArrowSize}px; color: #ffd83d; line-height: 1; will-change: transform; }
#hud .hud-countdown { position: absolute; left: 50%; top: 42%; transform: translate(-50%, -50%); font-size: 160px; color: #ffd83d; opacity: 0; }
#hud .hud-countdown.go { color: #7dff9a; }
#hud .hud-countdown.pop { animation: hudPop .9s ease-out; }
#hud .hud-float { position: absolute; top: 92px; left: 34px; font-size: 44px; color: #ffd83d; animation: hudFloat 1s ease-out forwards; }
#hud .hud-hint { position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); font-size: 18px; font-style: normal; opacity: .85; white-space: nowrap; text-shadow: 0 1px 3px rgba(0,0,0,.9); }
#hud .hud-sound { position: absolute; bottom: 14px; right: 22px; font-size: 18px; font-style: normal; opacity: .8; text-shadow: 0 1px 3px rgba(0,0,0,.9); }
#hud .hud-finish { position: absolute; inset: 0; display: none; align-items: flex-start; justify-content: center; background: rgba(10,10,30,.55); overflow-y: auto; padding: 40px 24px; box-sizing: border-box; }
#hud .hud-finish.show { display: flex; }
#hud .hud-finish .finish-layout { pointer-events: auto; display: flex; flex-wrap: wrap; gap: 40px; align-items: flex-start; justify-content: center; max-width: 1040px; width: 100%; margin: auto; }
#hud .hud-finish .finish-left { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; min-width: 260px; }
#hud .hud-finish .title { font-size: 72px; color: #ffd83d; animation: hudPopIn .9s ease-out; }
#hud .hud-finish .total { font-size: 38px; }
#hud .hud-finish table { font-size: 17px; border-collapse: collapse; margin-top: 4px; }
#hud .hud-finish td { padding: 2px 14px 2px 0; text-align: left; }
#hud .hud-finish td:last-child { text-align: right; padding-right: 0; }
#hud .hud-finish .restart { font-size: 18px; margin-top: 12px; opacity: .9; }
#hud .hud-board { display: flex; flex-direction: column; gap: 14px; width: 100%; max-width: 520px; }
#hud .hud-board-title { font-size: 24px; color: #ffd83d; }
#hud .hud-leaderboard { display: flex; flex-direction: column; gap: 6px; font-style: normal; }
#hud .hud-leaderboard-row { display: flex; align-items: center; gap: 12px; height: 44px; padding: 0 14px; border-radius: 10px;
	background: rgba(20,20,40,.55); border: 1px solid rgba(255,255,255,.18); box-shadow: 0 2px 6px rgba(0,0,0,.35);
	opacity: 0; transform: translateX(40px); animation: hudRowIn .35s ease-out forwards; }
#hud .hud-leaderboard-row.own { background: #ffd83d; border-color: #ffd83d; color: #1a1a2e; text-shadow: none; }
#hud .hud-leaderboard-row .rank { flex: 0 0 auto; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center;
	justify-content: center; font-size: 16px; font-weight: bold; background: rgba(255,255,255,.14); }
#hud .hud-leaderboard-row.own .rank { background: rgba(26,26,46,.16); }
#hud .hud-leaderboard-row .name { flex: 1 1 auto; font-size: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#hud .hud-leaderboard-row .time { flex: 0 0 auto; font-size: 18px; letter-spacing: .5px; }
#hud .hud-leaderboard-divider { font-size: 18px; text-align: center; opacity: .7; padding: 2px 0; }
@keyframes hudRowIn { 0% { opacity: 0; transform: translateX(40px); } 100% { opacity: 1; transform: translateX(0); } }
#hud .hud-score { pointer-events: auto; font-style: normal; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
#hud .hud-score-form { display: flex; gap: 8px; align-items: center; }
#hud .hud-score input { font: inherit; font-style: normal; font-size: 16px; padding: 4px 8px; border-radius: 4px; border: 1px solid #555; background: #1a1a2e; color: #fff; width: 200px; text-shadow: none; }
#hud .hud-score input:disabled { opacity: .6; }
#hud .hud-score button { font: inherit; font-style: normal; font-size: 16px; padding: 4px 14px; border-radius: 4px; border: none; background: #ffd83d; color: #1a1a2e; cursor: pointer; text-shadow: none; }
#hud .hud-score button:disabled { opacity: .6; cursor: default; }
#hud .hud-score-status { font-size: 15px; opacity: .9; }
#hud .hud-score-status.error { color: #ff7d7d; }
@media (min-width: 901px) {
	#hud .hud-finish .finish-layout { flex-wrap: nowrap; justify-content: flex-start; }
}
#hud .hud-title { position: absolute; inset: 0; display: none; align-items: center; justify-content: center; }
#hud .hud-title.show { display: flex; }
#hud .hud-title .panel { background: rgba(8,8,24,.82); border: 1px solid rgba(255,255,255,.14); border-radius: 14px;
	padding: 32px 48px; display: flex; flex-direction: column; align-items: center; max-width: 88vw;
	box-shadow: 0 8px 24px rgba(0,0,0,.5); }
@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
	#hud .hud-title .panel { background: rgba(8,8,24,.6); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
}
#hud .hud-title .group { display: flex; flex-direction: column; align-items: center; gap: 6px; }
#hud .hud-title .group + .group { margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,.14); width: 100%; }
#hud .hud-title .game-title { font-size: clamp(36px, 8vw, 62px); color: #ffd83d; text-align: center; }
#hud .hud-title .tagline { font-size: clamp(12px, 2.4vw, 16px); font-style: normal; opacity: .75; text-align: center; }
#hud .hud-title .course { font-size: clamp(15px, 3vw, 20px); text-align: center; }
#hud .hud-title .kart-line { font-size: 18px; text-align: center; }
#hud .hud-title ol { counter-reset: star-count; list-style: none; font-size: 17px; font-style: normal;
	text-align: left; margin: 0; padding: 0; display: inline-flex; flex-direction: column; gap: 4px; }
#hud .hud-title ol li { counter-increment: star-count; }
#hud .hud-title ol li::before { content: counter(star-count) "."; display: inline-block; min-width: 1.3em; color: #ffd83d; margin-right: 6px; }
#hud .hud-title .prompt { font-size: clamp(19px, 4vw, 26px); color: #ffd83d; animation: hudPulse 1.4s ease-in-out infinite; }
#hud .hud-title .hint2 { font-size: 13px; font-style: normal; opacity: .85; }
@keyframes hudPulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
@media (prefers-reduced-motion: reduce) {
	#hud .hud-title .prompt { animation: none; opacity: .9; }
}
@keyframes hudPop { 0% { transform: translate(-50%, -50%) scale(2.2); opacity: 0; } 18% { transform: translate(-50%, -50%) scale(1); opacity: 1; } 75% { opacity: 1; } 100% { transform: translate(-50%, -50%) scale(.9); opacity: 0; } }
@keyframes hudPopIn { 0% { transform: scale(2.2); opacity: 0; } 18% { transform: scale(1); opacity: 1; } 75% { opacity: 1; } 100% { transform: scale(.9); opacity: 0; } }
@keyframes hudBump { 0% { transform: scale(1); } 40% { transform: scale(1.35); } 100% { transform: scale(1); } }
@keyframes hudSplit { 0% { opacity: 0; transform: translateY(-6px); } 15% { opacity: 1; transform: translateY(0); } 80% { opacity: 1; } 100% { opacity: 0; } }
@keyframes hudFloat { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-73px); } }
`;

export interface TitleScreenOptions {
	courseName: string;
	starNames: string[];
	kartName: string;
}

export default class HUD {
	private static readonly DriveHint: string =
		'WASD / arrows drive · hold Space while turning to drift, release to boost · R restart · C free camera · M engine sound · music in Settings';
	private static readonly FinishHint: string = 'Enter to update name · Esc then Space to race again';
	private readonly root: HTMLDivElement;
	private readonly starsEl: HTMLDivElement;
	private readonly timerEl: HTMLDivElement;
	private readonly splitEl: HTMLDivElement;
	private readonly nextEl: HTMLDivElement;
	private readonly navEl: HTMLDivElement;
	private readonly nextTextEl: HTMLDivElement;
	private readonly arrowEl: HTMLDivElement;
	private readonly countdownEl: HTMLDivElement;
	private readonly soundEl: HTMLDivElement;
	private readonly finishEl: HTMLDivElement;
	private readonly finishTotalEl: HTMLDivElement;
	private readonly finishTableEl: HTMLTableElement;
	private readonly hintEl: HTMLDivElement;
	private readonly scoreEl: HTMLDivElement;
	private readonly scoreFormEl: HTMLDivElement;
	private readonly scoreInputEl: HTMLInputElement;
	private readonly scoreButtonEl: HTMLButtonElement;
	private readonly scoreStatusEl: HTMLDivElement;
	private readonly leaderboardEl: HTMLDivElement;
	private readonly boardTitleEl: HTMLDivElement;
	private readonly titleEl: HTMLDivElement;
	private readonly titleStarsEl: HTMLOListElement;
	private lastStarsText: string = '';
	private lastTimerText: string = '';
	private lastNextText: string = '';
	private lastCountdownText: string = '';
	private arrowVisible: boolean = true;
	private lastNavAngle: number = null;
	private navEnabled: boolean = true;
	private hasNextStar: boolean = false;
	private ownRowNameEl: HTMLDivElement = null;

	public constructor() {
		const style = document.createElement('style');
		style.textContent = Styles;
		document.head.appendChild(style);

		this.root = document.createElement('div');
		this.root.id = 'hud';

		this.starsEl = HUD.element('div', 'hud-stars');
		this.timerEl = HUD.element('div', 'hud-timer');
		this.splitEl = HUD.element('div', 'hud-split');
		this.nextEl = HUD.element('div', 'hud-next');
		this.navEl = HUD.element('div', 'hud-nav');
		this.navEl.textContent = '➤';
		this.nextTextEl = HUD.element('div', 'hud-next-text');
		this.nextEl.append(this.navEl, this.nextTextEl);
		this.arrowEl = HUD.element('div', 'hud-arrow');
		this.arrowEl.textContent = '➤';
		this.countdownEl = HUD.element('div', 'hud-countdown');
		this.soundEl = HUD.element('div', 'hud-sound');

		this.hintEl = HUD.element('div', 'hud-hint');
		this.hintEl.textContent = HUD.DriveHint;

		this.finishEl = HUD.element('div', 'hud-finish');
		const title = HUD.element('div', 'title');
		title.textContent = 'FINISH!';
		this.finishTotalEl = HUD.element('div', 'total');
		this.finishTableEl = document.createElement('table');

		this.scoreFormEl = HUD.element('div', 'hud-score-form');
		this.scoreInputEl = document.createElement('input');
		this.scoreInputEl.type = 'text';
		this.scoreInputEl.maxLength = 20;
		this.scoreInputEl.spellcheck = false;
		this.scoreButtonEl = document.createElement('button');
		this.scoreButtonEl.textContent = 'Submit';
		this.scoreFormEl.append(this.scoreInputEl, this.scoreButtonEl);
		this.scoreStatusEl = HUD.element('div', 'hud-score-status');

		this.scoreEl = HUD.element('div', 'hud-score');
		this.scoreEl.append(this.scoreFormEl, this.scoreStatusEl);

		this.restrictKeysToInput(this.scoreInputEl);

		this.boardTitleEl = HUD.element('div', 'hud-board-title');
		this.boardTitleEl.textContent = 'LEADERBOARD';
		this.leaderboardEl = HUD.element('div', 'hud-leaderboard');

		const board = HUD.element('div', 'hud-board');
		board.append(this.boardTitleEl, this.leaderboardEl, this.scoreEl);

		const finishLeft = HUD.element('div', 'finish-left');
		finishLeft.append(title, this.finishTotalEl, this.finishTableEl);

		const finishLayout = HUD.element('div', 'finish-layout');
		finishLayout.append(finishLeft, board);

		this.finishEl.append(finishLayout);

		this.titleEl = HUD.element('div', 'hud-title');
		this.titleStarsEl = document.createElement('ol');

		this.root.append(
			this.starsEl, this.timerEl, this.splitEl, this.nextEl, this.arrowEl,
			this.countdownEl, this.hintEl, this.soundEl, this.finishEl, this.titleEl
		);

		const container = document.getElementById('wrapper') ?? document.body;
		container.appendChild(this.root);

		this.setArrow(false, 0, 0, 0);
		this.setEngineSound(false);
		this.nextEl.style.display = 'none';
	}

	private static element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string): HTMLElementTagNameMap[K] {
		const el = document.createElement(tag);
		el.className = className;
		return el;
	}

	// Typing in the score input must not reach the document/window keydown listeners
	// that drive the kart (WASD, Space, R, ...). Those listeners are bubble-phase, so
	// stopping propagation here keeps every keystroke local to the input.
	private restrictKeysToInput(input: HTMLInputElement): void {
		const stop = (e: KeyboardEvent): void => e.stopPropagation();

		input.addEventListener('keydown', stop);
		input.addEventListener('keyup', stop);
		input.addEventListener('keypress', stop);

		input.addEventListener('keydown', (e: KeyboardEvent): void => {
			if (e.code === 'Enter' || e.code === 'NumpadEnter') {
				input.blur();
				this.scoreButtonEl.click();
			} else if (e.code === 'Escape') {
				input.blur();
			}
		});
	}

	private static restartAnimation(el: HTMLElement, className: string): void {
		el.classList.remove(className);
		void el.offsetWidth;
		el.classList.add(className);
	}

	public setCount(n: number, total: number): void {
		const text = `★ ${n} / ${total}`;

		if (text !== this.lastStarsText) {
			const changed = this.lastStarsText !== '';
			this.lastStarsText = text;
			this.starsEl.textContent = text;

			if (changed) {
				HUD.restartAnimation(this.starsEl, 'bump');
			}
		}
	}

	public setTimer(text: string): void {
		if (text !== this.lastTimerText) {
			this.lastTimerText = text;
			this.timerEl.textContent = text;
		}
	}

	public setNext(name: string, metres: number): void {
		const text = name === null ? '' : `NEXT ▸ ${name} · ${Math.round(metres)} m`;
		const hasNextStar = name !== null;

		if (hasNextStar !== this.hasNextStar) {
			this.hasNextStar = hasNextStar;
			this.nextEl.style.display = hasNextStar ? 'flex' : 'none';
		}

		if (text !== this.lastNextText) {
			this.lastNextText = text;
			this.nextTextEl.textContent = '';

			if (name !== null) {
				const label = document.createElement('span');
				label.textContent = 'NEXT ▸ ';
				this.nextTextEl.append(label, `${name} · ${Math.round(metres)} m`);
			}
		}
	}

	// Always-visible compass-style arrow pointing toward the next star, shown next to
	// hud-next. angle is in radians: 0 = straight ahead (arrow points up), positive =
	// clockwise (star to the right). The glyph itself points right at rotate(0), so we
	// offset by -PI/2 to make 0 point up. No transition is applied so the arrow never
	// spins the long way around the ±PI wrap.
	public setNav(angle: number): void {
		if (this.lastNavAngle !== null && Math.abs(angle - this.lastNavAngle) < 0.005) {
			return;
		}

		this.lastNavAngle = angle;
		this.navEl.style.transform = `rotate(${angle - Math.PI / 2}rad)`;
	}

	public setNavEnabled(enabled: boolean): void {
		if (enabled !== this.navEnabled) {
			this.navEnabled = enabled;
			this.navEl.style.display = enabled ? 'inline-block' : 'none';
		}
	}

	// Screen-edge pointer toward an off-screen target. x/y in CSS pixels, angle in radians
	// (0 = pointing right, positive clockwise on screen).
	public setArrow(visible: boolean, x: number, y: number, angle: number): void {
		if (visible !== this.arrowVisible) {
			this.arrowVisible = visible;
			this.arrowEl.style.display = visible ? 'block' : 'none';
		}

		if (visible) {
			this.arrowEl.style.transform = `translate(${x - ArrowSize / 2}px, ${y - ArrowSize / 2}px) rotate(${angle}rad)`;
		}
	}

	public showCountdown(text: string): void {
		if (text === this.lastCountdownText) {
			return;
		}

		this.lastCountdownText = text;
		this.countdownEl.textContent = text;
		this.countdownEl.classList.toggle('go', text === 'GO!');
		HUD.restartAnimation(this.countdownEl, 'pop');
	}

	public hideCountdown(): void {
		this.lastCountdownText = '';
		this.countdownEl.classList.remove('pop');
	}

	public flashSplit(text: string): void {
		this.splitEl.textContent = text;
		HUD.restartAnimation(this.splitEl, 'show');
	}

	public floatPickup(): void {
		const el = HUD.element('div', 'hud-float');
		el.textContent = '+1 ★';
		this.root.appendChild(el);
		el.addEventListener('animationend', () => el.remove());
	}

	public showFinish(totalText: string, splits: {name: string; text: string}[]): void {
		this.finishTotalEl.textContent = `TIME ${totalText}`;
		this.finishTableEl.textContent = '';

		for (let i = 0; i < splits.length; i++) {
			const row = this.finishTableEl.insertRow();
			row.insertCell().textContent = `${i + 1}. ${splits[i].name}`;
			row.insertCell().textContent = splits[i].text;
		}

		this.finishEl.classList.add('show');
		this.hintEl.textContent = HUD.FinishHint;
	}

	public hideFinish(): void {
		this.finishEl.classList.remove('show');
		this.hintEl.textContent = HUD.DriveHint;
		this.scoreFormEl.hidden = false;
		this.scoreInputEl.disabled = false;
		this.scoreButtonEl.disabled = false;
		this.scoreButtonEl.textContent = 'Submit';
		this.scoreButtonEl.onclick = null;
		this.scoreStatusEl.textContent = '';
		this.scoreStatusEl.classList.remove('error');
		this.leaderboardEl.textContent = '';
		this.ownRowNameEl = null;
	}

	// Shows the "save your time" form prefilled with `defaultName`. `onSubmit` fires on
	// button click or Enter with the current (trimmed) input value.
	public showScoreForm(defaultName: string, buttonLabel: string, onSubmit: (name: string) => void): void {
		this.scoreInputEl.value = defaultName;
		this.scoreInputEl.disabled = false;
		this.scoreButtonEl.disabled = false;
		this.scoreButtonEl.textContent = buttonLabel;
		this.scoreFormEl.hidden = false;
		this.scoreStatusEl.textContent = '';
		this.scoreStatusEl.classList.remove('error');
		this.scoreButtonEl.onclick = (): void => onSubmit(this.getScoreNameInput());
	}

	public getScoreNameInput(): string {
		return this.scoreInputEl.value.trim();
	}

	public focusScoreInput(): void {
		this.scoreInputEl.focus();
		this.scoreInputEl.select();
	}

	public setScoreButtonLabel(label: string): void {
		this.scoreButtonEl.textContent = label;
	}

	public setScoreStatus(text: string, isError: boolean = false): void {
		this.scoreStatusEl.textContent = text;
		this.scoreStatusEl.classList.toggle('error', isError);
	}

	// Disables the form (input + button) while a request is in flight, showing `label`
	// on both the button and the status line.
	public setScoreBusy(label: string): void {
		this.scoreInputEl.disabled = true;
		this.scoreButtonEl.disabled = true;
		this.scoreButtonEl.textContent = label;
		this.setScoreStatus(label);
	}

	public setScoreSaving(): void {
		this.setScoreBusy('Saving…');
	}

	public setScoreSaved(name: string, rank: number): void {
		this.scoreInputEl.disabled = false;
		this.scoreButtonEl.disabled = false;
		this.scoreButtonEl.textContent = 'Update name';
		this.setScoreStatus(`Saved as ${name} · Rank #${rank}`);
	}

	public setScoreError(message: string): void {
		this.scoreInputEl.disabled = false;
		this.scoreButtonEl.disabled = false;
		this.scoreButtonEl.textContent = 'Retry';
		this.setScoreStatus(message, true);
	}

	// Like setScoreError but leaves the button labelled for a rename retry rather than
	// the initial-submit "Retry".
	public setScoreEditError(message: string): void {
		this.scoreInputEl.disabled = false;
		this.scoreButtonEl.disabled = false;
		this.scoreButtonEl.textContent = 'Update name';
		this.setScoreStatus(message, true);
	}

	// Renders the ranked board. `ownOutside`, when given, is the player's own entry when
	// it didn't make it into `entries` (rendered below a "…" divider with its real rank).
	public showLeaderboard(
		entries: {id: number; name: string; timeMs: number}[],
		highlightId: number | null,
		ownOutside: {rank: number; name: string; timeMs: number} | null = null
	): void {
		this.leaderboardEl.textContent = '';
		this.ownRowNameEl = null;

		let previousTime: number = null;
		let previousRank: number = 1;

		for (let i = 0; i < entries.length; i++) {
			const entry = entries[i];
			const rank = previousTime !== null && entry.timeMs === previousTime ? previousRank : i + 1;
			previousTime = entry.timeMs;
			previousRank = rank;

			const isOwn = entry.id === highlightId;
			const row = this.buildLeaderboardRow(rank, entry.name, entry.timeMs, isOwn, i);

			if (isOwn) {
				this.ownRowNameEl = row.nameEl;
			}

			this.leaderboardEl.appendChild(row.el);
		}

		if (ownOutside) {
			const divider = HUD.element('div', 'hud-leaderboard-divider');
			divider.textContent = '⋯';
			this.leaderboardEl.appendChild(divider);

			const row = this.buildLeaderboardRow(
				ownOutside.rank, ownOutside.name, ownOutside.timeMs, true, entries.length
			);
			this.ownRowNameEl = row.nameEl;
			this.leaderboardEl.appendChild(row.el);
		}
	}

	private buildLeaderboardRow(
		rank: number, name: string, timeMs: number, isOwn: boolean, animationIndex: number
	): {el: HTMLDivElement; nameEl: HTMLDivElement} {
		const row = HUD.element('div', 'hud-leaderboard-row');
		if (isOwn) {
			row.classList.add('own');
		}
		row.style.animationDelay = `${animationIndex * 45}ms`;

		const rankEl = HUD.element('div', 'rank');
		rankEl.textContent = `${rank}`;

		const nameEl = HUD.element('div', 'name');
		nameEl.textContent = name;

		const timeEl = HUD.element('div', 'time');
		timeEl.textContent = RaceState.formatTime(timeMs);

		row.append(rankEl, nameEl, timeEl);

		return {el: row, nameEl};
	}

	// Renames the currently rendered own row in place, without a full re-render.
	public updateOwnName(name: string): void {
		if (this.ownRowNameEl) {
			this.ownRowNameEl.textContent = name;
		}
	}

	public showTitle(options: TitleScreenOptions): void {
		this.titleEl.textContent = '';

		const panel = HUD.element('div', 'panel');

		const gameTitle = HUD.element('div', 'game-title');
		gameTitle.textContent = 'OPEN KART';

		const tagline = HUD.element('div', 'tagline');
		tagline.textContent = 'Collect three stars as quickly as possible!';

		const titleGroup = HUD.element('div', 'group');
		titleGroup.append(gameTitle, tagline);

		const course = HUD.element('div', 'course');
		course.textContent = `COURSE — ${options.courseName.toUpperCase()}`;

		this.titleStarsEl.textContent = '';
		for (const name of options.starNames) {
			const item = document.createElement('li');
			item.textContent = name;
			this.titleStarsEl.appendChild(item);
		}

		const kartLine = HUD.element('div', 'kart-line');
		kartLine.textContent = `KART — ${options.kartName.toUpperCase()}`;

		const courseGroup = HUD.element('div', 'group');
		courseGroup.append(course, this.titleStarsEl, kartLine);

		const prompt = HUD.element('div', 'prompt');
		prompt.textContent = 'PRESS SPACE TO START';

		const hint2 = HUD.element('div', 'hint2');
		hint2.textContent = 'R restarts · WASD / arrows drive · hold Space while turning to drift';

		const promptGroup = HUD.element('div', 'group');
		promptGroup.append(prompt, hint2);

		panel.append(titleGroup, courseGroup, promptGroup);
		this.titleEl.appendChild(panel);
		this.titleEl.classList.add('show');
	}

	public hideTitle(): void {
		this.titleEl.classList.remove('show');
	}

	public setEngineSound(enabled: boolean): void {
		this.soundEl.textContent = enabled ? '🔊 engine on (M)' : '🔇 engine off (M)';
	}
}
