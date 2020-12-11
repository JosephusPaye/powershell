import { EOL } from 'os';
import { exec, ChildProcess } from 'child_process';

export interface PowershellOptions {
  /**
   * The format to convert the command's output to. If this is specified, the command should
   * not end with a semi-colon, as it is piped into another command for conversion.
   */
  convertTo?: 'json' | 'csv' | 'html';

  /**
   * Ensure that the JSON result returned is an array. Will wrap non-arrays in an array.
   */
  ensureJsonArray?: boolean;

  /**
   * Get access to the underlying child process. The function provided will be
   * called with the child process as soon as it is created and launched.
   */
  useChildProcess?(child: ChildProcess): void;
}

export interface CommandOutput {
  /**
   * The command's stdout, trimmed
   */
  stdout: string;

  /**
   * The command's stderr, trimmed
   */
  stderr: string;

  /**
   * The command's exit code
   */
  exitCode: number | null;
}

export type CommandOutputWithResult<T> = CommandOutput & {
  /**
   * The command's result. For commands requesting JSON, this is stdout parsed as JSON.
   */
  result: T;
};

/**
 * Run the given PowerShell command, and optionally convert the results to JSON, CSV, or HTML.
 */
export async function command<T = any>(
  command: string,
  options?: PowershellOptions
): Promise<CommandOutputWithResult<T>> {
  const { convertTo, ensureJsonArray } = Object.assign(
    {},
    { convertTo: 'none', ensureJsonArray: false },
    options
  );

  const converters = {
    json: ' | ConvertTo-Json',
    csv: ' | ConvertTo-Csv',
    html: ' | ConvertTo-Html',
  };

  command += converters[convertTo] || '';

  const { stdout, stderr, exitCode } = await execAsPromised(
    [
      'powershell.exe',
      '-NonInteractive',
      '-NoProfile',
      '-command',
      `"${command.replace(/"/g, '\\"')}"`,
    ].join(' '),
    options?.useChildProcess
  );

  let result: T;

  if (convertTo === 'json') {
    if (stdout.length > 0) {
      const json = JSON.parse(stdout);
      result = ensureJsonArray ? array(json) : json;
    } else {
      result = ensureJsonArray ? ([] as any) : undefined;
    }
  } else {
    result = stdout as any;
  }

  return { stdout, stderr, exitCode, result };
}

/**
 * Run the given PowerShell commands from a script file and get the output as a string
 */
export async function commandsAsScript(
  commands: string,
  useChildProcess?: PowershellOptions['useChildProcess']
): Promise<CommandOutput> {
  const { stdout, stderr, exitCode } = await execAsPromised(
    [
      'powershell.exe',
      '-NonInteractive',
      '-NoProfile',
      '-command',
      '-', // reads script from stdin
    ].join(' '),
    (child) => {
      child.stdin?.write(commands + EOL + ';exit $LASTEXITCODE;' + EOL);

      if (useChildProcess) {
        useChildProcess(child);
      }
    }
  );

  return { stdout, stderr, exitCode };
}

/**
 * Ensure the given value is an array
 */
function array<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : value !== undefined ? [value] : [];
}

/**
 * A Promise wrapper around child_process.exec()
 */
function execAsPromised(
  command: string,
  useChildProcess?: (child: ChildProcess) => void
): Promise<CommandOutput> {
  return new Promise((resolve, reject) => {
    const child = exec(command, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      }

      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: child.exitCode,
      });
    });

    if (useChildProcess !== undefined) {
      useChildProcess(child);
    }
  });
}
