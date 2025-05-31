const JSON_BASE_PATH = '../../data/rankings/';
const transliterate = window.slugify;

const DISCIPLINE_CONFIG = {
    shortboard: {
        name: "Короткая доска",
        competitions: {
            'rfs/rus': 'Чемпионат России',
            'rfs/kaliningrad': 'Чемпионат Калининградской области'
        }
    },
    longboard: {
        name: "Длинная доска",
        competitions: {
            'rfs/rus': 'Чемпионат России',
            'rfs/kaliningrad': 'Чемпионат Калининградской области'
        }
    },
    wakesurfing: {
        name: "Вейксерфинг",
        competitions: {
            'rfs/rus': 'Чемпионат России',
            'rfs/cfo': 'Чемпионат Федеральных округов'
        }
    },
    wakeskim: {
        name: "Вейкским",
        competitions: {
            'rfs/cfo': 'Чемпионат Федеральных округов'
        }
    }
};

let currentDiscipline = 'shortboard';
let currentCompetition = 'rfs/rus';
let currentGender = 'men';
let currentYear = 'all';
let currentData = null;

function showTooltip(id) {
    const tooltip = document.getElementById(id);
    if (tooltip) tooltip.style.display = 'block';
}

function hideTooltip(id) {
    const tooltip = document.getElementById(id);
    if (tooltip) tooltip.style.display = 'none';
}

function getYearsRange(data) {
    if (!data.athletes) return [];
    const years = new Set();
    data.athletes.forEach(athlete => {
        if (athlete.years) {
            Object.keys(athlete.years).forEach(year => years.add(year));
        }
    });
    return Array.from(years).sort((a, b) => b - a);
}

function createAthleteRow(athlete, years, displayRank) {
    const bestResult = athlete.best_result
        ? `${athlete.best_result.place} в ${athlete.best_result.year}`
        : 'Нет данных';

    const [surname = '', firstName = ''] = athlete.name.split(/\s+/);
    const initials = (surname[0] || '') + (firstName[0] || '');
    const avatarSlug = transliterate(surname) + (firstName ? '-' + transliterate(firstName[0]) : '');
    const avatarPath = `../../img/avatars/${avatarSlug}.jpg`;

    const yearCells = years.map(year => {
        const yearData = athlete.years?.[year];
        const events = yearData?.events || [];
        const tooltipId = `tooltip-${athlete.rank}-${year}`;

        const tooltipHTML = events.length
            ? `<div class="custom-tooltip" id="${tooltipId}">
                ${events.map(e => `
                    <div class="tooltip-event">
                        <div class="event-title">${e.name} ${year}</div>
                        <div class="event-detail">Место: ${e.place}</div>
                        <div class="event-detail">Очки: ${e.points}</div>
                    </div>
                `).join('')}
               </div>`
            : '';

        return `
            <td class="year-points"
                onmouseenter="showTooltip('${tooltipId}')"
                onmouseleave="hideTooltip('${tooltipId}')">
                ${yearData?.year_total_points || '—'}
                ${tooltipHTML}
            </td>
        `;
    }).join('');

    return `
        <tr class="${displayRank <= 10 ? 'top-athlete' : ''}">
            <td>${displayRank}</td>
            <td class="name-cell">
                <div class="avatar-wrapper">
                    <div class="athlete-avatar">
                        <img src="${avatarPath}"
                             alt="${athlete.name}"
                             onerror="this.style.display='none';
                                      this.nextElementSibling.style.display='flex'">
                        <div class="avatar-fallback">${initials}</div>
                    </div>
                    <div>
                        <div class="athlete-name">${athlete.name}</div>
                        <div class="athlete-region">${athlete.region}</div>
                    </div>
                </div>

                <div class="tooltip-item">
                    <div class="tooltip-header">
                        <div class="tooltip-meta">
                            <div class="tooltip-name">${athlete.name}</div>
                            <div class="tooltip-region">${athlete.region}</div>
                        </div>
                        <img src="${avatarPath}"
                             class="tooltip-avatar"
                             alt="${athlete.name}"
                             onerror="this.style.display='none'">
                    </div>

                    <div class="tooltip-stats">
                        <div class="tooltip-stat">
                            <div class="tooltip-value">#${athlete.rank}</div>
                            <div class="tooltip-label">Ранк</div>
                        </div>
                        <div class="tooltip-stat">
                            <div class="tooltip-value">${athlete.sport_rank || '—'}</div>
                            <div class="tooltip-label">Разряд</div>
                        </div>
                        <div class="tooltip-stat">
                            <div class="tooltip-value">${bestResult}</div>
                            <div class="tooltip-label">Лучший результат</div>
                        </div>
                    </div>

                    <div class="tooltip-social">
                        <a href="https://topheats.ru" target="_blank">topheats.ru</a>
                    </div>
                </div>
            </td>
            <td class="year-points best-tooltip"
                data-tooltip="${athlete.best_result?.event || 'Нет данных'}">
                ${bestResult}
            </td>
            ${yearCells}
            <td class="total-points">${athlete.total_points}</td>
        </tr>
    `;
}

async function loadData(competition, discipline, gender) {
    const path = `${JSON_BASE_PATH}${competition}/${discipline}/ranking_${gender}.json?t=${Date.now()}`;
    try {
        const response = await fetch(path);
        return await response.json();
    } catch (error) {
        console.error('Error loading data:', error);
        return null;
    }
}

