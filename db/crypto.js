const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || raw.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY is missing or invalid. It must be a 64-character hex string (32 bytes). ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return Buffer.from(raw, 'hex');
}

// Encrypts a plain string (or number/anything stringifiable) into a single
// storable string: "iv:authTag:ciphertext" (all hex). Returns null for
// null/undefined input so optional fields stay optional.
function encryptField(value) {
  if (value === null || value === undefined) return null;
  const key = getKey();
  const iv = crypto.randomBytes(12); // recommended IV size for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const text = String(value);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

// Reverses encryptField. Returns null if given null.
function decryptField(payload) {
  if (payload === null || payload === undefined) return null;
  const key = getKey();
  const [ivHex, authTagHex, dataHex] = String(payload).split(':');
  if (!ivHex || !authTagHex || !dataHex) {
    throw new Error('Malformed encrypted field — cannot decrypt.');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = { encryptField, decryptField };
