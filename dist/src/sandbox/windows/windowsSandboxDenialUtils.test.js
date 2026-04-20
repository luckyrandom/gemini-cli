/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { parseWindowsSandboxDenials } from './windowsSandboxDenialUtils.js';
describe('parseWindowsSandboxDenials', () => {
    it('should detect CMD "Access is denied" and extract paths', () => {
        const parsed = parseWindowsSandboxDenials({
            output: 'Access is denied.\r\n',
            error: new Error('Command failed: dir C:\\Windows\\System32\\config'),
        });
        expect(parsed).toBeDefined();
        expect(parsed?.filePaths).toContain('C:\\Windows\\System32\\config');
    });
    it('should detect PowerShell "Access to the path is denied"', () => {
        const parsed = parseWindowsSandboxDenials({
            output: "Set-Content : Access to the path 'C:\\test.txt' is denied.\r\nAt line:1 char:1\r\n",
        });
        expect(parsed).toBeDefined();
        expect(parsed?.filePaths).toContain('C:\\test.txt');
    });
    it('should detect Node.js EPERM on Windows', () => {
        const parsed = parseWindowsSandboxDenials({
            error: {
                message: "Error: EPERM: operation not permitted, open 'D:\\project\\file.ts'",
            },
        });
        expect(parsed).toBeDefined();
        expect(parsed?.filePaths).toContain('D:\\project\\file.ts');
    });
    it('should detect network denial (EACCES)', () => {
        const parsed = parseWindowsSandboxDenials({
            output: 'Error: listen EACCES: permission denied 0.0.0.0:3000',
        });
        expect(parsed).toBeDefined();
        expect(parsed?.network).toBe(true);
    });
    it('should detect native Windows error code 0x80070005', () => {
        const parsed = parseWindowsSandboxDenials({
            output: 'HRESULT: 0x80070005',
        });
        expect(parsed).toBeDefined();
        // No path in output, but recognized as denial
    });
    it('should handle extended-length paths', () => {
        const parsed = parseWindowsSandboxDenials({
            output: 'Access is denied to \\\\?\\C:\\Very\\Long\\Path\\file.txt',
        });
        expect(parsed).toBeDefined();
        expect(parsed?.filePaths).toContain('\\\\?\\C:\\Very\\Long\\Path\\file.txt');
    });
    it('should detect Windows paths with forward slashes', () => {
        const parsed = parseWindowsSandboxDenials({
            output: "Error: EPERM: operation not permitted, open 'C:/project/file.ts'",
        });
        expect(parsed).toBeDefined();
        expect(parsed?.filePaths).toContain('C:/project/file.ts');
    });
    it('should return undefined if no denial detected', () => {
        const parsed = parseWindowsSandboxDenials({
            output: 'Directory of C:\\Users\r\n03/26/2026  11:40 AM    <DIR>          .',
        });
        expect(parsed).toBeUndefined();
    });
});
//# sourceMappingURL=windowsSandboxDenialUtils.test.js.map