import { EOL } from 'os';
import { exec, ChildProcess } from 'child_process';

export interface PowershellOptions {
  convertTo?: 'json' | 'csv' | 'html';
  ensureJsonArray?: boolean;
}

/**
 * Run the given PowerShell command, and optionally convert the results to JSON, CSV, or HTML.
 */
export async function command<T = any>(
  command: string,
  options?: PowershellOptions
): Promise<T> {
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

  const { stdout } = await execAsPromised(
    [
      'powershell.exe',
      '-NonInteractive',
      '-NoProfile',
      '-command',
      JSON.stringify(command), // applies double-quotes, escapes internal double quotes
    ].join(' ')
  );

  if (convertTo === 'json') {
    if (stdout.length > 0) {
      const json = JSON.parse(stdout);
      return ensureJsonArray ? array(json) : json;
    } else {
      return ensureJsonArray ? ([] as any) : undefined;
    }
  }

  return stdout as any;
}

/**
 * Run the given PowerShell commands from a script file and get the output as a string
 */
export async function commandsAsScript(
  commands: string
): Promise<{ stdout: string; stderr: string }> {
  const { stdout, stderr } = await execAsPromised(
    [
      'powershell.exe',
      '-NonInteractive',
      '-NoProfile',
      '-command',
      '-', // reads script from stdin
    ].join(' '),
    (child) => {
      child.stdin?.write(commands + EOL + ';exit $LASTEXITCODE;' + EOL);
    }
  );

  return { stdout, stderr };
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
  useChildProcess?: (childProcess: ChildProcess) => void
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = exec(command, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      }

      resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
    });

    if (useChildProcess !== undefined) {
      useChildProcess(child);
    }
  });
}
