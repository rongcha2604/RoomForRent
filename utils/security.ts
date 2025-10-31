/**
 * Security utilities for password hashing and verification
 * Uses SHA-256 (Web Crypto API) for client-side password hashing
 */

/**
 * Hash a password using SHA-256
 */
export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    const inputHash = await hashPassword(password);
    return inputHash === hash;
}

/**
 * Predefined security questions
 */
export const SECURITY_QUESTIONS = [
    'Tên thú cưng đầu tiên của bạn?',
    'Tên trường cấp 3 của bạn?',
    'Quê quán của bạn?',
    'Món ăn yêu thích của bạn?',
    'Tên người thầy/cô giáo ấn tượng nhất?',
    'Thành phố bạn sinh ra?'
];

