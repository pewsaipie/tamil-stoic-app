exports.handler = async () => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify({ status: 'ok', service: 'tamil-stoic-api', version: '1.0', timestamp: new Date().toISOString() })
});
