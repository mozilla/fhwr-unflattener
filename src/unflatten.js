import request from 'request';
import decimal from 'decimal';


export default (sourceURL, callback) => {
    request(sourceURL, (error, response, body) => {
        if (error) {
            return callback({
                error: 'Cannot fetch ' + source,
            });
        }

        const output = {
            'default': [],
        };

        const sourceData = JSON.parse(body);

        sourceData.forEach((day, index) => {
            const metrics = {};
            const entry = { metrics };

            Object.keys(day).forEach(key => {
                const value = sourceData[index][key];
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

        callback(output);
    });
}
