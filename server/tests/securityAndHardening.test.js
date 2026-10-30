const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const { generateToken, verifyToken } = require('../src/services/auth');
const User = require('../src/models/User');
const { validateUploadZip } = require('../src/middleware/uploadGuard');
const { redactString, redactObject } = require('../src/services/redact');
const { createRateLimiter } = require('../src/middleware/security');

describe('EVOLVE Phase 6 Security & Hardening Suite', () => {

  describe('Authentication & JWT Cryptography', () => {
    test('generateToken and verifyToken work with HMAC-SHA256', () => {
      const payload = { id: 'u123', email: 'test@evolve.local', role: 'user' };
      const token = generateToken(payload, 3600);

      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);

      const decoded = verifyToken(token);
      expect(decoded.id).toBe('u123');
      expect(decoded.email).toBe('test@evolve.local');
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    test('verifyToken rejects tampered or expired tokens', () => {
      const token = generateToken({ id: 'u123' }, 3600);
      const tampered = token.substring(0, token.length - 5) + 'xxxxx';
      expect(() => verifyToken(tampered)).toThrow('Invalid token signature');

      const expiredToken = generateToken({ id: 'u123' }, -10);
      expect(() => verifyToken(expiredToken)).toThrow('Token expired');
    });

    test('User async salted PBKDF2 password hashing and verification', async () => {
      const password = 'SuperSecureSecretPassword2026!';
      const { salt, hash } = await User.hashPassword(password);

      expect(salt).toBeDefined();
      expect(hash).toBeDefined();

      const user = new User({
        email: 'testuser@evolve.local',
        username: 'testuser',
        salt,
        passwordHash: hash
      });

      const isValid = await user.verifyPassword(password);
      expect(isValid).toBe(true);

      const isInvalid = await user.verifyPassword('WrongPassword!');
      expect(isInvalid).toBe(false);
    });
  });

  describe('Upload Safety & Decompression Guard', () => {
    const tempDir = path.join(__dirname, 'temp_security');

    beforeAll(() => {
      fs.mkdirSync(tempDir, { recursive: true });
    });

    afterAll(() => {
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
    });

    test('Rejects Zip-Slip path traversal attempt', () => {
      const zipPath = path.join(tempDir, 'zip_slip.zip');
      const zip = new AdmZip();
      zip.addFile('test.txt', Buffer.from('malicious root file'));
      zip.getEntries()[0].entryName = '../../etc/passwd';
      zip.writeZip(zipPath);

      expect(() => validateUploadZip(zipPath)).toThrow(/Zip-Slip path traversal attempt detected/);
    });

    test('Rejects executable files inside zip archive', () => {
      const zipPath = path.join(tempDir, 'evil_exec.zip');
      const zip = new AdmZip();
      zip.addFile('malware.exe', Buffer.from('executable binary payload'));
      zip.writeZip(zipPath);

      expect(() => validateUploadZip(zipPath)).toThrow(/Disallowed executable extension/);
    });

    test('Rejects archives exceeding maximum file count (decompression bomb)', () => {
      const zipPath = path.join(tempDir, 'bomb.zip');
      const zip = new AdmZip();
      for (let i = 0; i < 505; i++) {
        zip.addFile(`file_${i}.txt`, Buffer.from('data'));
      }
      zip.writeZip(zipPath);

      expect(() => validateUploadZip(zipPath)).toThrow(/Archive exceeds maximum allowed file count/);
    });

    test('Accepts clean, valid Node.js zip archive', () => {
      const zipPath = path.join(tempDir, 'valid.zip');
      const zip = new AdmZip();
      zip.addFile('package.json', Buffer.from(JSON.stringify({ name: 'test-app', dependencies: { express: '^4.19.0' } })));
      zip.addFile('server.js', Buffer.from("console.log('hello');"));
      zip.writeZip(zipPath);

      const res = validateUploadZip(zipPath);
      expect(res.valid).toBe(true);
      expect(res.fileCount).toBe(2);
    });
  });

  describe('Secrets Redaction Pass', () => {
    test('Scrubs API keys, bearer tokens, and connection strings', () => {
      const rawText = 'Error connecting to mongodb://admin:mySecretPass123@cluster0.net with key sk-123456789012345678901234 and Bearer eyJhbGciOiJIUzI1NiJ9.test.sig';
      const clean = redactString(rawText);

      expect(clean).not.toContain('mySecretPass123');
      expect(clean).not.toContain('sk-123456789012345678901234');
      expect(clean).toContain('mongodb://admin:***REDACTED***@');
      expect(clean).toContain('Bearer ***REDACTED***');
    });

    test('Scrubs sensitive fields in nested JSON objects', () => {
      const sensitiveObj = {
        name: 'test',
        password: 'cleartext_password',
        apiKey: 'sk-abcdef123456789012345678',
        meta: {
          token: 'jwt_token_secret'
        }
      };
      const redacted = redactObject(sensitiveObj);

      expect(redacted.password).toBe('***REDACTED***');
      expect(redacted.apiKey).toBe('***REDACTED***');
      expect(redacted.meta.token).toBe('***REDACTED***');
      expect(redacted.name).toBe('test');
    });
  });

  describe('Rate Limiting Middleware', () => {
    test('Allows requests under quota and returns 429 when exceeded', () => {
      const limiter = createRateLimiter({ max: 3, windowMs: 1000 });
      const req = { ip: '192.168.1.100', path: '/api/projects' };
      const next = jest.fn();
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // 1st, 2nd, 3rd requests should pass
      limiter(req, res, next);
      limiter(req, res, next);
      limiter(req, res, next);
      expect(next).toHaveBeenCalledTimes(3);

      // 4th request should receive 429
      limiter(req, res, next);
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'TooManyRequests' }));
    });
  });
});
