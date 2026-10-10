# How to debug Bridge/Extension connection

## Preconditions

You have the installed executable, Extension and the same intended version.

## Steps

1. Check whether the local Bridge health endpoint responds:

   ```powershell
   Invoke-RestMethod http://127.0.0.1:32145/v1/health
   ```

2. Check Edge/Chrome extension status, native host registration and executable location.
3. After replacing an Extension package, reload it and reopen the side panel / Web Console.
4. Use **日志** and **任务** to inspect connection errors without dumping cookies or tokens.
5. For source-level diagnosis, run `devtool config validate` and `devtool project inspect --json` from the engine root.

## Verify

Both Extension and local Console report connected state and show the same version. If the Web Console is visible but cannot access authenticated operations, ensure the Extension is enabled; the browser relay is required by design.

See [Bridge concepts](../concepts/bridge-and-state.md) and [Configuration Reference](../reference/configuration.md).
