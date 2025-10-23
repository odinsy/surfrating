const JSON_BASE_PATH = '../../../data/rankings/';
const AVATARS_ENABLED = false;
const transliterate = window.slugify;

const COMPETITIONS = {
    'rfs/rus': {
        name: 'Чемпионат России (РФС)',
        disciplines: {
            'shortboard': 'Короткая доска',
            'longboard': 'Длинная доска',
            'wakesurfing': 'Вейксерфинг',
            'wakeskim': 'Вейкским'
        }
    },
    'rfs/dfo': {
        name: 'Чемпионат ДФО (РФС)',
        disciplines: {
            'longboard': 'Длинная доска'
        }
    },
    'rfs/spb': {
        name: 'Чемпионат Санкт-Петербурга (РФС)',
        disciplines: {
            'shortboard': 'Короткая доска',
            'longboard': 'Длинная доска'
        }
    },
    'rfs/kgd': {
        name: 'Чемпионат Калининградской области (РФС)',
        disciplines: {
            'longboard': 'Длинная доска',
            'shortboard': 'Короткая доска'
        }
    },
    'rfs/vdk': {
        name: 'Чемпионат Приморского края (РФС)',
        disciplines: {
            'longboard': 'Длинная доска',
            'shortboard': 'Короткая доска'
        }
    },
    'rfs/krd': {
        name: 'Чемпионат Краснодарского края (РФС)',
        disciplines: {
            'longboard': 'Длинная доска'
        }
    },
};

let currentCompetition = 'rfs/rus';
let currentDiscipline = 'shortboard';
let trendsData = {};

function getYearsRange(data) {
    if (!data.year_rankings) return [];
    return Object.keys(data.year_rankings).sort((a, b) => a - b);
}

function showTooltip(id) {
    const tooltip = document.getElementById(id);
    if (tooltip) tooltip.style.display = 'block';
}

function hideTooltip(id) {
    const tooltip = document.getElementById(id);
    if (tooltip) tooltip.style.display = 'none';
}

// Функция для загрузки данных трендов
async function loadTrendsData(competition, category, gender) {
    const path = `${JSON_BASE_PATH}${competition}/${category}/trends_${gender}.json?t=${Date.now()}`;
    try {
        const response = await fetch(path);
        const data = await response.json();
        // Преобразуем массив в объект для быстрого поиска по athlete_id
        const trendsMap = {};
        data.comparison_data.forEach(athlete => {
            trendsMap[athlete.athlete_id] = athlete;
        });
        return trendsMap;
    } catch (error) {
        console.error('Error loading trends data:', error);
        return {};
    }
}

// Функция для отрисовки иконки тренда
function renderTrendIcon(trend) {
    if (!trend) return '';

    const trendIcons = {
        'up': `<svg class="trend-icon trend-up" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" data-bs-toggle="tooltip" data-bs-title="Улучшил позицию на ${Math.abs(trend.rank_change)}">
                <path d="M8 4L12 10H4L8 4Z"/>
              </svg>`,
        'down': `<svg class="trend-icon trend-down" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" data-bs-toggle="tooltip" data-bs-title="Ухудшил позицию на ${Math.abs(trend.rank_change)}">
                 <path d="M8 4L12 10H4L8 4Z"/>
               </svg>`,
        'stable': `<div class="trend-icon trend-stable" data-bs-toggle="tooltip" data-bs-title="Позиция не изменилась">—</div>`,
        'new': `<div class="trend-icon trend-new" data-bs-toggle="tooltip" data-bs-title="Новый спортсмен">🆕</div>`,
        'dropped': `<div class="trend-icon trend-dropped" data-bs-toggle="tooltip" data-bs-title="Выбыл из рейтинга">📉</div>`
    };

    return trendIcons[trend.trend] || '';
}

