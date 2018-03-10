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
        callback(modifyPopulations(format(flatData)));
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

function modifyPopulations(data) {
    const populationModifications = JSON.parse(fs.readFileSync(path.resolve('src/population-modifications.json'), 'utf8'));

    // For each entry
    data.default.forEach((entry, index) => {

        // For each metric NAME in that entry
        Object.keys(entry.metrics).forEach(metricName => {
            if (!(metricName in populationModifications)) return;

            // For each new population NAME for that metric
            Object.keys(populationModifications[metricName]).forEach(newPopulationName => {
                let total = 0;
                let processed = false;

                // For each group member NAME of that new population
                populationModifications[metricName][newPopulationName].forEach(groupMember => {

                    if (newPopulationName !== '__REMOVE__') {
                        if (groupMember in entry.metrics[metricName]) {
                            processed = true;
                            total = decimal(total).add(entry.metrics[metricName][groupMember]).toNumber();
                        }
                    }

                    delete entry.metrics[metricName][groupMember];
                });

                if (processed) {
                    entry.metrics[metricName][newPopulationName] = total;
                }

            }); // For each new population NAME for that metric

        }); // For each metric NAME in that entry

    }); // For each entry

    return data;
}
