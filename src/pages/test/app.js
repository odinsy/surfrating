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
            'rfs/fo': 'Чемпионат Федеральных округов'
        }
    },
    wakeskim: {
        name: "Вейкским",
        competitions: {
            'rfs/fo': 'Чемпионат Федеральных округов'
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

function createAthleteRow(athlete, years) {
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
        <tr class="${athlete.rank <= 10 ? 'top-athlete' : ''}">
            <td>${athlete.rank}</td>
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

async function loadData(competition, category, gender) {
    const path = `${JSON_BASE_PATH}${competition}/${category}/${gender}.json?t=${Date.now()}`;
    try {
        const response = await fetch(path);
        return await response.json();
    } catch (error) {
        console.error('Error loading data:', error);
        return { headers: [], athletes: [] };
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

function updateYearSelect() {
    const yearSelect = document.getElementById('year-select');
    yearSelect.innerHTML = '';

    // Опция "Все года"
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'Все года';
    allOption.selected = currentYear === 'all';
    yearSelect.appendChild(allOption);

    if (currentData) {
        const years = getYearsRange(currentData);
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

async function loadDataAndUpdateTable() {
    currentData = await loadData(currentCompetition, currentDiscipline, currentGender);
    updateYearSelect();
    renderTable();
}

function renderTable() {
    if (!currentData || !currentData.athletes) {
        document.getElementById('ranking-table-container').innerHTML = '<p>Нет данных для отображения</p>';
        return;
    }

    let yearsToShow = [];
    if (currentYear === 'all') {
        yearsToShow = getYearsRange(currentData).sort((a, b) => a - b); // Старые -> новые
    } else {
        yearsToShow = [currentYear];
    }

    const tableHTML = `
        <table class="ranking-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Best</th>
                    ${yearsToShow.map(year => `<th>${year}</th>`).join('')}
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${currentData.athletes.map(a => createAthleteRow(a, yearsToShow)).join('')}
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

document.addEventListener('DOMContentLoaded', () => {
    // Инициализация элементов
    updateCompetitionsDropdown();
    updateCompetitionsSelect();

    // Обработчики событий
    document.getElementById('competition-select').addEventListener('change', function() {
        currentCompetition = this.value;
        loadDataAndUpdateTable();
    });

    document.getElementById('year-select').addEventListener('change', function() {
        currentYear = this.value;
        renderTable();
    });

    document.querySelectorAll('.gender-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentGender = this.dataset.gender;
            loadDataAndUpdateTable();
        });
    });

    // Обработчики для выбора дисциплины
    document.querySelectorAll('.dropdown-item[data-discipline]').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            currentDiscipline = this.dataset.discipline;
            currentCompetition = Object.keys(DISCIPLINE_CONFIG[currentDiscipline].competitions)[0];

            // Обновление UI
            updateCompetitionsDropdown();
            updateCompetitionsSelect();
            loadDataAndUpdateTable();
        });
    });

    // Первоначальная загрузка данных
    loadDataAndUpdateTable();
});
