const request = require('request');
const decimal = require('decimal');
const fs = require('fs');
const path = require('path');


module.exports = (flatURL, cb) => {
    request(flatURL, (error, response, body) => {
        if (error) {
            return cb('Cannot fetch ' + flatURL);
        }

        const flatData = JSON.parse(body);
        cb(null, modifyPopulations(format(flatData)));
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

            // Preserve the date property
            if (key === 'date') {
                entry[key] = value;

            // Ignore "inactive" and "broken", which we don't use
            } else if (key === 'inactive' || key === 'broken') {
                return;

            // Use everything else
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
    const populationModifications = require('./population-modifications.json');

    // For each entry in the formatted data
    data.default.forEach(entry => {

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
                } // if (populationModifications[metricName].replacementGroups) {

                // If there's only one population, make the value of that
                // population the value of the metric.
                // https://github.com/mozilla/workshop/issues/10
                if (typeof entry.metrics[metricName] === 'object' && Object.keys(entry.metrics[metricName]).length === 1) {
                    const value = entry.metrics[metricName][Object.keys(entry.metrics[metricName])[0]];
                    entry.metrics[metricName] = value;
                }

            } // if (metricName in populationModifications)

        }); // For each metric NAME in that entry

    }); // For each entry

    return data;
}
