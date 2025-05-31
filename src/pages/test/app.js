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
    if (!competitionDropdown) return;
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
            loadAndRenderData();
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
            if (year === currentYear) {
                option.selected = true;
            }
            yearSelect.appendChild(option);
        });
    }
}

function updateDisciplineTitle() {
    const disciplineTitle = document.getElementById('current-discipline');
    if (disciplineTitle) {
        disciplineTitle.textContent = DISCIPLINE_CONFIG[currentDiscipline].name;
    }
}

async function loadAndRenderData() {
    currentData = await loadData(currentCompetition, currentDiscipline, currentGender);
    if (currentData) {
        updateYearSelect(currentData);
        renderTable(currentData);
    }
}

function renderTable(data) {
    const container = document.getElementById('ranking-table-container');
    if (!container) return;

    if (!data || !data.year_rankings || !data.overall_ranking) {
        container.innerHTML = '<p>Нет данных для отображения</p>';
        return;
    }

    let athletes = [];
    const years = Object.keys(data.year_rankings).sort().reverse();

    if (currentYear === "all") {
        athletes = data.overall_ranking;
    } else if (data.year_rankings[currentYear]) {
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
                        <td>${athlete.region}</td>
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

    container.innerHTML = tableHTML;
}

function setupDisciplineHandlers() {
    document.querySelectorAll('.dropdown-item[data-discipline]').forEach(item => {
        item.addEventListener('click', async function(e) {
            e.preventDefault();
            currentDiscipline = this.dataset.discipline;

            // Обновляем активный элемент
            document.querySelectorAll('.dropdown-item[data-discipline]').forEach(i =>
                i.classList.remove('active'));
            this.classList.add('active');

            // Обновляем селект соревнований
            updateCompetitionsSelect();
            updateDisciplineTitle();

            // Загружаем данные
            await loadAndRenderData();
        });
    });
}

function setupGenderHandlers() {
    document.querySelectorAll('.gender-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentGender = this.dataset.gender;
            await loadAndRenderData();
        });
    });
}

function setupCompetitionSelectHandler() {
    const competitionSelect = document.getElementById('competition-select');
    competitionSelect.addEventListener('change', async function() {
        currentCompetition = this.value;
        await loadAndRenderData();
    });
}

function setupYearSelectHandler() {
    document.getElementById('year-select').addEventListener('change', function() {
        currentYear = this.value;
        if (currentData) {
            renderTable(currentData);
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    // Инициализация UI
    updateCompetitionsSelect();
    updateDisciplineTitle();

    // Настройка обработчиков
    setupDisciplineHandlers();
    setupGenderHandlers();
    setupCompetitionSelectHandler();
    setupYearSelectHandler();

    // Первая загрузка данных
    await loadAndRenderData();
});
