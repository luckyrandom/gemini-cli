/**
 * Determines if a command is strictly approved for execution on macOS.
 * A command is approved if it's composed entirely of tools explicitly listed in `approvedTools`
 * OR if it's composed of known safe, read-only POSIX commands.
 *
 * @param command - The full command string to execute.
 * @param args - The arguments for the command.
 * @param approvedTools - A list of explicitly approved tool names (e.g., ['npm', 'git']).
 * @returns true if the command is strictly approved, false otherwise.
 */
export declare function isStrictlyApproved(command: string, args: string[], approvedTools?: string[]): Promise<boolean>;
/**
 * Checks if a command with its arguments is known to be safe to execute
 * without requiring user confirmation. This is primarily used to allow
 * harmless, read-only commands to run silently in the macOS sandbox.
 *
 * It handles raw command execution as well as wrapped commands like `bash -c "..."` or `bash -lc "..."`.
 * For wrapped commands, it parses the script and ensures all individual
 * sub-commands are in the known-safe list and no dangerous shell operators
 * (like subshells or redirection) are used.
 *
 * @param args - The command and its arguments (e.g., ['ls', '-la'])
 * @returns true if the command is considered safe, false otherwise.
 */
export declare function isKnownSafeCommand(args: string[]): boolean;
/**
 * Checks if a command with its arguments is explicitly known to be dangerous
 * and should be blocked or require strict user confirmation. This catches
 * destructive commands like `rm -rf`, `sudo`, and commands with execution
 * flags like `find -exec`.
 *
 * @param args - The command and its arguments.
 * @returns true if the command is identified as dangerous, false otherwise.
 */
export declare function isDangerousCommand(args: string[]): boolean;
