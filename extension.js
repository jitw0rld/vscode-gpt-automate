const vscode = require('vscode');
const openai = require('openai');
const os = require('os');
const configuration = new openai.Configuration({
    organization: 'org-5SQeLQ8rfWqdoiHmo77XPzir',
    apiKey: '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' // dont steal pls :D
});
const openapi = new openai.OpenAIApi(configuration);
const path = require('path');
let workspaceFiles = '';
const PRE_PROMPT = `You are converting prompts into commands. Here are the 6 possible commands:

'NEW_FILE "path/to/file.txt"',
'NEW_FOLDER "path/to/folder"',
'DEL_FILE "file.txt"',
'WRITE_TO_FILE "path/to/file.txt" "content"'
'EXECUTE_COMMAND "shell_command"'
'INVALID_REQUEST "reason"'

DO NOT reply with anything other than those 6 commands. You can reply with any command to obey the prompt for EXECUTE_COMMAND.
The user does not need to be specific so fill in all gaps with reasonable assumptions.
If parts of text cannot be converted into one of those commands, write INVALID_REQUEST "(reason)" and explain why.
Add files according to what is needed in the prompt. Commands are delimited with "~."
Folders are created recursively.
If file or folder names are not given, make appropriate assumptions about what to create.
Prefix unspecified paths with ./ because the current working directory is where files will be created.
Do not add single quotes to code or file names. Try to format all code correctly.
The user does not need to be specific. Fill in all gaps with reasonable assumptions.
Do not minify code, try to format it as much as possible with tabs and newline chars. 

Example prompt: "Setup the files for an express app in nodejs."
NEW_FOLDER "./public"~.NEW_FOLDER "./public/css"~.NEW_FOLDER "./public/js"~.NEW_FILE "./public/index.html"~.NEW_FILE "./public/js/script.js"~.NEW_FILE "./public/css/styles.css"~.WRITE_TO_FILE "./public/index.html" "<h1>My Example Application</h1>"~.WRITE_TO_FILE "./public/js/script.js" "console.log('Hello, world!');"~.WRITE_TO_FILE "./public/css/styles.css" "body { background-color: #000; }"~.EXECUTE_COMMAND "npm init -y"~.EXECUTE_COMMAND "npm install express"~.NEW_FILE "./index.js"

Example 2: "Initialize a C app"
NEW_FOLDER "./c-app"~.NEW_FILE "./c-app/main.c"~.WRITE_TO_FILE "./c-app/main.c" "int #include <stdio.h>\nint main() {\n\tprintf("Hello, world!");\n\n\treturn 0;\n}"\n
`;

let CTX_PROMPT = `Files currently in the workspace: ${workspaceFiles}`;

/**
 * @param {{ subscriptions: vscode.Disposable[]; }} context
 */
function activate(context) {
    let disposable = vscode.commands.registerCommand(
        'vscode-gpt-automate.prompt',
        async () => {
            const input = await vscode.window.showInputBox({
                placeHolder: 'Setup the files for an express app in nodejs.',
                prompt: 'Please enter some text to process with the VSCode GPT Automate extension'
            });
            if (input) {
                vscode.window.showInformationMessage(
                    `Processing input: '${input}'...`
                );
                await getWorkspaceFiles();
                console.warn('Context Prompt: ', CTX_PROMPT);
                const result = await queryApi(input);
                await parseCommands(result);
            }
        }
    );
    context.subscriptions.push(disposable);
}

async function queryApi(text) {
    // Query
    let res = '';
    await openapi
        .createChatCompletion({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'user',
                    content: PRE_PROMPT + CTX_PROMPT + ` Your Prompt: ${text}`
                }
            ]
        })
        .then(
            data => {
                res = data.data.choices[0].message.content;
            },
            error => {
                vscode.window.showErrorMessage(
                    `Error querying OpenAI API: ${error.message}`
                );
                console.log('\n\nERROR QUERYING OPENAI vvvvvvvvv\n\n');
                console.error(error.response.data);
            }
        );

    return res;
}

