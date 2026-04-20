/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import { GEMINI_DIR, homedir } from '../utils/paths.js';
export class FileKeychain {
    tokenFilePath;
    encryptionKey;
    constructor() {
        const configDir = path.join(homedir(), GEMINI_DIR);
        this.tokenFilePath = path.join(configDir, 'gemini-credentials.json');
        this.encryptionKey = this.deriveEncryptionKey();
    }
    deriveEncryptionKey() {
        const salt = `${os.hostname()}-${os.userInfo().username}-gemini-cli`;
        return crypto.scryptSync('gemini-cli-oauth', salt, 32);
    }
    encrypt(text) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    }
    decrypt(encryptedData) {
        const parts = encryptedData.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted data format');
        }
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];
        const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    async ensureDirectoryExists() {
        const dir = path.dirname(this.tokenFilePath);
        await fs.mkdir(dir, { recursive: true, mode: 0o700 });
    }
    async loadData() {
        try {
            const data = await fs.readFile(this.tokenFilePath, 'utf-8');
            const decrypted = this.decrypt(data);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
            return JSON.parse(decrypted);
        }
        catch (error) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
            const err = error;
            if (err.code === 'ENOENT') {
                return {};
            }
            if (err.message?.includes('Invalid encrypted data format') ||
                err.message?.includes('Unsupported state or unable to authenticate data')) {
                throw new Error(`Corrupted credentials file detected at: ${this.tokenFilePath}\n` +
                    `Please delete or rename this file to resolve the issue.`);
            }
            throw error;
        }
    }
    async saveData(data) {
        await this.ensureDirectoryExists();
        const json = JSON.stringify(data, null, 2);
        const encrypted = this.encrypt(json);
        await fs.writeFile(this.tokenFilePath, encrypted, { mode: 0o600 });
    }
    async getPassword(service, account) {
        const data = await this.loadData();
        return data[service]?.[account] ?? null;
    }
    async setPassword(service, account, password) {
        const data = await this.loadData();
        if (!data[service]) {
            data[service] = {};
        }
        data[service][account] = password;
        await this.saveData(data);
    }
    async deletePassword(service, account) {
        const data = await this.loadData();
        if (data[service] && account in data[service]) {
            delete data[service][account];
            if (Object.keys(data[service]).length === 0) {
                delete data[service];
            }
            if (Object.keys(data).length === 0) {
                try {
                    await fs.unlink(this.tokenFilePath);
                }
                catch (error) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
                    const err = error;
                    if (err.code !== 'ENOENT') {
                        throw error;
                    }
                }
            }
            else {
                await this.saveData(data);
            }
            return true;
        }
        return false;
    }
    async findCredentials(service) {
        const data = await this.loadData();
        const serviceData = data[service] || {};
        return Object.entries(serviceData).map(([account, password]) => ({
            account,
            password,
        }));
    }
}
//# sourceMappingURL=fileKeychain.js.map