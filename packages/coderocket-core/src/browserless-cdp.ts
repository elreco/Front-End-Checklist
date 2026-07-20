/** Send one provider-specific CDP method without weakening the typed browser surface elsewhere. */
export async function sendCustomCdpCommand(
  session: object,
  method: string,
  parameters: Record<string, unknown>
): Promise<unknown> {
  const sender: unknown = Reflect.get(session, 'send')
  if (typeof sender !== 'function') throw new Error('The remote browser control channel is missing')
  return Reflect.apply(sender, session, [method, parameters])
}
