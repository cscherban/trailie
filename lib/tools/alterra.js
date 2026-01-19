import select from '../select.js';
import * as domutil from './domutil.js';

async function fetchFromApi(resortId) {
    try {
        const url = `http://alerts.quicktrax.com/feed?resortId=${resortId}&format=json`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();

        if (!data.SnowReport) return null;

        const sr = data.SnowReport;
        return {
            lifts: { open: sr.TotalOpenLifts, total: sr.TotalLifts },
            trails: { open: sr.TotalOpenTrails, total: sr.TotalTrails },
            groomed: sr.GroomedTrails,
            acres: { open: parseInt(sr.OpenTerrainAcres), total: parseInt(sr.TotalTerrainAcres) },
            parks: { open: sr.TotalOpenParks, total: sr.TotalParks },
            baseDepth: parseInt(sr.BaseArea?.BaseIn || sr.SnowBaseRangeIn || 0)
        };
    } catch (e) {
        console.error('Alterra API fail:', e);
        return null;
    }
}

export function parseStats(dom) {
    const stats = {};
    const items = select(dom, '.StatsWidget_statItem__yJzYz');

    if (items.length === 0) {
        return null;
    }

    items.forEach(node => {
        const labelNode = select(node, 'h6')[0];
        const bigNode = select(node, '.StatsWidget_statBig__JTduy')[0];
        const smallNode = select(node, '.StatsWidget_statSmall__baFbG')[0];

        if (labelNode && bigNode) {
            const label = domutil.allText(labelNode).trim().toLowerCase();
            const big = domutil.allText(bigNode).trim();
            const smallText = smallNode ? domutil.allText(smallNode).trim() : '';

            const totalMatch = smallText.match(/\/ (\d+)/);
            const total = totalMatch ? parseInt(totalMatch[1]) : null;

            if (label.includes('lifts')) {
                stats.lifts = { open: parseInt(big), total };
            } else if (label.includes('trails')) {
                stats.trails = { open: parseInt(big), total };
            } else if (label.includes('groomed')) {
                stats.groomed = parseInt(big);
            } else if (label.includes('acres')) {
                stats.acres = { open: parseInt(big), total };
            } else if (label.includes('parks')) {
                stats.parks = { open: parseInt(big), total };
            }
        }
    });

    // Basic snow depth extraction attempt
    const snowNode = select(dom, '[class*="SnowReport_depth"]')[0];
    if (snowNode) {
        const snowText = domutil.allText(snowNode).trim();
        const snowMatch = snowText.match(/(\d+)/);
        if (snowMatch) {
            stats.baseDepth = parseInt(snowMatch[1]);
        }
    }

    return Object.keys(stats).length > 0 ? stats : null;
}

export default {
    parse: parseStats,
    api: fetchFromApi
};
