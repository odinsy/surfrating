const JSON_BASE_PATH = '../../../data/';

document.addEventListener('DOMContentLoaded', function() {
    const margin = { top: 60, right: 30, bottom: 120, left: 80 };
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
        const maxChange = Math.max(
            Math.abs(d3.max(data, d => d.position_change)),
            Math.abs(d3.min(data, d => d.position_change))
        ) * 1.1;

        const xScale = d3.scaleBand()
            .domain(data.map(d => d.name))
            .range([0, width])
            .padding(0.3);

        const yScale = d3.scaleLinear()
            .domain([-maxChange, maxChange])
            .range([height, 0]);

        const xAxis = svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .attr("text-anchor", "end")
            .attr("dx", "-0.5em")
            .attr("dy", "0.5em");

        svg.append("g")
            .call(d3.axisLeft(yScale).ticks(10));

        svg.append("line")
            .attr("x1", 0)
            .attr("y1", yScale(0))
            .attr("x2", width)
            .attr("y2", yScale(0))
            .attr("stroke", "#999")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "4,2");

        svg.selectAll(".bar-improved")
            .data(data.filter(d => d.position_change > 0))
            .enter()
            .append("rect")
            .attr("class", "bar bar-improved")
            .attr("x", d => xScale(d.name))
            .attr("y", d => yScale(d.position_change))
            .attr("width", xScale.bandwidth())
            .attr("height", d => yScale(0) - yScale(d.position_change))
            .on("mouseover", function(event, d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 0.9);
                tooltip.html(`${d.name}<br>
                            Рейтинг 1.0: ${d.rank_10}<br>
                            Рейтинг 0.8: ${d.rank_08}<br>
                            Улучшение: +${d.position_change} позиций`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 30) + "px");
            })
            .on("mouseout", function() {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        svg.selectAll(".bar-declined")
            .data(data.filter(d => d.position_change < 0))
            .enter()
            .append("rect")
            .attr("class", "bar bar-declined")
            .attr("x", d => xScale(d.name))
            .attr("y", yScale(0))
            .attr("width", xScale.bandwidth())
            .attr("height", d => yScale(d.position_change) - yScale(0))
            .on("mouseover", function(event, d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 0.9);
                tooltip.html(`${d.name}<br>
                            Рейтинг 1.0: ${d.rank_10}<br>
                            Рейтинг 0.8: ${d.rank_08}<br>
                            Ухудшение: ${d.position_change} позиций`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 30) + "px");
            })
            .on("mouseout", function() {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        svg.append("text")
            .attr("transform", `translate(${width/2}, ${height + margin.bottom - 40})`)
            .style("text-anchor", "middle")
            .text("Спортсмены");

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 20)
            .attr("x", -height/2)
            .style("text-anchor", "middle")
            .text("Изменение позиции");

        svg.append("text")
            .attr("x", width/2)
            .attr("y", -margin.top/2)
            .attr("text-anchor", "middle")
            .style("font-size", "18px")
            .style("font-weight", "bold")
            .text("Изменение позиций топ-20 спортсменов при разных коэффициентах расчета");

        const legend = svg.append("g")
            .attr("transform", `translate(${width - 220}, -30)`);

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
