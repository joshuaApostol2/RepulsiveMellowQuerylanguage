const express = require('express');
const request = require('request');
const cheerio = require('cheerio');
const helmet = require('helmet');

const app = express();
app.use(helmet());
app.use(express.json());

const fbConfig = {
    useragent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1",
    loginUrl: "https://mbasic.facebook.com/login.php",
};

app.get('/login', async (req, res) => {
    const { email, password } = req.query;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const appState = await login(email, password);
        return res.json(appState);
    } catch (error) {
        return res.status(500).json(error);
    }
});

async function login(email, password) {
    const headers = { 'user-agent': fbConfig.useragent };
    const jar = request.jar();

    const initialResponse = await sendRequest(fbConfig.loginUrl, headers, jar);
    const $ = cheerio.load(initialResponse);
    const formData = extractFormData($, email, password);

    const loginResponse = await sendPostRequest(fbConfig.loginUrl, headers, formData, jar);
    return parseCookies(jar.getCookies(fbConfig.loginUrl));
}

function sendRequest(url, headers, jar) {
    return new Promise((resolve, reject) => {
        request({ url, headers, jar }, (error, response, body) => {
            if (error) return reject({ error: "Initial request failed" });
            resolve(body);
        });
    });
}

function sendPostRequest(url, headers, formData, jar) {
    return new Promise((resolve, reject) => {
        request.post({ url, headers, form: formData, jar }, (error, response, body) => {
            if (error) return reject({ error: "Login request failed" });
            resolve(body);
        });
    });
}

function extractFormData($, email, password) {
    return {
        lsd: $('input[name="lsd"]').val(),
        jazoest: $('input[name="jazoest"]').val(),
        m_ts: $('input[name="m_ts"]').val(),
        li: $('input[name="li"]').val(),
        try_number: $('input[name="try_number"]').val(),
        unrecognized_tries: $('input[name="unrecognized_tries"]').val(),
        bi_xrwh: $('input[name="bi_xrwh"]').val(),
        email,
        pass: password,
        login: "submit"
    };
}

function parseCookies(cookies) {
    return cookies.map(cookie => ({
        key: cookie.key,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        hostOnly: !cookie.domain.startsWith('.'),
        creation: new Date().toISOString(),
        lastAccessed: new Date().toISOString()
    }));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});