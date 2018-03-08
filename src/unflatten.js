import request from 'request';
import decimal from 'decimal';
import fs from 'fs';
import path from 'path';


export default (flatURL, callback) => {
    request(flatURL, (error, response, body) => {
        if (error) {
            return callback({
                error: 'Cannot fetch ' + source,
            });
        }

        const flatData = JSON.parse(body);
        callback(groupPopulations(format(flatData)));
    });
}

function format(flatData) {
    const output = {
        'default': [],
    };

    flatData.forEach((day, index) => {
        const metrics = {};
        const entry = { metrics };

        Object.keys(day).forEach(key => {
            const value = flatData[index][key];
            const split = key.split(/_(.+)/);

            // It's metadata
            if (split.length === 1) {
                if (key === 'inactive' || key === 'broken') {
                    // Avoid artifacts from floating point arithmetic when multiplying by 100
                    entry[key] = decimal(value).mul(100).toNumber();
                } else {
                    entry[key] = value;
                }

            // It's a metric
            } else {
                let newMetricName = split[0];

                // These aren't used
                if (newMetricName === 'cpuCoresSpeed') {
                    return;
                }

                // Fix some metric names
                if (newMetricName === 'has') {
                    newMetricName = 'hasUnity';
                }

                let bucketName = split[1];

                // Fix some bucket names
                if (bucketName === 'unity_True') {
                    bucketName = 'True';
                } else if (bucketName === 'unity_False') {
                    bucketName = 'False';
                }

                if (metrics[newMetricName] === undefined) {
                    metrics[newMetricName] = {};
                }

                // Avoid artifacts from floating point arithmetic when multiplying by 100
                metrics[newMetricName][bucketName] = decimal(value).mul(100).toNumber();
            }
        });

        output.default.push(entry);
    });

    return output;
}

function groupPopulations(data) {
    const populationGroups = JSON.parse(fs.readFileSync(path.resolve('src/population-groups.json'), 'utf8'));

    // For each entry
    data.default.forEach((entry, index) => {

        // For each metric NAME in that entry
        Object.keys(data.default[index].metrics).forEach(metricName => {

            if (!(metricName in populationGroups)) return;

            // For each group NAME for that metric
            Object.keys(populationGroups[metricName]).forEach(groupName => {
                let tally = 0;

                // For each group member NAME of that group
                populationGroups[metricName][groupName].forEach(groupMember => {
                    tally = decimal(tally).add(data.default[index].metrics[metricName][groupMember]).toNumber();
                    delete data.default[index].metrics[metricName][groupMember];
                });

                data.default[index].metrics[metricName][groupName] = tally;

            }); // For each group NAME for that metric

        }); // For each metric NAME in that entry

    }); // For each entry

    return data;
}
