fhwr-unflattener servers the Firefox Hardware Report dataset in the format the
[ensemble-transposer](https://github.com/mozilla/ensemble-transposer) expects.

Eventually, we want the Firefox Hardware Report data to be formatted this way by
default. When that happens, we won't need this project any more.

## Development

### Install

1. Install the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
2. Run `python3 -m venv env`
3. Run `source env/bin/activate`
4. Run `pip install -r requirements.txt`

### Run

1. Run `source env/bin/activate`
3. Run `heroku local`
