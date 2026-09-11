import React, {useCallback, useState} from "react";
import styles from './ApiDebugPanel.scss';
import {ApiDebugEntry, formatApiDebugEntry, sendApiDebugRequest} from "~/app/kart/ApiDebug";

const MAX_ENTRIES = 20;

const ApiDebugPanel: React.FC = () => {
	const [entries, setEntries] = useState<ApiDebugEntry[]>([]);
	const [isPending, setIsPending] = useState<boolean>(false);

	const send = useCallback((kind: 'listScores' | 'submitTestScore'): void => {
		setIsPending(true);

		sendApiDebugRequest(kind).then((entry: ApiDebugEntry): void => {
			setIsPending(false);
			setEntries((prev: ApiDebugEntry[]) => [entry, ...prev].slice(0, MAX_ENTRIES));
		});
	}, []);

	const sendListScores = useCallback((): void => send('listScores'), [send]);
	const sendSubmitTestScore = useCallback((): void => send('submitTestScore'), [send]);
	const clear = useCallback((): void => setEntries([]), []);

	return (
		<div className={styles.apiDebugPanel}>
			<div className={styles.apiDebugPanel__title}>API debug (B to hide)</div>
			<div className={styles.apiDebugPanel__controls}>
				<button className={styles.apiDebugPanel__button} onClick={sendListScores}>GET /api/scores</button>
				<button className={styles.apiDebugPanel__button} onClick={sendSubmitTestScore}>POST test score</button>
				<button className={styles.apiDebugPanel__button} onClick={clear}>Clear</button>
			</div>
			{
				isPending && <div className={styles.apiDebugPanel__pending}>Sending request…</div>
			}
			<div className={styles.apiDebugPanel__entries}>
				{
					entries.map((entry: ApiDebugEntry) => (
						<div key={entry.id} className={styles.apiDebugPanel__entry}>
							<div
								className={
									styles.apiDebugPanel__summary + ' ' +
									(entry.error !== null || !entry.ok ? styles['apiDebugPanel__summary--error'] : '')
								}
							>
								{formatApiDebugEntry(entry)}
							</div>
							{
								entry.error !== null ? (
									<pre className={styles.apiDebugPanel__body}>{entry.error}</pre>
								) : (
									entry.body && <pre className={styles.apiDebugPanel__body}>{entry.body}</pre>
								)
							}
						</div>
					))
				}
			</div>
		</div>
	);
};

export default React.memo(ApiDebugPanel);