async function parseCommands(result) {
    // Commands:
    // NEW_FILE "path/to/file.txt"
    // NEW_FOLDER "path/to/folder"
    // DEL_FILE "file.txt"
    // WRITE_TO_FILE "path/to/file.txt" "content"
    // EXECUTE_COMMAND "shell_command"
    // INVALID_REQUEST "reason"

    let commands = result.split('~.');
    commands = commands.filter(command => command !== ''); // Remove empty lines
    // if any commands start with a . remove the .
    // The AI does this sometimes. Working on a fix
    commands = commands.map(command => {
        if (command.startsWith('.')) {
            command = command.slice(1);
        }

        return command;
    });

    commands = commands.map(command => {
        const commandType = command.split(' ')[0];
        let commandArgs = command.split(' ').slice(1);
        // remove double quotes but only if they are at the start and end of the string
        commandArgs = commandArgs.map((/** @type {string} */ arg) => {
            if (arg.startsWith('"')) {
                arg = arg.slice(1);
            }

            if (arg.endsWith('"')) {
                arg = arg.slice(0, -1);
            }

            return arg;
        });

        return {
            type: commandType,
            args: commandArgs
        };
    }); // Split commands into type and args
    for (let i = 0; i < commands.length; i++) {
        const command = commands[i];
        if (command.type === 'NEW_FILE') {
            await handleNewFileCommand(command.args.join(' '));
        } else if (command.type === 'NEW_FOLDER') {
            await handleNewFolderCommand(command.args.join(' '));
        } else if (command.type === 'DEL_FILE') {
            await handleDelFileCommand(command.args.join(' '));
        } else if (command.type === 'WRITE_TO_FILE') {
            await handleWriteToFileCommand(
                command.args[0],
                command.args.slice(1).join(' ')
            );
        } else if (command.type === 'EXECUTE_COMMAND') {
            handleExecuteCommand(command.args.join(' '));
        } else if (command.type === 'INVALID_REQUEST') {
            handleInvalidRequest(command.args.join(' '));
        } else {
            vscode.window.showErrorMessage(
                `GPT returned an invalid command: ${command.type} (Make an issue on GitHub if this happens a lot!)`
            );
        }
    }

    vscode.window.showInformationMessage(`Completed ${commands.length} tasks!`);

    return;
}

async function handleNewFileCommand(filePath) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        const rootFolder = workspaceFolders[0].uri;
        const fileUri = vscode.Uri.joinPath(rootFolder, filePath);
        await vscode.workspace.fs.writeFile(fileUri, new Uint8Array([])).then(
            () => {
                vscode.window.showInformationMessage(
                    `Created new file ${filePath}`
                );
            },
            error => {
                vscode.window.showErrorMessage(
                    `Error creating file ${filePath}: ${error.message}`
                );
            }
        );
    } else {
        vscode.window.showErrorMessage('Error: No workspace folder found.');
    }
}

async function handleNewFolderCommand(folderPath) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        const rootFolder = workspaceFolders[0].uri;
        const folderUri = vscode.Uri.joinPath(rootFolder, folderPath);
        await vscode.workspace.fs.createDirectory(folderUri).then(
            () => {
                return;
            },
            error => {
                vscode.window.showErrorMessage(
                    `Error creating folder ${folderPath}: ${error.message}`
                );
            }
        );
    } else {
        vscode.window.showErrorMessage('Error: No workspace folder found.');
    }
}

async function handleDelFileCommand(filePath) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        const rootFolder = workspaceFolders[0].uri;
        const fileUri = vscode.Uri.joinPath(rootFolder, filePath);
        await vscode.workspace.fs.delete(fileUri, { recursive: false }).then(
            () => {},
            error => {
                vscode.window.showErrorMessage(
                    `Error deleting file ${filePath}: ${error.message}`
                );
            }
        );
    } else {
        vscode.window.showErrorMessage('Error: No workspace folder found.');
    }
}

async function handleWriteToFileCommand(filePath, content) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        const rootFolder = workspaceFolders[0].uri;
        const fileUri = vscode.Uri.joinPath(rootFolder, filePath);
        const contentBytes = new TextEncoder().encode(content);
        await vscode.workspace.fs.writeFile(fileUri, contentBytes).then(
            () => {},
            error => {
                vscode.window.showErrorMessage(
                    `Error writing to file ${filePath}: ${error.message}`
                );
            }
        );
    } else {
        vscode.window.showErrorMessage('Error: No workspace folder found.');
    }
}

function handleExecuteCommand(command) {
    const terminal = vscode.window.createTerminal();
    terminal.sendText(command.trim().replace('"', ''));
    terminal.show();
}

function handleInvalidRequest(reason) {
    vscode.window.showErrorMessage(
        `An action could not be completed. Reason: "${reason}"`
    );
}

async function getWorkspaceFiles() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        return;
    }

    const files = await vscode.workspace.findFiles(
        '**/*',
        '**/node_modules/**' // exclude node_modules
    );

    const fileNames = files.map(file => {
        return `'${path.relative(vscode.workspace.rootPath, file.fsPath)}'`;
    });

    const workspaceFiles = `${fileNames.join('\n')}\n`;
    CTX_PROMPT = `Files currently in the workspace: ${workspaceFiles}`;
    console.log('Workspace Files:' + workspaceFiles);
}

getWorkspaceFiles();

exports.activate = activate;
exports.queryApi = queryApi;
exports.parseCommands = parseCommands;
exports.handleNewFileCommand = handleNewFileCommand;
