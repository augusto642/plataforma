const baseUrl = 'http://piston:2000/api/v2/packages';
const runtimes = [
  { language: 'node', version: '20.11.1' },
  { language: 'python', version: '3.12.0' },
  { language: 'java', version: '15.0.2' },
];

const listResponse = await fetch(baseUrl);
if (!listResponse.ok) {
  throw new Error(`Piston package list failed with HTTP ${listResponse.status}`);
}

const packages = await listResponse.json();
if (!Array.isArray(packages)) {
  throw new Error('Piston returned an invalid package list');
}

for (const runtime of runtimes) {
  const isInstalled = packages.some(
    (item) =>
      item?.language === runtime.language &&
      item?.language_version === runtime.version &&
      item?.installed === true,
  );
  if (isInstalled) {
    console.log(`Piston runtime already installed: ${runtime.language}@${runtime.version}`);
    continue;
  }

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(runtime),
  });
  if (!response.ok) {
    throw new Error(
      `Piston runtime install failed for ${runtime.language}@${runtime.version}: HTTP ${response.status}`,
    );
  }
  console.log(`Installed Piston runtime: ${runtime.language}@${runtime.version}`);
}
