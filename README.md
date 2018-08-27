fhwr-unflattener serves the Firefox Hardware Report dataset in the format the
[ensemble-transposer](https://github.com/mozilla/ensemble-transposer) expects.

## Development

### Install

`npm install`

### Run

#### Locally

`npm run dev`

#### In production

`npm start`

### Test

Run `npm test`

### Notes

#### Versioning

To adhere to [Dockerflow](https://github.com/mozilla-services/Dockerflow), we
maintain a version number for this project. We try to update it when we deploy
new code. The version number is specified in package.json.

The number looks like a semantic version number, but [semver isn't suitable for
applications](https://softwareengineering.stackexchange.com/a/255201). We
instead follow this basic guideline: the first number is incremented for major
changes, the second number is incremented for medium changes, and the third
number is incremented for small changes.
