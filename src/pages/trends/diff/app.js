const JSON_BASE_PATH = '../../../data/';

document.addEventListener('DOMContentLoaded', function() {
    const margin = { top: 40, right: 30, bottom: 70, left: 100 };
    const width = 1000 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

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
        let currentData = [...data];

        function updateChart(displayData) {
            svg.selectAll("*").remove();

            const xScale = d3.scaleBand()
                .domain(displayData.map(d => d.name))
                .range([0, width])
                .padding(0.2);

            const yScale = d3.scaleLinear()
                .domain([d3.min(displayData, d => d.position_change) - 5,
                         d3.max(displayData, d => d.position_change) + 5])
                .range([height, 0]);

            svg.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(xScale))
                .selectAll("text")
                .attr("transform", "rotate(-45)")
                .attr("text-anchor", "end")
                .attr("dx", "-0.5em")
                .attr("dy", "0.5em");

            svg.append("g")
                .call(d3.axisLeft(yScale));

            svg.selectAll(".bar")
                .data(displayData)
                .enter()
                .append("rect")
                .attr("class", d =>
                    d.position_change > 0 ? "bar bar-improved" :
                    d.position_change < 0 ? "bar bar-declined" : "bar bar-neutral")
                .attr("x", d => xScale(d.name))
                .attr("y", d => yScale(Math.max(0, d.position_change)))
                .attr("width", xScale.bandwidth())
                .attr("height", d => Math.abs(yScale(d.position_change) - yScale(0)))
                .on("mouseover", function(event, d) {
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", 0.9);
                    tooltip.html(`${d.name}<br>Рейтинг 1.0: ${d.rank_10}<br>Рейтинг 0.8: ${d.rank_08}<br>Изменение: ${d.position_change}`)
                        .style("left", (event.pageX + 5) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function() {
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                });

            svg.append("text")
                .attr("transform", `translate(${width/2}, ${height + margin.top + 20})`)
                .style("text-anchor", "middle")
                .text("Спортсмены");

            svg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", -margin.left + 40)
                .attr("x", -height/2)
                .style("text-anchor", "middle")
                .text("Изменение позиции");
        }

        updateChart(currentData);

        document.getElementById("showImprovements").addEventListener("click", function() {
            const improved = [...data]
                .filter(d => d.position_change > 0)
                .sort((a, b) => b.position_change - a.position_change)
                .slice(0, 10);
            updateChart(improved);
        });

        document.getElementById("showDeclines").addEventListener("click", function() {
            const declined = [...data]
                .filter(d => d.position_change < 0)
                .sort((a, b) => a.position_change - b.position_change)
                .slice(0, 10);
            updateChart(declined);
        });

        document.getElementById("showAll").addEventListener("click", function() {
            updateChart([...data]);
        });
    });
});
