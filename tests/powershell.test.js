// @ts-check

import path from 'path';
import { test } from 'uvu';
import * as assert from 'uvu/assert';

import { command, commandsAsScript } from '../';

test('command() throws for PowerShell errors', async () => {
  try {
    await command('Unknown-Command');
    assert.unreachable('did not throw for incorrect command');
  } catch (err) {
    assert.ok(
      err.message.includes(`The term 'Unknown-Command' is not recognized`)
    );
  }
});

test('command() runs a command and returns output as text', async () => {
  const { result } = await command('Write-Host "hello"');
  assert.is(result, 'hello');
});

test('command() runs a command and provides access to the underlying child process', async () => {
  function asyncTest() {
    return new Promise((resolve, reject) => {
      command('Write-Host "hello"', {
        useChildProcess(child) {
          assert.not.type(child, undefined);
          resolve();
        },
      })
        .then(({ result }) => {
          assert.is(result, 'hello');
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  await asyncTest();
});

test('command() requesting JSON throws for invalid JSON', async () => {
  try {
    await command('Write-Host hello', { convertTo: 'json' });
    assert.unreachable('did not throw for JSON error');
  } catch (err) {
    assert.ok(err.message.includes(`Unexpected token`));
  }
});

test('command() runs a command and returns output as JSON', async () => {
  const directory = path.join(__dirname, 'fixtures');

  // Test a list of results
  {
    const { result } = await command(
      `ls ${directory} | Select-Object Name,DirectoryName`,
      {
        convertTo: 'json',
      }
    );

    assert.equal(result, [
      { Name: 'folder', DirectoryName: null },
      {
        Name: 'file-a.txt',
        DirectoryName: directory,
      },
      {
        Name: 'file-b.md',
        DirectoryName: directory,
      },
    ]);
  }

  // Test a single result
  {
    const fileAPath = path.join(directory, 'file-a.txt');

    const {
      result,
    } = await command(
      `Get-Item ${fileAPath} | Select-Object Name,DirectoryName`,
      { convertTo: 'json' }
    );

    assert.equal(result, {
      Name: 'file-a.txt',
      DirectoryName: directory,
    });
  }

  // Test a single result converted to an array
  {
    const fileAPath = path.join(directory, 'file-a.txt');

    const {
      result,
    } = await command(
      `Get-Item ${fileAPath} | Select-Object Name,DirectoryName`,
      { convertTo: 'json', ensureJsonArray: true }
    );

    assert.equal(result, [
      {
        Name: 'file-a.txt',
        DirectoryName: directory,
      },
    ]);
  }
});

test('command() runs a command and returns output as CSV', async () => {
  const directory = path.join(__dirname, 'fixtures');

  const { result } = await command(
    `ls ${directory} | Select-Object Name,DirectoryName`,
    {
      convertTo: 'csv',
    }
  );

  const expected = [
    `#TYPE Selected.System.IO.DirectoryInfo`,
    `"Name","DirectoryName"`,
    `"folder",`,
    `"file-a.txt","${directory}"`,
    `"file-b.md","${directory}"`,
  ].join('\r\n');

  assert.equal(result, expected);
});

test('command() runs a command and returns output as HTML', async () => {
  const directory = path.join(__dirname, 'fixtures');

  // Test a list of results
  {
    const { result } = await command(
      `ls ${directory} | Select-Object Name,DirectoryName`,
      {
        convertTo: 'html',
      }
    );

    const expected = [
      `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"  "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">`,
      `<html xmlns="http://www.w3.org/1999/xhtml">`,
      `<head>`,
      `<title>HTML TABLE</title>`,
      `</head><body>`,
      `<table>`,
      `<colgroup><col/><col/></colgroup>`,
      `<tr><th>Name</th><th>DirectoryName</th></tr>`,
      `<tr><td>folder</td><td></td></tr>`,
      `<tr><td>file-a.txt</td><td>${directory}</td></tr>`,
      `<tr><td>file-b.md</td><td>${directory}</td></tr>`,
      `</table>`,
      `</body></html>`,
    ].join('\r\n');

    assert.equal(result, expected);
  }
});

test('commandsAsScript() throws for PowerShell errors', async () => {
  const { stderr } = await commandsAsScript('Unknown-Command');
  assert.ok(stderr.includes(`The term 'Unknown-Command' is not recognized`));
});

test('commandsAsScript() runs one or more commands from a script file returns output as text', async () => {
  // Test simple case
  {
    const { stdout } = await commandsAsScript('Write-Host hello');
    assert.is(stdout, 'hello');
  }

  // A very long command that would fail using command(), since it exceeds the max argument length
  {
    const directory = path.join(__dirname, 'fixtures');
    const fileAPath = path.join(directory, 'file-a.txt');

    const command = `Get-Item ${fileAPath} | Select-Object Name,DirectoryName | ConvertTo-Json;`;
    const commands = [command, command, command, command, command].join(
      `Write-Host ',';\r\n`
    );

    const { stdout } = await commandsAsScript(commands);

    const file = {
      Name: 'file-a.txt',
      DirectoryName: directory,
    };

    const expected = [file, file, file, file, file];

    assert.equal(JSON.parse(`[${stdout}]`), expected);
  }
});

test('commandsAsScript() runs one or more commands and provides access to the underlying child process', async () => {
  function asyncTest() {
    return new Promise((resolve, reject) => {
      commandsAsScript('Write-Host "hello"', (child) => {
        assert.not.type(child, undefined);
        resolve();
      })
        .then(({ stdout }) => {
          assert.is(stdout, 'hello');
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  await asyncTest();
});

test.run();
