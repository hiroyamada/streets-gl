import React from "react";
import styles from './SettingsButton.scss';
import {IoSettingsOutline} from 'react-icons/io5';

const SettingsButton: React.FC<{
	isActive: boolean;
	onClick: () => void;
}> = ({isActive, onClick}) => {
	let className = styles.settingsButton__icon;

	if (isActive) {
		className += ' ' + styles['settingsButton__icon--active'];
	}

	return (
		<div className={styles.settingsButton}>
			<button className={className} onClick={onClick}>
				<IoSettingsOutline size={24}/>
			</button>
		</div>
	);
}

export default React.memo(SettingsButton);
