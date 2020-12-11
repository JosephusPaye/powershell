# powershell

> Run PowerShell commands from Node.js and get the results as text, JSON, CSV, or HTML.

This project is part of [#CreateWeekly](https://twitter.com/JosephusPaye/status/1214853295023411200), my attempt to create something new publicly every week in 2020.

## Installation

```
npm install @josephuspaye/powershell --save
```

## Usage

For the following examples, let's assume there's a folder called `fixtures/` in the current working directory with the following entries:

```
folder/
file-a.txt
file-b.md
```

### Run a command and get output as plain text

```js
const { command } = require('@josephuspaye/powershell');

async function main() {
  try {
    const { result } = await command('ls fixtures');
    console.log(result);
  } catch (error) {
    console.error('unable to run powershell command', error);
  }
}

main();
```

<details>
<summary>View sample output</summary>

```
Directory: C:\code\JosephusPaye\powershell\tests\fixtures


Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
d-----        10/12/2020   8:15 PM                folder
-a----        10/12/2020   8:15 PM              7 file-a.txt
-a----        10/12/2020   8:15 PM              9 file-b.md

```

</details>

### Run a command and get output as JSON

```js
const { command } = require('@josephuspaye/powershell');

async function main() {
  try {
    const { result } = await command(
      'ls fixtures | Select-Object Name,DirectoryName',
      {
        convertTo: 'json',
      }
    );
    console.log(JSON.stringify(result, null, '  '));
  } catch (error) {
    console.error('unable to run powershell command', error);
  }
}

main();
```

<details>
<summary>View output</summary>

```json
[
  {
    "Name": "folder",
    "DirectoryName": null
  },
  {
    "Name": "file-a.txt",
    "DirectoryName": "C:\\code\\JosephusPaye\\powershell\\tests\\fixtures"
  },
  {
    "Name": "file-b.md",
    "DirectoryName": "C:\\code\\JosephusPaye\\powershell\\tests\\fixtures"
  }
]
```

</details>

### Run a series of commands from a script file

This is useful when you have a large number of commands that would exceed the maximum command argument size.

```js
const { commandsAsScript } = require('@josephuspaye/powershell');

async function main() {
  try {
    const command = `Get-Item fixtures/file-a.txt | Select-Object Name,DirectoryName | ConvertTo-Json;`;
    const commands = [command, command, command, command].join('\r\n');

    const { stdout } = await commandsAsScript(commands);

    console.log(stdout);
  } catch (error) {
    console.error('unable to run powershell commands as script', error);
  }
}

main();
```

<details>
<summary>View output</summary>

```
{
    "Name":  "file-a.txt",
    "DirectoryName":  "C:\\code\\JosephusPaye\\powershell\\tests\\fixtures"
}
{
    "Name":  "file-a.txt",
    "DirectoryName":  "C:\\code\\JosephusPaye\\powershell\\tests\\fixtures"
}
{
    "Name":  "file-a.txt",
    "DirectoryName":  "C:\\code\\JosephusPaye\\powershell\\tests\\fixtures"
}
{
    "Name":  "file-a.txt",
    "DirectoryName":  "C:\\code\\JosephusPaye\\powershell\\tests\\fixtures"
}
```

</details>

## API

```ts
interface PowershellOptions {
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

interface CommandOutput {
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

type CommandOutputWithResult<T> = CommandOutput & {
  /**
   * The command's result. For commands requesting JSON, this is stdout parsed as JSON.
   */
  result: T;
};

/**
 * Run the given PowerShell command, and optionally convert the results to JSON, CSV, or HTML.
 */
function command<T = any>(
  command: string,
  options?: PowershellOptions
): Promise<CommandOutputWithResult<T>>;

/**
 * Run the given PowerShell commands from a script file and get the output as a string
 */
function commandsAsScript(
  commands: string,
  useChildProcess?: PowershellOptions['useChildProcess']
): Promise<CommandOutput>;
```

## Licence

[MIT](LICENCE)
