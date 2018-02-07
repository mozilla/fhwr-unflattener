import falcon
import json
from falcon_cors import CORS
from urllib.request import urlopen


class Unflattened:
    def on_get(self, req, res):
        source_url = 'https://analysis-output.telemetry.mozilla.org/game-hardware-survey/data/hwsurvey-weekly.json'
        source_data = json.loads(urlopen(source_url).read())

        pretransposed_data = []

        for day in source_data:
            metrics_dict = {}
            day_dict = {'metrics': metrics_dict}
            for k, v in day.items():
                k_split = k.split('_', 1)
                if len(k_split) == 1:
                    # it's metadata
                    day_dict[k] = v
                else:
                    # it's a metric
                    metric_name = k_split[0]
                    if metric_name == "cpuCoresSpeed":
                        # these aren't used and are janky
                        continue
                    bucket_name = k_split[1]
                    metric_dict = metrics_dict.get(metric_name, None)
                    if metric_dict is None:
                        metric_dict = dict()
                        metrics_dict[metric_name] = metric_dict
                    metric_dict[bucket_name] = v
            pretransposed_data.append(day_dict)

        res.media = { "data": pretransposed_data }

cors = CORS(allow_all_origins=True,
            allow_all_headers=True,
            allow_methods_list=['GET'])
api = falcon.API(middleware=[cors.middleware])

# Routes
api.add_route('/', Unflattened())