function updateCompetitionsDropdown() {
    const competitionDropdown = document.getElementById('competition-dropdown');
    competitionDropdown.innerHTML = '';

    const competitions = DISCIPLINE_CONFIG[currentDiscipline].competitions;
    for (const [key, value] of Object.entries(competitions)) {
        const item = document.createElement('a');
        item.href = '#';
        item.className = 'dropdown-item';
        item.dataset.competition = key;
        item.textContent = value;

        if (key === currentCompetition) {
            item.classList.add('active');
        }

        item.addEventListener('click', function(e) {
            e.preventDefault();
            currentCompetition = this.dataset.competition;
            updateCompetitionsDropdown();
            loadDataAndUpdateTable();
        });

        competitionDropdown.appendChild(item);
    }
}

function updateCompetitionsSelect() {
    const competitionSelect = document.getElementById('competition-select');
    competitionSelect.innerHTML = '';

    const competitions = DISCIPLINE_CONFIG[currentDiscipline].competitions;
    for (const [key, value] of Object.entries(competitions)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = value;
        if (key === currentCompetition) {
            option.selected = true;
        }
        competitionSelect.appendChild(option);
    }
}

function updateYearSelect(data) {
    const yearSelect = document.getElementById('year-select');
    yearSelect.innerHTML = '<option value="all">Все года</option>';

    if (data && data.year_rankings) {
        const years = Object.keys(data.year_rankings).sort().reverse();
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });
    }
}

async function loadDataAndUpdateTable() {
    currentData = await loadData(currentCompetition, currentDiscipline, currentGender);
    updateYearSelect();
    renderTable();
}

function renderTable(data) {
    if (!data || !data.year_rankings || !data.overall_ranking) {
        document.getElementById('ranking-table-container').innerHTML = '<p>Нет данных для отображения</p>';
        return;
    }

    let athletes = [];
    const years = Object.keys(data.year_rankings).sort().reverse();

    if (currentYear === "all") {
        // Отображаем общий рейтинг
        athletes = data.overall_ranking;
    } else if (data.year_rankings[currentYear]) {
        // Отображаем рейтинг за конкретный год
        athletes = data.year_rankings[currentYear].athletes;
    }

    const tableHTML = `
        <table class="ranking-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Спортсмен</th>
                    <th>Регион</th>
                    <th>${currentYear === "all" ? "Общие очки" : "Очки за год"}</th>
                    ${currentYear === "all" ? "" : `<th>Общие очки</th>`}
                </tr>
            </thead>
            <tbody>
                ${athletes.map(athlete => `
                    <tr class="${athlete.rank <= 10 ? 'top-athlete' : ''}">
                        <td>${athlete.rank}</td>
                        <td class="name-cell">
                            <div class="athlete-name">${athlete.name}</div>
                        </td>
                        <td>${currentYear === "all" ? athlete.region : ""}</td>
                        <td class="total-points">${
                            currentYear === "all"
                                ? athlete.total_points
                                : athlete.year_points
                        }</td>
                        ${currentYear === "all" ? "" : `
                            <td class="total-points">${athlete.total_points}</td>
                        `}
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('ranking-table-container').innerHTML = tableHTML;
}

async function updateTable(competition, category, gender) {
    const data = await loadData(competition, category, gender);

    if (!data || !data.athletes) {
        console.error('No data available');
        document.getElementById('ranking-table-container').innerHTML = '<p>Нет данных для отображения</p>';
        return;
    }

    const years = getYearsRange(data);
    const tableHTML = `
        <table class="ranking-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Best</th>
                    ${years.map(year => `<th>${year}</th>`).join('')}
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${data.athletes.map(a => createAthleteRow(a, years)).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('ranking-table-container').innerHTML = tableHTML;
}

document.addEventListener('DOMContentLoaded', async () => {
    const data = await loadData(currentCompetition, currentDiscipline, currentGender);
    if (data) {
        updateYearSelect(data);
        renderTable(data);
    }

    // Обработчик изменения года
    document.getElementById('year-select').addEventListener('change', function() {
        currentYear = this.value;
        renderTable(data);
    });

    // Обработчики для других элементов управления
    document.getElementById('discipline-select').addEventListener('change', async function() {
        currentDiscipline = this.value;
        const newData = await loadData(currentCompetition, currentDiscipline, currentGender);
        if (newData) {
            updateYearSelect(newData);
            renderTable(newData);
        }
    });

    document.querySelectorAll('.gender-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentGender = this.dataset.gender;
            const newData = await loadData(currentCompetition, currentDiscipline, currentGender);
            if (newData) {
                updateYearSelect(newData);
                renderTable(newData);
            }
        });
    });

    // Обработчики для выбора соревнований
    document.querySelectorAll('.dropdown-item[data-competition]').forEach(item => {
        item.addEventListener('click', async function(e) {
            e.preventDefault();
            currentCompetition = this.dataset.competition;

            // Обновляем активный класс
            document.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');

            // Обновляем таблицу
            const newData = await loadData(currentCompetition, currentDiscipline, currentGender);
            if (newData) {
                updateYearSelect(newData);
                renderTable(newData);
            }
        });
    });
});
