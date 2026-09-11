import * as crypto from 'crypto';

/**
 * Generate a new random secret edit token for a freshly created score.
 */
export function generateEditToken(): string {
	return crypto.randomBytes(16).toString('hex');
}

/**
 * Constant-time comparison of a stored edit token against one supplied by a
 * client, so a mismatch can't be used to learn the token a character at a
 * time via response-timing differences.
 *
 * `stored` being `undefined` (an older record with no token) always fails.
 */
export function editTokensMatch(stored: string | undefined, supplied: string): boolean {
	if (!stored) {
		return false;
	}

	const storedBuf = Buffer.from(stored, 'utf-8');
	const suppliedBuf = Buffer.from(supplied, 'utf-8');

	if (storedBuf.length !== suppliedBuf.length) {
		return false;
	}

	return crypto.timingSafeEqual(storedBuf, suppliedBuf);
}
