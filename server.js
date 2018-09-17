const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const request = require('request');
const forceSSL = require('express-force-ssl');

const unflatten = require('./unflatten');


const data = 'https://analysis-output.telemetry.mozilla.org/game-hardware-survey/data/hwsurvey-weekly.json';
const port = process.env.PORT || 8000;
const app = express();

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'none'"],
        },
    },
    frameguard: {
        action: 'deny',
    },
    referrerPolicy: {
        policy: 'no-referrer',
    },
}));

if (process.env.NODE_ENV === 'production') {
    app.set('forceSSLOptions', {
        trustXFPHeader: true,
    });
    app.use(forceSSL);
}

app.use(cors());

app.use(morgan('combined'));

app.get('/', (req, res) => {
    unflatten(data, (error, output) => {
        if (error) {
            // eslint-disable-next-line no-console
            console.error('Error: ' + error);
            return res.status(500).send('Error: ' + error);
        }
        res.send(output);
    });
});

app.get('/__version__', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(path.join(__dirname, 'version.json'));
});

app.get('/__heartbeat__', (req, res) => {
    request(data, error => {
        if (error) {
            // eslint-disable-next-line no-console
            console.error('Error: Cannot fetch ' + data);
            return res.status(500).send('Error: Cannot fetch ' + data);
        }
        res.sendStatus(200);
    });
});

app.get('/__lbheartbeat__', (req, res) => {
    res.sendStatus(200);
});

app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Listening on port ${port}...`)
});
