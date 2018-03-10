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

    // For each entry in the formatted data
    data.default.forEach((entry, index) => {

        // For each metric NAME in that entry
        Object.keys(entry.metrics).forEach(metricName => {
            if (metricName in populationModifications) {

                // Process removals
                if (populationModifications[metricName].removals) {
                    populationModifications[metricName].removals.forEach(populationToBeRemoved => {
                        delete entry.metrics[metricName][populationToBeRemoved];
                    });
                }

                // Process renames
                if (populationModifications[metricName].renames) {
                    populationModifications[metricName].renames.forEach(renameMeta => {
                        entry.metrics[metricName][renameMeta.to] = entry.metrics[metricName][renameMeta.from];
                        delete entry.metrics[metricName][renameMeta.from];
                    });
                }

                // Process replacement groups
                if (populationModifications[metricName].replacementGroups) {
                    populationModifications[metricName].replacementGroups.forEach(rg => {
                        let combinedPopulationsValue = 0;
                        let processedAtLeastOneMember = false;

                        rg.members.forEach(populationToSubsume => {
                            if (populationToSubsume in entry.metrics[metricName]) {
                                processedAtLeastOneMember = true;
                                combinedPopulationsValue = decimal(combinedPopulationsValue).add(entry.metrics[metricName][populationToSubsume]).toNumber();
                                delete entry.metrics[metricName][populationToSubsume];
                            }
                        });

                        if (processedAtLeastOneMember) {
                            entry.metrics[metricName][rg.name] = combinedPopulationsValue;
                        }
                    });
                }

            }

        }); // For each metric NAME in that entry

    }); // For each entry

    return data;
}
