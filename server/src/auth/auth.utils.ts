import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 15;

/**
 * Hashes a plain-text password.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);
  return hashedPassword;
}

/**
 * Compares a plain-text password with a stored hashed password.
 * Returns true if they match, false otherwise.
 */
export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
  return isMatch;
}