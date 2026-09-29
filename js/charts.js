import { escapeHtml } from "./format.js";
export function lineChart(values, label) {
    const width = 280;
    const height = 78;
    const pad = 8;
    const title = escapeHtml(label);
    const nums = values.filter((value) => value !== null && Number.isFinite(value));
    if (!nums.length) {
        return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}: Unavailable"><title>${title}: Unavailable</title><text x="12" y="44" fill="currentColor">Unavailable</text></svg>`;
    }
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const span = max - min || 1;
    const runs = [];
    let current = [];
    values.forEach((value, index) => {
        if (value === null || !Number.isFinite(value)) {
            if (current.length)
                runs.push(current);
            current = [];
            return;
        }
        const x = pad + (index / Math.max(values.length - 1, 1)) * (width - pad * 2);
        const y = pad + (1 - (value - min) / span) * (height - pad * 2);
        current.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    });
    if (current.length)
        runs.push(current);
    const paths = runs
        .map((run) => `<polyline points="${run.join(" ")}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>`)
        .join("");
    const caption = `${title}. Minimum ${min.toFixed(1)}, maximum ${max.toFixed(1)}. Gaps are missing values.`;
    return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(caption)}"><title>${escapeHtml(caption)}</title>${paths}</svg>`;
}
