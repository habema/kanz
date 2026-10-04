import type { NextFunction, Request, Response } from 'express';
import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { loadState } from './store';

// One admin password guards /admin, /mc and /setup. The first visitor creates
// it; a signed cookie bound to the password hash keeps each device signed in.
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) throw new Error('SESSION_SECRET is not set.');

export const SESSION_COOKIE = 'session';
export const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict' as const,
  // Set COOKIE_SECURE=false when serving production over plain http.
  secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production',
  path: '/api',
  maxAge: 24 * 60 * 60 * 1000,
};

// Async so a burst of login attempts doesn't stall the screens' polling.
const scryptAsync = promisify(scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;

export async function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${(await scryptAsync(password, salt, 64)).toString('hex')}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [salt, stored] = encoded.split(':');
  if (!salt || !stored) return false;
  const expected = Buffer.from(stored, 'hex');
  return timingSafeEqual(expected, await scryptAsync(password, salt, expected.length));
}

// Anyone on the venue's network can reach the login, so each address gets a
// few wrong guesses before it has to wait.
const MAX_FAILURES = 10;
const LOCKOUT_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; since: number }>();

export function loginBlocked(ip: string) {
  const entry = failures.get(ip);
  if (entry && Date.now() - entry.since > LOCKOUT_MS) failures.delete(ip);
  return (failures.get(ip)?.count ?? 0) >= MAX_FAILURES;
}

export function recordLoginFailure(ip: string) {
  const entry = failures.get(ip) ?? { count: 0, since: Date.now() };
  failures.set(ip, { ...entry, count: entry.count + 1 });
}

export function clearLoginFailures(ip: string) {
  failures.delete(ip);
}

function signature(payload: string, passwordHash: string) {
  return createHmac('sha256', sessionSecret!).update(`${payload}.${passwordHash}`).digest('hex');
}

export function signSession(passwordHash: string) {
  const expiry = `${Date.now() + cookieOptions.maxAge}`;
  return `${expiry}.${signature(expiry, passwordHash)}`;
}

function isValidSession(cookie: string | undefined, passwordHash: string | undefined) {
  if (!cookie || !passwordHash) return false;
  const [expiry, sig] = cookie.split('.');
  if (!expiry || !sig || !/^\d+$/.test(expiry) || Number(expiry) < Date.now()) return false;
  const expected = Buffer.from(signature(expiry, passwordHash), 'hex');
  const received = Buffer.from(sig, 'hex');
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const { passwordHash } = await loadState();
  if (isValidSession(req.cookies?.[SESSION_COOKIE], passwordHash)) return next();
  res.status(401).json({ error: 'سجّل الدخول بكلمة مرور الإدارة.' });
}
