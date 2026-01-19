import Debug from 'debug';
import pipe from '../lifts/pipe.js';
import { hour } from '../tools/millis.js';
import alterra from '../tools/alterra.js';

const debug = Debug('liftie:stats');

fetch.interval = {
    active: hour,
    inactive: 12 * hour
};

export default async function fetch(resort, fn) {
    debug('Fetch stats for %s', resort.id);

    // Try to load a specific stats parser
    let parse;
    let descriptor;
    try {
        descriptor = await import(`../resorts/${resort.id}/index.js`);
        parse = descriptor.stats;
    } catch (e) {
        // console.log('No specific stats parser for', resort.id);
    }

    // 1. Try Alterra API if we can find a resortId
    const apiPath = resort.api?.pathname;
    const resortIdMatch = apiPath?.match(/\/feed\/(\d+)\//);
    const resortId = resortIdMatch ? resortIdMatch[1] : null;

    if (resortId) {
        const data = await alterra.api(resortId);
        if (data) {
            return fn(null, data);
        }
    }

    // Fallback to Alterra-style parser as default
    if (!parse) {
        parse = alterra.parse;
    }

    const url = resort.statsUrl || resort.url;

    // If it's a known Alterra/Intrawest resort, we might want to try /the-mountain/mountain-report
    // especially if the main URL is just a generic homepage or landing.
    if (descriptor?.default?.name === 'parse' && !resort.statsUrl) {
        // This is an Intrawest resort, they almost always use this path
        const altUrl = {
            ...url,
            pathname: '/the-mountain/mountain-report'
        };
        pipe(url, parse, (err, data) => {
            if (!err && data && Object.keys(data).length > 0) {
                return fn(null, data);
            }
            pipe(altUrl, parse, fn);
        });
        return;
    }

    pipe(url, parse, fn);
}
