const Styles = `
#hud { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 10;
	font-family: 'Russo One', 'Inter', system-ui, sans-serif; color: #fff; font-style: italic;
	text-shadow: -2px -2px 0 #1a1a2e, 2px -2px 0 #1a1a2e, -2px 2px 0 #1a1a2e, 2px 2px 0 #1a1a2e, 0 4px 8px rgba(0,0,0,.6); }
#hud .hud-stars { position: absolute; top: 18px; left: 22px; font-size: 40px; color: #ffd83d; }
#hud .hud-stars.bump { animation: hudBump .35s ease-out; }
#hud .hud-timer { position: absolute; top: 18px; right: 24px; font-size: 40px; letter-spacing: 1px; }
#hud .hud-split { position: absolute; top: 70px; right: 26px; font-size: 22px; color: #7dff9a; opacity: 0; }
#hud .hud-split.show { animation: hudSplit 1.6s ease-out; }
#hud .hud-next { position: absolute; top: 22px; left: 50%; transform: translateX(-50%); font-size: 24px; white-space: nowrap; }
#hud .hud-next span { color: #ffd83d; }
#hud .hud-arrow { position: absolute; left: 0; top: 0; font-size: 44px; color: #ffd83d; line-height: 1; will-change: transform; }
#hud .hud-countdown { position: absolute; left: 50%; top: 42%; transform: translate(-50%, -50%); font-size: 160px; color: #ffd83d; opacity: 0; }
#hud .hud-countdown.go { color: #7dff9a; }
#hud .hud-countdown.pop { animation: hudPop .9s ease-out; }
#hud .hud-float { position: absolute; top: 60px; left: 30px; font-size: 30px; color: #ffd83d; animation: hudFloat 1s ease-out forwards; }
#hud .hud-hint { position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); font-size: 14px; font-style: normal; opacity: .85; white-space: nowrap; text-shadow: 0 1px 3px rgba(0,0,0,.9); }
#hud .hud-sound { position: absolute; bottom: 14px; right: 22px; font-size: 14px; font-style: normal; opacity: .8; text-shadow: 0 1px 3px rgba(0,0,0,.9); }
#hud .hud-finish { position: absolute; inset: 0; display: none; align-items: center; justify-content: center; flex-direction: column; gap: 10px; background: rgba(10,10,30,.55); }
#hud .hud-finish.show { display: flex; }
#hud .hud-finish .title { font-size: 96px; color: #ffd83d; animation: hudPop .9s ease-out; }
#hud .hud-finish .total { font-size: 48px; }
#hud .hud-finish .best { font-size: 22px; color: #7dff9a; }
#hud .hud-finish table { font-size: 18px; border-collapse: collapse; margin-top: 6px; }
#hud .hud-finish td { padding: 2px 14px; text-align: left; }
#hud .hud-finish td:last-child { text-align: right; }
#hud .hud-finish .restart { font-size: 18px; margin-top: 12px; opacity: .9; }
@keyframes hudPop { 0% { transform: translate(-50%, -50%) scale(2.2); opacity: 0; } 18% { transform: translate(-50%, -50%) scale(1); opacity: 1; } 75% { opacity: 1; } 100% { transform: translate(-50%, -50%) scale(.9); opacity: 0; } }
@keyframes hudBump { 0% { transform: scale(1); } 40% { transform: scale(1.35); } 100% { transform: scale(1); } }
@keyframes hudSplit { 0% { opacity: 0; transform: translateY(-6px); } 15% { opacity: 1; transform: translateY(0); } 80% { opacity: 1; } 100% { opacity: 0; } }
@keyframes hudFloat { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-50px); } }
`;

export default class HUD {
	private readonly root: HTMLDivElement;
	private readonly starsEl: HTMLDivElement;
	private readonly timerEl: HTMLDivElement;
	private readonly splitEl: HTMLDivElement;
	private readonly nextEl: HTMLDivElement;
	private readonly arrowEl: HTMLDivElement;
	private readonly countdownEl: HTMLDivElement;
	private readonly soundEl: HTMLDivElement;
	private readonly finishEl: HTMLDivElement;
	private readonly finishTotalEl: HTMLDivElement;
	private readonly finishBestEl: HTMLDivElement;
	private readonly finishTableEl: HTMLTableElement;
	private lastStarsText: string = '';
	private lastTimerText: string = '';
	private lastNextText: string = '';
	private lastCountdownText: string = '';
	private arrowVisible: boolean = true;

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
		this.arrowEl = HUD.element('div', 'hud-arrow');
		this.arrowEl.textContent = '➤';
		this.countdownEl = HUD.element('div', 'hud-countdown');
		this.soundEl = HUD.element('div', 'hud-sound');

		const hint = HUD.element('div', 'hud-hint');
		hint.textContent = 'WASD / arrows drive · hold Space while turning to drift, release to boost · R restart · C free camera · M engine sound · music in Settings';

		this.finishEl = HUD.element('div', 'hud-finish');
		const title = HUD.element('div', 'title');
		title.textContent = 'FINISH!';
		this.finishTotalEl = HUD.element('div', 'total');
		this.finishBestEl = HUD.element('div', 'best');
		this.finishTableEl = document.createElement('table');
		const restart = HUD.element('div', 'restart');
		restart.textContent = 'Press Space to race again';
		this.finishEl.append(title, this.finishTotalEl, this.finishBestEl, this.finishTableEl, restart);

		this.root.append(
			this.starsEl, this.timerEl, this.splitEl, this.nextEl, this.arrowEl,
			this.countdownEl, hint, this.soundEl, this.finishEl
		);

		const container = document.getElementById('wrapper') ?? document.body;
		container.appendChild(this.root);

		this.setArrow(false, 0, 0, 0);
		this.setEngineSound(false);
	}

	private static element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string): HTMLElementTagNameMap[K] {
		const el = document.createElement(tag);
		el.className = className;
		return el;
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

		if (text !== this.lastNextText) {
			this.lastNextText = text;
			this.nextEl.textContent = '';

			if (name !== null) {
				const label = document.createElement('span');
				label.textContent = 'NEXT ▸ ';
				this.nextEl.append(label, `${name} · ${Math.round(metres)} m`);
			}
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
			this.arrowEl.style.transform = `translate(${x - 22}px, ${y - 22}px) rotate(${angle}rad)`;
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

	public showFinish(totalText: string, splits: {name: string; text: string}[], bestText: string, isNewBest: boolean): void {
		this.finishTotalEl.textContent = `TIME ${totalText}`;
		this.finishBestEl.textContent = isNewBest ? 'NEW BEST TIME!' : `Best ${bestText}`;
		this.finishTableEl.textContent = '';

		for (let i = 0; i < splits.length; i++) {
			const row = this.finishTableEl.insertRow();
			row.insertCell().textContent = `${i + 1}. ${splits[i].name}`;
			row.insertCell().textContent = splits[i].text;
		}

		this.finishEl.classList.add('show');
	}

	public hideFinish(): void {
		this.finishEl.classList.remove('show');
	}

	public setEngineSound(enabled: boolean): void {
		this.soundEl.textContent = enabled ? '🔊 engine on (M)' : '🔇 engine off (M)';
	}
}
