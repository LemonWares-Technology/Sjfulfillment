// Deprecated Twilio helper. The project has migrated to Vonage Voice API.
// This module intentionally throws if used to prevent accidental coupling.

export async function sendSms(): Promise<never> {
  throw new Error('Twilio is deprecated in this project. Use the Vonage integration instead.')
}

export async function makeCall(): Promise<never> {
  throw new Error('Twilio is deprecated in this project. Use the Vonage integration instead.')
}

const deprecatedClient: null = null
export default deprecatedClient
