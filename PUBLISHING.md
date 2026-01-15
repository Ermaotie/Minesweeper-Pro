# Publishing to VS Code Marketplace

## Prerequisites

1.  **Node.js** installed.
2.  **vsce** installed globally:
    ```bash
    npm install -g vsce
    ```
3.  **Azure DevOps Account** (for Personal Access Token).
4.  **Publisher Account** created on the [VS Code Marketplace Management Portal](https://marketplace.visualstudio.com/manage).

## Preparation

1.  **Update `package.json`**:
    - Change `"publisher": "antigravity"` to your actual publisher ID.
    - Add `"repository"` field (required for verification).
    - Ensure `icon` (e.g., `icon.png` 128x128) is present if you want a logo.
2.  **Review `.vscodeignore`**:
    - Ensure only necessary files (`extension.js`, `package.json`, `index.html`, `css/`, `js/`) are included.

## Packaging

To create a `.vsix` file for testing or manual distribution:

```bash
vsce package
```

This will generate `clearbomb-1.0.0.vsix`. You can install this in VS Code via "Install from VSIX...".

## Publishing

1.  **Login**:
    ```bash
    vsce login <publisher id>
    ```
2.  **Publish**:
    ```bash
    vsce publish
    ```

## Updating your Extension

To release a new version (e.g., after changing the README):

1.  **Bump Version**: Update the `"version"` field in `package.json`.
    -   Example: Change `"1.0.0"` to `"1.0.1"`.
    -   Or use: `npm version patch`
2.  **Publish**:
    ```bash
    vsce publish
    ```
    This will automatically package and upload the new version to the Marketplace.

## Automated Publishing (GitHub Actions)
If you host this on GitHub, you can set up actions to auto-publish on tag creation.
