const vscode = require('vscode');
const request = require('request');
const path = require('path');

let workspaceFiles = '';

const api = 'https://ethanmrettinger.dev';

/**
 * @param {{ subscriptions: vscode.Disposable[]; }} context
 */
function activate(context) {
    let disposable = vscode.commands.registerCommand(
        'vscode-gpt-automate.prompt',
        async () => {
            const input = await vscode.window.showInputBox({
                placeHolder: 'Setup the files for an express app in nodejs.',
                prompt: 'Please enter a task to complete using AI.'
            });
            if (input) {
                await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: 'Processing prompt...',
                        cancellable: false
                    },
                    async (progress, token) => {
                        progress.report({
                            increment: 0,
                            message: 'Getting workspace files...'
                        });
                        await getWorkspaceFiles();
                        progress.report({
                            increment: 50,
                            message: 'Sending prompt to API...'
                        });
                        const result = await queryApi(input);
                        progress.report({
                            increment: 95,
                            message: 'Processing result...'
                        });
                        await parseCommands(result);
                        progress.report({ increment: 100 });
                    }
                );

                vscode.window.showInformationMessage('Done!');
            }
        }
    );
    context.subscriptions.push(disposable);
}

function getApiKey() {
    const config = vscode.workspace.getConfiguration('vscode-gpt-automate');
    const apiKey = config.get('apiKey');
    return apiKey;
}

/**
 * @param {string} text
 */

async function queryApi(text) {
    const apiKey = vscode.workspace
        .getConfiguration('vscode-gpt-automate')
        .get('apiKey');

    if (!apiKey) {
        vscode.window.showErrorMessage(
            'Error: No API key found. Please set one in the extension settings.'
        );
        return;
    }

    const options = {
        url: `${api}/api`,
        method: 'POST',
        headers: {
            'x-api-key': getApiKey()
        },
        json: {
            prompt: text,
            workspaceFiles: workspaceFiles
        }
    };

    return new Promise((resolve, reject) => {
        request(options, (error, response, body) => {
            // if response has an error, response body will have err property set to true
            console.log('Body: ' + JSON.stringify(body, null, 2));
            console.log(
                'Response body: ' + JSON.stringify(response.body, null, 2)
            );
            if (error) {
                vscode.window.showErrorMessage(`Error: ${error.message}`);
                reject(error);
            } else if (body.err) {
                vscode.window.showErrorMessage(
                    `Error: ${response.body.errMessage}`
                );
                reject(error);
            } else {
                resolve(body);
            }
        });
    });
}

/**
 * @param {string} result
 */
async function parseCommands(result) {
    // Commands:
    // NEW_FILE "path/to/file.txt"
    // NEW_FOLDER "path/to/folder"
    // DEL_FILE "file.txt"
    // WRITE_TO_FILE "path/to/file.txt" "content"
    // EXECUTE_COMMAND "shell_command"
    // INVALID_REQUEST "reason"
    // APPEND_TO_FILE "path/to/file.txt" "content"

    let unmappedCommands = result.split('~.');
    unmappedCommands = unmappedCommands.filter(command => command !== ''); // Remove empty lines
    // if any commands start with a . remove the .
    // The AI does this sometimes. Working on a fix
    unmappedCommands = unmappedCommands.map(command => {
        if (command.startsWith('.')) {
            command = command.slice(1);
        }

        return command;
    });

    let commands = unmappedCommands.map(command => {
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
        } else if (command.type === 'DEL_PATH') {
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
        } else if (command.type === 'MOV_PATH') {
            await handleMovePathCommand(command.args[0], command.args[1]);
        } else if (command.type === 'APPEND_TO_FILE') {
            await handleAppendToFileCommand(
                command.args[0],
                command.args.slice(1).join(' ')
            );
        } else {
            vscode.window.showErrorMessage(
                `OpenAI returned an invalid command: ${command.type} (Make an issue on GitHub if this happens a lot!)`
            );
        }
    }
    return;
}

/**
 * @param {string} filePath
 */
async function handleNewFileCommand(filePath) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        const rootFolder = workspaceFolders[0].uri;
        const fileUri = vscode.Uri.joinPath(rootFolder, filePath);
        await vscode.workspace.fs.writeFile(fileUri, new Uint8Array([])).then(
            () => {},
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

/**
 * @param {string} folderPath
 */
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

/**
 * @param {string} filePath
 */
async function handleDelFileCommand(filePath) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        const rootFolder = workspaceFolders[0].uri;
        const fileUri = vscode.Uri.joinPath(rootFolder, filePath);
        await vscode.workspace.fs.delete(fileUri, { recursive: true }).then(
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

/**
 * @param {string} filePath
 * @param {string} content
 */
async function handleWriteToFileCommand(filePath, content) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        const rootFolder = workspaceFolders[0].uri;
        const fileUri = vscode.Uri.joinPath(rootFolder, filePath);
        content = content.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
        content = content.replace('\\"', '"');
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

/**
 * @param {string} command
 */
function handleExecuteCommand(command) {
    const terminal = vscode.window.createTerminal();
    terminal.sendText(command.trim().replace('"', ''));
    terminal.show();
}

/**
 * @param {string} reason
 */
function handleInvalidRequest(reason) {
    vscode.window.showErrorMessage(
        `One or more action(s) could not be completed. Reason: "${reason}"`
    );
}

/**
 * @param {string} oldPath
 * @param {string} newPath
 */
async function handleMovePathCommand(oldPath, newPath) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        const rootFolder = workspaceFolders[0].uri;
        const oldFileUri = vscode.Uri.joinPath(rootFolder, oldPath);
        const newFileUri = vscode.Uri.joinPath(rootFolder, newPath);
        await vscode.workspace.fs.rename(oldFileUri, newFileUri).then(
            () => {},
            error => {
                vscode.window.showErrorMessage(
                    `Error moving file ${oldPath} to ${newPath}: ${error.message}`
                );
            }
        );
    } else {
        vscode.window.showErrorMessage('Error: No workspace folder found.');
    }
}

async function handleAppendToFileCommand(filePath, content) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        const rootFolder = workspaceFolders[0].uri;
        const fileUri = vscode.Uri.joinPath(rootFolder, filePath);
        try {
            const existingContentBytes = await vscode.workspace.fs.readFile(
                fileUri
            );
            const existingContent = new TextDecoder().decode(
                existingContentBytes
            );

            content = content.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
            content = existingContent + content;
            const contentBytes = new TextEncoder().encode(content);

            await vscode.workspace.fs.writeFile(fileUri, contentBytes);
        } catch (error) {
            vscode.window.showErrorMessage(
                `Error appending to file ${filePath}: ${error.message}`
            );
        }
    } else {
        vscode.window.showErrorMessage('Error: No workspace folder found.');
    }
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
        return `'./${path.relative(vscode.workspace.rootPath, file.fsPath)}'`;
    });

    workspaceFiles = `${fileNames.join('\n')}\n`;
}

getWorkspaceFiles();

exports.activate = activate;
exports.queryApi = queryApi;
exports.parseCommands = parseCommands;
exports.handleNewFileCommand = handleNewFileCommand;
