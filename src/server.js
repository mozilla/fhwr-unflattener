import restify from 'restify';
import restifyCORSMiddleware from 'restify-cors-middleware';

import unflatten from './unflatten';


const server = restify.createServer();
const port = process.env.PORT || 8000;

function respond(req, res, next) {
    unflatten('https://analysis-output.telemetry.mozilla.org/game-hardware-survey/data/hwsurvey-weekly.json', output => {
        res.send(output);
    });

    next();
}

const cors = restifyCORSMiddleware({
    origins: ['*'],
});

server.pre(cors.preflight);
server.pre(cors.actual);

server.get('/', respond);

server.listen(port, function() {
    console.log('%s listening at %s', server.name, server.url);
});
