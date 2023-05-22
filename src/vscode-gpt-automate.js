const vscode = require('vscode');
const path = require('path');
const { queryApi } = require('./api.js');
const { parseCommands, getWorkspaceRootFolder } = require('./commands.js');

let workspaceFiles = '';

/**
 * @param {{ subscriptions: vscode.Disposable[]; }} context
 */
function activate(context) {
    let disposable = vscode.commands.registerCommand(
        'vscode-gpt-automate.prompt',
        runCommand
    );
    context.subscriptions.push(disposable);
}

async function runCommand() {
    const input = await getInputFromUser();

    if (!input) return;

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Processing prompt...',
            cancellable: false
        },
        progressTask.bind(null, input)
    );

    vscode.window.showInformationMessage('Done!');
}

async function getInputFromUser() {
    return await vscode.window.showInputBox({
        placeHolder: 'Setup the files for an express app in nodejs.',
        prompt: 'Please enter a task to complete using AI.',
        ignoreFocusOut: true,
        valueSelection: [0, 0],
        validateInput: text => {
            if (text.length === 0) {
                return 'Please enter a task to complete using AI.';
            }
            return null;
        }
    });
}

async function progressTask(input, progress) {
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

    if (result.trim().toUpperCase().startsWith('RFC')) {
        await handleRFC(result, input, progress);
    } else {
        progress.report({
            increment: 95,
            message: 'Processing result...'
        });
        await parseCommands(result);
        progress.report({ increment: 100 });
    }
}

async function handleRFC(result, input, progress) {
    progress.report({
        increment: 65,
        message: 'Handling request for file content...'
    });

    const rootFolder = getWorkspaceRootFolder();
    if (!rootFolder) return;

    const pathFromRFC = getPathFromRFC(result);

    const fileUri = getUriForFile(rootFolder, pathFromRFC);
    const text = await readFile(fileUri);

    progress.report({
        increment: 80,
        message: 'Waiting for AI to respond to file content context...'
    });

    const rfcReply = await queryApi(input, workspaceFiles, true, text);
    progress.report({
        increment: 95,
        message: 'Processing result...'
    });

    console.log('rfc reply', rfcReply);
    await parseCommands(rfcReply);
    progress.report({ increment: 100 });
}

function getPathFromRFC(result) {
    // Get the path
    // The message is in the format: RFC "path/to/file" (other text)
    // Only get the path
    return result.trim().split('"')[1].trim();
}

function getUriForFile(rootFolder, pathFromRFC) {
    return vscode.Uri.joinPath(rootFolder, pathFromRFC);
}

async function readFile(fileUri) {
    return new TextDecoder().decode(
        await vscode.workspace.fs.readFile(fileUri)
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
        return `'./${path.relative(vscode.workspace.rootPath, file.fsPath)}'`;
    });

    workspaceFiles = `${fileNames.join('\n')}\n`;
}

getWorkspaceFiles();

exports.activate = activate;
