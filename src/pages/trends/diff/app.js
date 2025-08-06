const JSON_BASE_PATH = '../../../data/';

document.addEventListener('DOMContentLoaded', function() {
    const margin = { top: 40, right: 30, bottom: 150, left: 80 };
    const width = 1200 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    const json_path = `${JSON_BASE_PATH}diff.json?t=${Date.now()}`;

    d3.json(json_path).then(function(data) {
        data.sort((a, b) => a.rank_10 - b.rank_10);

        const xScale = d3.scaleBand()
            .domain(data.map(d => d.name))
            .range([0, width])
            .padding(0.2);

        const maxChange = d3.max(data, d => Math.abs(d.position_change));
        const yScale = d3.scaleLinear()
            .domain([-maxChange - 1, maxChange + 1])
            .range([height, 0]);
        
        svg.append("g")
            .attr("transform", `translate(0,${yScale(0)})`)
            .call(d3.axisBottom(xScale))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .attr("text-anchor", "end")
            .attr("dx", "-0.5em")
            .attr("dy", "0.5em");

        svg.append("g")
            .call(d3.axisLeft(yScale));

        svg.append("line")
            .attr("x1", 0)
            .attr("y1", yScale(0))
            .attr("x2", width)
            .attr("y2", yScale(0))
            .attr("stroke", "#999")
            .attr("stroke-width", 1);

        svg.selectAll(".bar")
            .data(data)
            .enter()
            .append("rect")
            .attr("class", d =>
                d.position_change > 0 ? "bar bar-declined" :
                d.position_change < 0 ? "bar bar-improved" : "bar bar-neutral")
            .attr("x", d => xScale(d.name))
            .attr("y", d => d.position_change > 0 ? yScale(0) : yScale(d.position_change))
            .attr("width", xScale.bandwidth())
            .attr("height", d => Math.abs(yScale(d.position_change) - yScale(0)))
            .on("mouseover", function(event, d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 0.9);
                tooltip.html(`${d.name}<br>
                            Рейтинг 1.0: ${d.rank_10}<br>
                            Рейтинг 0.8: ${d.rank_08}<br>
                            Изменение: ${d.position_change > 0 ? '+' : ''}${d.position_change} позиций`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 30) + "px");
            })
            .on("mouseout", function() {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        svg.append("text")
            .attr("transform", `translate(${width/2}, ${height + margin.bottom - 20})`)
            .style("text-anchor", "middle")
            .text("Топ-20 спортсменов (рейтинг 1.0)");

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 20)
            .attr("x", -height/2)
            .style("text-anchor", "middle")
            .text("Изменение позиции");

        const legend = svg.append("g")
            .attr("transform", `translate(${width - 200}, 20)`);

        legend.append("rect")
            .attr("width", 18)
            .attr("height", 18)
            .attr("fill", "#4CAF50");
        legend.append("text")
            .attr("x", 25)
            .attr("y", 9)
            .attr("dy", "0.35em")
            .text("Улучшение позиции")
            .style("font-size", "12px");

        legend.append("rect")
            .attr("y", 25)
            .attr("width", 18)
            .attr("height", 18)
            .attr("fill", "#F44336");
        legend.append("text")
            .attr("x", 25)
            .attr("y", 34)
            .attr("dy", "0.35em")
            .text("Ухудшение позиции")
            .style("font-size", "12px");
    });
});
