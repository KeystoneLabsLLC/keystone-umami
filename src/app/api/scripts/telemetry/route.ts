// Telemetry is permanently disabled in the Keystone fork.
export async function GET() {
  return new Response('/* telemetry disabled */', {
    headers: {
      'content-type': 'text/javascript',
    },
  });
}
