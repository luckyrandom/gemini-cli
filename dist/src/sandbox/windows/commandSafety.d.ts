/**
 * Determines if a command is strictly approved for execution on Windows.
 * A command is approved if it's composed entirely of tools explicitly listed in `approvedTools`
 * OR if it's composed of known safe, read-only Windows commands.
 *
 * @param command - The full command string to execute.
 * @param args - The arguments for the command.
 * @param approvedTools - A list of explicitly approved tool names (e.g., ['npm', 'git']).
 * @returns true if the command is strictly approved, false otherwise.
 */
export declare function isStrictlyApproved(command: string, args: string[], approvedTools?: string[]): Promise<boolean>;
/**
 * Checks if a Windows command is known to be safe (read-only).
 */
export declare function isKnownSafeCommand(args: string[]): boolean;
/**
 * Checks if a Windows command is explicitly dangerous.
 */
export declare function isDangerousCommand(args: string[]): boolean;