function createAthleteRow(athlete, years, athleteYearData) {
    const bestResult = athlete.best_result
        ? `${athlete.best_result.place} в ${athlete.best_result.event_year}`
        : 'Нет данных';

    const [surname = '', firstName = ''] = athlete.name.split(/\s+/);
    const initials = (surname[0] || '') + (firstName[0] || '');
    const avatarSlug = transliterate(surname) + (firstName ? '-' + transliterate(firstName[0]) : '');

    let avatarPath = '';
    if (AVATARS_ENABLED) {
        avatarPath = athlete.avatar_path
            || `../../../img/avatars/${avatarSlug}.jpg`;
    }

    let avatarHTML = '';
    if (AVATARS_ENABLED) {
        avatarHTML = `
            <img src="${avatarPath}" alt="${athlete.name}"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
            <div class="avatar-fallback">${initials}</div>
        `;
    } else {
        avatarHTML = `<div class="avatar-fallback" style="display:flex">${initials}</div>`;
    }

    const yearCells = years.map(year => {
        const yearData = athleteYearData[athlete.id]?.[year];
        const events = yearData ? yearData.events : [];
        const yearPoints = yearData ? yearData.year_points : null;

        const tooltipId = `tooltip-${athlete.id}-${year}`;
        const tooltipHTML = events.length > 0
            ? `<div class="custom-tooltip" id="${tooltipId}">
                ${events.map(e => `
                    <div class="tooltip-event mb-2">
                        <div class="event-title">${e.event_name} ${year}</div>
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
                ${yearPoints !== null ? yearPoints : '—'}
                ${tooltipHTML}
            </td>
        `;
    }).join('');

    // Получаем данные тренда для текущего спортсмена
    const trend = trendsData[athlete.id];
    const trendHTML = renderTrendIcon(trend);

    const isTop10 = athlete.rank <= 10;
    const rowClass = isTop10 ? 'top-10' : '';

    return `
        <tr class="${rowClass}">
            <td class="fw-bold">${athlete.rank}</td>
            <td class="trend-cell">${trendHTML}</td>
            <td class="name-cell">
                <div class="avatar-wrapper">
                    <div class="athlete-avatar">
                        ${avatarHTML}
                    </div>
                    <div>
                        <div class="athlete-name">${athlete.name}</div>
                        <div class="athlete-region">${athlete.region}</div>
                    </div>
                </div>
            </td>
            <td class="year-points">${bestResult}</td>
            ${yearCells}
            <td class="total-points fw-bold">${athlete.total_points}</td>
        </tr>
    `;
}

async function loadData(competition, category, gender) {
    const path = `${JSON_BASE_PATH}${competition}/${category}/ranking_${gender}.json?t=${Date.now()}`;
    try {
        const response = await fetch(path);
        const data = await response.json();
        return normalizeData(data);
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('last-updated').textContent = 'Ошибка загрузки';
        return {
            overall_ranking: [],
            athleteYearData: {},
            years: [],
            last_updated: 'Ошибка'
        };
    }
}

function normalizeData(data) {
    document.getElementById('last-updated').textContent = data.last_updated || '-';

    const athletesMap = data.athletes || {};
    const eventsMap = data.events || {};

    const normalized = {
        overall_ranking: [],
        athleteYearData: {},
        years: data.year_rankings ? Object.keys(data.year_rankings).sort() : [],
        last_updated: data.last_updated
    };

    normalized.overall_ranking = (data.overall_ranking || []).map(item => {
        const athlete = athletesMap[item.athlete_id] || {};
        return {
            id: item.athlete_id,
            rank: item.rank,
            total_points: item.total_points,
            best_result: item.best_result,
            name: athlete.name || 'Неизвестный спортсмен',
            region: athlete.region || ''
        };
    });

    if (data.year_rankings) {
        Object.entries(data.year_rankings).forEach(([year, yearData]) => {
            yearData.athletes.forEach(athleteYear => {
                const athleteId = athleteYear.athlete_id;

                if (!normalized.athleteYearData[athleteId]) {
                    normalized.athleteYearData[athleteId] = {};
                }

                const eventsWithNames = athleteYear.events.map(event => {
                    const eventInfo = eventsMap[event.event_id] || {};
                    return {
                        ...event,
                        event_name: eventInfo.name || 'Неизвестное событие'
                    };
                });

                normalized.athleteYearData[athleteId][year] = {
                    year_points: athleteYear.year_points,
                    events: eventsWithNames
                };
            });
        });
    }

    return normalized;
}

async function updateTable(gender) {
    const data = await loadData(currentCompetition, currentDiscipline, gender);

    // Загружаем данные трендов
    trendsData = await loadTrendsData(currentCompetition, currentDiscipline, gender);

    const athletes = data.overall_ranking;
    const years = data.years;

    if (!athletes || athletes.length === 0) {
        document.getElementById('ranking-table-container').innerHTML = '<p class="text-center py-4">Нет данных для отображения</p>';
        return;
    }

    const tableHTML = `
        <table class="table table-custom table-hover align-middle">
            <thead>
                <tr>
                    <th scope="col">#</th>
                    <th scope="col" class="trend-column">
                        <div class="d-flex align-items-center justify-content-center">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" data-bs-toggle="tooltip" data-bs-title="Изменение позиции">
                                <path d="M8 4L12 10H4L8 4Z"/>
                            </svg>
                        </div>
                    </th>
                    <th scope="col">Имя</th>
                    <th scope="col">Лучший результат</th>
                    ${years.map(year => `<th scope="col">${year}</th>`).join('')}
                    <th scope="col">Всего</th>
                </tr>
            </thead>
            <tbody>
                ${athletes.map(a => createAthleteRow(a, years, data.athleteYearData)).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('ranking-table-container').innerHTML = tableHTML;

    // Инициализируем Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

function updateDisciplineSelect(competition) {
    const disciplineSelect = document.getElementById('discipline-select');
    disciplineSelect.innerHTML = '';

    const disciplines = COMPETITIONS[competition].disciplines;
    for (const [key, name] of Object.entries(disciplines)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = name;
        disciplineSelect.appendChild(option);
    }

    if (Object.keys(disciplines).length > 0) {
        currentDiscipline = Object.keys(disciplines)[0];
    }
}

function updateCompetitionDropdown(discipline) {
    const competitionDropdownMenu = document.querySelector('#competitionDropdown + .dropdown-menu');
    competitionDropdownMenu.innerHTML = '';

    const competitions = DISCIPLINE_COMPETITIONS[discipline];
    for (const [name, value] of Object.entries(competitions)) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.className = 'dropdown-item competition-option';
        a.href = '#';
        a.dataset.competition = value;
        a.textContent = name;
        li.appendChild(a);
        competitionDropdownMenu.appendChild(li);
    }

    const firstOption = competitionDropdownMenu.querySelector('.competition-option');
    if (firstOption) {
        firstOption.classList.add('active');
        document.getElementById('competitionLabel').textContent = firstOption.textContent;
        currentCompetition = firstOption.dataset.competition;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const initialCategory = urlParams.get('category') || 'shortboard_men';
    const [discipline, gender] = initialCategory.split('_');

    currentDiscipline = discipline;

    document.querySelectorAll('.gender-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.gender === gender) {
            btn.classList.add('active');
        }
    });

    const competitionDropdown = document.getElementById('competitionDropdown');
    const competitionLabel = document.getElementById('competitionLabel');
    competitionLabel.textContent = COMPETITIONS[currentCompetition].name;

    document.getElementById('discipline-select').addEventListener('change', function(e) {
        currentDiscipline = e.target.value;
        const activeGender = document.querySelector('.gender-btn.active').dataset.gender;
        updateTable(activeGender);
    });

    document.querySelectorAll('.competition-option').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const competition = this.dataset.competition;
            currentCompetition = competition;
            competitionLabel.textContent = this.textContent;
            updateDisciplineSelect(competition);

            const activeGender = document.querySelector('.gender-btn.active').dataset.gender;
            updateTable(activeGender);

            document.querySelectorAll('.competition-option').forEach(opt => {
                opt.classList.remove('active');
            });
            this.classList.add('active');
        });
    });

    document.querySelectorAll('.gender-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            updateTable(this.dataset.gender);
        });
    });

    updateDisciplineSelect(currentCompetition);
    document.getElementById('discipline-select').value = currentDiscipline;
    updateTable(gender);
});
