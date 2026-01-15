const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

function activate(context) {
    let disposable = vscode.commands.registerCommand('clearbomb.start', function () {
        const panel = vscode.window.createWebviewPanel(
            'clearbomb',
            'Minesweeper',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'css')), vscode.Uri.file(path.join(context.extensionPath, 'js'))]
            }
        );

        const indexPath = path.join(context.extensionPath, 'index.html');

        fs.readFile(indexPath, 'utf8', (err, html) => {
            if (err) {
                vscode.window.showErrorMessage('Could not load Minesweeper!');
                return;
            }

            // Get path to resource on disk
            const cssPathOnDisk = vscode.Uri.file(path.join(context.extensionPath, 'css', 'style.css'));
            const jsPathOnDisk = vscode.Uri.file(path.join(context.extensionPath, 'js', 'app.js'));

            // Get the special URI to use with the webview
            const cssUri = panel.webview.asWebviewUri(cssPathOnDisk);
            const jsUri = panel.webview.asWebviewUri(jsPathOnDisk);

            // Replace paths in HTML
            // We use a simple regex replacing because we know the structure.
            // Replace <link rel="stylesheet" href="css/style.css">
            // Replace <script src="js/app.js"></script>

            let updatedHtml = html
                .replace('href="css/style.css"', `href="${cssUri}"`)
                .replace('src="js/app.js"', `src="${jsUri}"`);

            panel.webview.html = updatedHtml;
        });
    });

    context.subscriptions.push(disposable);
}

function deactivate() { }

module.exports = {
    activate,
    deactivate
}
