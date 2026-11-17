# Project environment

On this Windows machine, Node.js and npm are installed through NVM for Windows. The active NVM shim may not work in the agent's shell even when Node works in the user's PowerShell session. If `node` or `npm` reports that no active version is configured, prepend the installed version directory to the current process PATH:

```powershell
$env:Path = "C:\Users\hoant\AppData\Local\Author Software\nvm\installs\v24.22.2;$env:Path"
node -v
npm -v
```

Verified on 2026-11-11: Node.js v24.22.2 and npm 11.19.1. If that directory no longer exists, inspect `C:\Users\hoant\AppData\Local\Author Software\nvm\installs` for the currently installed version.

## UI design

The project's UI design is in [Penpot](https://design.penpot.app/?screen=workspace&team-id=d3aee43a-8d21-8092-8008-e84bb59ece6c&file-id=d3aee43a-8d21-8092-8008-e85259a3f418&page-id=d3aee43a-8d21-8092-8008-e85259a3f419&layout=layers).
