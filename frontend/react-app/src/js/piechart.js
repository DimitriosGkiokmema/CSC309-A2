// Creates a pie chart through D3.js

export function createPieChart({ title, started, ended }) {
    const width = 250;
    const height = 350;   // increase height to fit legend
    const radius = Math.min(width, 250) / 2;

    const data = [
        { label: "Started", value: started },
        { label: "Ended", value: ended },
    ];

    const colors = {
        Started: "#4CAF50", // green
        Ended:   "#F44336"  // red
    };

    // SVG root
    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height);

    // ===== TITLE =====
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text(title);

    // ===== PIE GRAPH =====
    const g = svg.append("g")
        .attr("transform", `translate(${width / 2}, ${height / 3 + 40})`);

    const pie = d3.pie().value(d => d.value);
    const arcs = pie(data);

    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);

    svg.selectAll("text.slice-label")
        .data(pie(data))
        .enter()
        .append("text")
        .attr("class", "slice-label")
        .attr("transform", d => `translate(${arc.centroid(d)})`)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .style("font-size", "12px")
        .style("fill", "#fff")
        .text(d => {
            const total = d3.sum(data.map(d => d.value));
            const pct = (d.data.value / total) * 100;
            return `${pct.toFixed(0)}%`;
        });


    g.selectAll("path")
        .data(arcs)
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", d => colors[d.data.label]);

    // ===== LEGEND =====
    const legend = svg.append("g")
        .attr("transform", `translate(${width / 2 - 60}, ${height - 50})`);

    data.forEach((d, i) => {
        const row = legend.append("g")
            .attr("transform", `translate(0, ${i * 20})`);

        // color box
        row.append("rect")
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", colors[d.label]);

        // label
        row.append("text")
            .attr("x", 18)
            .attr("y", 10)
            .attr("font-size", "12px")
            .text(d.label);
    });

    return svg.node();
}

