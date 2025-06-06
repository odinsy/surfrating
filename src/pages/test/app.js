const JSON_BASE_PATH = '../../data/rankings/';
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
    'rfs/kaliningrad': {
        name: 'Чемпионат Калининградской области (РФС)',
        disciplines: {
            'shortboard': 'Короткая доска',
            'longboard': 'Длинная доска'
        }
    },
    'tvoisurf39/cup': {
        name: 'Балтийский серф-контест (Твой Сёрф 39)',
        disciplines: {
            'longboard': 'Длинная доска'
        }
    }
};

let currentCompetition = 'rfs/rus';
let currentDiscipline = 'shortboard';
let currentYear = 'all';

function getYearsRange(data) {
    if (!data.year_rankings) return [];
    return Object.keys(data.year_rankings).sort((a, b) => a - b);
}

function updateYearSelect(years) {
    const yearSelect = document.getElementById('year-select');
    yearSelect.innerHTML = '<option value="all">Все года</option>';

    years.sort((a, b) => b - a).forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });
}

function showTooltip(id) {
    const tooltip = document.getElementById(id);
    if (tooltip) tooltip.style.display = 'block';
}

function hideTooltip(id) {
    const tooltip = document.getElementById(id);
    if (tooltip) tooltip.style.display = 'none';
}

function createAthleteRow(athlete, years, athleteYearData) {
    const bestResult = athlete.best_result
        ? `${athlete.best_result.place} в ${athlete.best_result.event_year}`
        : 'Нет данных';

    const [surname = '', firstName = ''] = athlete.name.split(/\s+/);
    const initials = (surname[0] || '') + (firstName[0] || '');
    const avatarSlug = transliterate(surname) + (firstName ? '-' + transliterate(firstName[0]) : '');
    const avatarPath = `../../img/avatars/${avatarSlug}.jpg`;

    const yearCells = years.map(year => {
        const yearData = athleteYearData[athlete.name]?.[year];
        const events = yearData ? yearData.events : [];
        const yearPoints = yearData ? yearData.year_points : null;

        const tooltipId = `tooltip-${athlete.rank}-${year}`;
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

    const isTop10 = athlete.rank <= 10;
    const rowClass = isTop10 ? 'top-10' : '';
    const totalPointsDisplay = years.length === 1 && years[0] !== 'all'
        ? (athleteYearData[athlete.name]?.[years[0]]?.year_points || '—')
        : athlete.total_points;

    return `
        <tr class="${rowClass}">
            <td class="fw-bold">${athlete.rank}</td>
            <td class="name-cell">
                <div class="avatar-wrapper">
                    <div class="athlete-avatar">
                        <img src="${avatarPath}" alt="${athlete.name}"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                        <div class="avatar-fallback">${initials}</div>
                    </div>
                    <div>
                        <div class="athlete-name">${athlete.name}</div>
                        <div class="athlete-region">${athlete.region}</div>
                    </div>
                </div>
            </td>
            <td class="year-points">${bestResult}</td>
            ${yearCells}
            <td class="total-points fw-bold">${totalPointsDisplay}</td>
        </tr>
    `;
}

async function loadData(competition, category, gender) {
    const path = `${JSON_BASE_PATH}${competition}/${category}/ranking_${gender}.json?t=${Date.now()}`;
    try {
        const response = await fetch(path);
        const data = await response.json();

        document.getElementById('last-updated').textContent = data.last_updated || '-';

        let athleteYearData = {};
        if (data.year_rankings) {
            for (const [year, yearData] of Object.entries(data.year_rankings)) {
                for (const athlete of yearData.athletes) {
                    const key = athlete.name;
                    if (!athleteYearData[key]) {
                        athleteYearData[key] = {};
                    }
                    athleteYearData[key][year] = {
                        year_points: athlete.year_points,
                        events: athlete.events
                    };
                }
            }
        }
        data.athleteYearData = athleteYearData;

        return data;
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('last-updated').textContent = 'Ошибка загрузки';
        return { headers: [], athletes: [], overall_ranking: [] };
    }
}

async function updateTable(gender) {
    const data = await loadData(currentCompetition, currentDiscipline, gender);
    const athletes = data.overall_ranking || [];
    const years = getYearsRange(data);

    updateYearSelect(years);
    const displayYears = currentYear === 'all' ? years : [currentYear];

    if (athletes.length === 0) {
        document.getElementById('ranking-table-container').innerHTML = '<p class="text-center py-4">Нет данных для отображения</p>';
        return;
    }

    const tableHTML = `
        <table class="table table-custom table-hover align-middle">
            <thead>
                <tr>
                    <th scope="col">#</th>
                    <th scope="col">Имя</th>
                    <th scope="col">Лучший результат</th>
                    ${displayYears.map(year => `<th scope="col">${year}</th>`).join('')}
                    <th scope="col">Всего</th>
                </tr>
            </thead>
            <tbody>
                ${athletes.map(a => createAthleteRow(a, displayYears, data.athleteYearData)).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('ranking-table-container').innerHTML = tableHTML;
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

    document.getElementById('year-select').addEventListener('change', function(e) {
        currentYear = e.target.value;
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
