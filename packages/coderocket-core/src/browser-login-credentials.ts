const CREDENTIAL_PREFIX = 'coderocket-login-'

export interface BrowserLoginCredential {
  loginUrl: string
  password: string
  username: string
}

/** Separate encrypted browser-login fields from normal outbound request headers. */
export function readBrowserLoginCredential(
  values: Record<string, string>
): BrowserLoginCredential | undefined {
  const loginUrl = values[`${CREDENTIAL_PREFIX}url`]
  const username = values[`${CREDENTIAL_PREFIX}username`]
  const password = values[`${CREDENTIAL_PREFIX}password`]
  if (!(loginUrl && username && password)) return
  return { loginUrl, password, username }
}

/** Serialize a dedicated test account into the existing encrypted string-record envelope. */
export function writeBrowserLoginCredential(
  credential: BrowserLoginCredential
): Record<string, string> {
  return {
    [`${CREDENTIAL_PREFIX}url`]: credential.loginUrl,
    [`${CREDENTIAL_PREFIX}password`]: credential.password,
    [`${CREDENTIAL_PREFIX}username`]: credential.username
  }
}
