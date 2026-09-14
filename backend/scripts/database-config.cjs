// Share connection-string handling between the API, migrations and connectivity checks.
function databaseOptions(connectionString, max = 3) {
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get("sslmode");
  const channelBinding = url.searchParams.get("channel_binding");
  const neon = url.hostname.endsWith(".neon.tech");
  const tls = neon || (sslMode !== null && sslMode !== "disable");
  // pg's URI parser can overwrite explicit SSL settings; apply verified TLS ourselves.
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  return {
    connectionString: url.toString(),
    max,
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 10000,
    ssl: tls ? { rejectUnauthorized: true } : false,
    enableChannelBinding: channelBinding !== "disable",
  };
}
module.exports = { databaseOptions };
