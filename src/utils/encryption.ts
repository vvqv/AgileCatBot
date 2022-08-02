import config from '@src/config';
import Crypto from 'crypto';

const alg = 'aes-256-cbc';

const ENCRYPTION_KEY = config.ENCRYPTION_PRIVATE_KEY;

const IV = config.ENCRYPTION_IV;

export function encryptData(data: string) {
    const cipher = Crypto.createCipheriv(alg, ENCRYPTION_KEY, IV);

    let encryptedData = cipher.update(data, 'utf-8', 'base64');

    encryptedData += cipher.final('base64');

    return encryptedData;
}

export function decryptData(data: string) {
    const decipher = Crypto.createDecipheriv(alg, ENCRYPTION_KEY, IV);

    let decrypted = decipher.update(data, 'base64', 'utf8');

    decrypted += decipher.final('utf8');

    return decrypted;
}
