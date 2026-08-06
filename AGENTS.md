# Repository agent notes

## Releases

- Do not block or poll for the Windows installer during a release. Publishing
  the GitHub release triggers the Windows workflow; let it attach the installer
  asynchronously unless the user explicitly asks for its status.
