export default class HUD {
	private readonly root: HTMLDivElement;
	private readonly countEl: HTMLDivElement;
	private readonly nearestEl: HTMLDivElement;
	private readonly winOverlay: HTMLDivElement;
	private readonly winTimeEl: HTMLDivElement;
	private lastCountText: string = '';
	private lastNearestText: string = '';

	public constructor() {
		this.root = document.createElement('div');
		this.root.id = 'hud';
		Object.assign(this.root.style, {
			position: 'absolute',
			inset: '0',
			pointerEvents: 'none',
			fontFamily: 'Inter, system-ui, sans-serif',
			color: '#fff',
			textShadow: '0 1px 3px rgba(0,0,0,.8)',
			zIndex: '10'
		});

		this.countEl = document.createElement('div');
		Object.assign(this.countEl.style, {
			position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)',
			fontSize: '28px', fontWeight: 'bold', padding: '8px 16px',
			background: 'rgba(0,0,0,.45)', borderRadius: '10px', whiteSpace: 'nowrap'
		});

		this.nearestEl = document.createElement('div');
		Object.assign(this.nearestEl.style, {
			position: 'absolute', top: '72px', left: '50%', transform: 'translateX(-50%)',
			fontSize: '18px', textAlign: 'center', whiteSpace: 'nowrap'
		});

		const hint = document.createElement('div');
		hint.textContent = 'WASD / arrows to drive · hold Space while turning to drift, release to boost · R reset · C free camera';
		Object.assign(hint.style, {
			position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
			fontSize: '14px', opacity: '.85', whiteSpace: 'nowrap'
		});

		this.winOverlay = document.createElement('div');
		Object.assign(this.winOverlay.style, {
			display: 'none', position: 'absolute', inset: '0',
			alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
			background: 'rgba(0,0,0,.6)', textAlign: 'center', gap: '12px'
		});

		const winTitle = document.createElement('div');
		winTitle.textContent = 'You collected all 8 Stars!';
		Object.assign(winTitle.style, {fontSize: '36px', fontWeight: 'bold'});

		this.winTimeEl = document.createElement('div');
		Object.assign(this.winTimeEl.style, {fontSize: '20px'});

		const winHint = document.createElement('div');
		winHint.textContent = 'Press Space to restart';
		Object.assign(winHint.style, {fontSize: '16px', opacity: '.85'});

		this.winOverlay.append(winTitle, this.winTimeEl, winHint);
		this.root.append(this.countEl, this.nearestEl, hint, this.winOverlay);

		const container = document.getElementById('wrapper') ?? document.body;
		container.appendChild(this.root);
	}

	public setCount(n: number, total: number): void {
		const text = `Stars: ${n} / ${total}`;

		if (text !== this.lastCountText) {
			this.lastCountText = text;
			this.countEl.textContent = text;
		}
	}

	public setNearest(name: string | null, arrow: string, metres: number): void {
		const text = name === null ? '' : `${arrow} ${name} · ${Math.round(metres)} m`;

		if (text !== this.lastNearestText) {
			this.lastNearestText = text;
			this.nearestEl.textContent = text;
			this.nearestEl.style.display = name === null ? 'none' : 'block';
		}
	}

	public showWin(elapsedSeconds: number): void {
		const m = Math.floor(elapsedSeconds / 60);
		const s = Math.floor(elapsedSeconds % 60);

		this.winTimeEl.textContent = `Time: ${m}:${s.toString().padStart(2, '0')}`;
		this.winOverlay.style.display = 'flex';
	}

	public hideWin(): void {
		this.winOverlay.style.display = 'none';
	}
}
