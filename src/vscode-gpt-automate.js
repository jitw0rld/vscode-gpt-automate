// src/vscode-gpt-automate.js
const vscode = require('vscode');
const path = require('path');
const { queryApi } = require('./api.js');
const { parseCommands } = require('./commands.js');

let workspaceFiles = '';

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
                    async progress => {
                        progress.report({
                            increment: 0,
                            message: 'Getting workspace files...'
                        });
                        await getWorkspaceFiles();
                        progress.report({
                            increment: 50,
                            message: 'Waiting for AI to complete prompt...'
                        });
                        const result = await queryApi(input, workspaceFiles);
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
